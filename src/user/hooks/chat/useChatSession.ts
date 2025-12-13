import React, { useState, useEffect, useRef } from 'react';
import { Character, Message, MessageType, UserPersona } from '../../types';
import { createChatSession, getSessionInfo } from '../../services/chatService';
import { sharedChatWs } from '../../services/sharedChatWs';
import { listMessages as dbListMessages, putSession as dbPutSession, addMessage as dbAddMessage } from '../../services/chatDb';
import { chatEvents } from '../../services/chatEvents';
import { trackEvent } from '../../services/analytics';

interface UseChatSessionProps {
    character: Character;
    sessionIdProp?: string;
    onUpdateLastMessage: (msg: Message) => void;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    chatMode: 'daily' | 'scene';
    effectivePersona?: UserPersona;
    modelId?: string;
    modelTemp: number;
    hasModelOverride: boolean;
    hasTempOverride: boolean;
    setModelTemp: (t: number) => void;
    setModelId: (id: string) => void;
    initialMessages?: Message[];
}

/**
 * 聊天会话管理 Hook
 * 处理消息收发、WebSocket 连接、Session 生命周期、消息持久化、重试逻辑等核心业务
 */
export const useChatSession = ({
    character,
    sessionIdProp,
    onUpdateLastMessage,
    input,
    setInput,
    chatMode,
    effectivePersona,
    modelId,
    modelTemp,
    hasModelOverride,
    hasTempOverride,
    setModelTemp,
    setModelId,
    initialMessages
}: UseChatSessionProps) => {
    // 消息列表，初始包含 cached messages
    const [messages, setMessages] = useState<Message[]>(initialMessages ? initialMessages.map(m => ({ ...m, saved: true } as any)) : []);
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(sessionIdProp || null);

    // 会话异常状态（如 404）和账号禁用状态
    const [isSessionInvalid, setIsSessionInvalid] = useState(false);
    const [showDisabledPrompt, setShowDisabledPrompt] = useState(false);

    // Refs 用于在闭包（如 WebSocket 回调）中访问最新状态
    const messagesRef = useRef(messages);
    const wsSubRef = useRef<((text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void) | null>(null);
    const ackTimersRef = useRef<Map<string, number>>(new Map()); // 消息发送超时计时器
    const spinnerTimersRef = useRef<Map<string, number>>(new Map()); // Loading 状态显示延迟计时器
    const sessionIdRef = useRef(sessionId);
    const currentUserId = (() => { try { return localStorage.getItem('user_id') || '0' } catch { return '0' } })();

    useEffect(() => { messagesRef.current = messages }, [messages]);
    useEffect(() => { sessionIdRef.current = sessionId }, [sessionId]);

    // 组件卸载时清理所有计时器
    useEffect(() => {
        return () => {
            ackTimersRef.current.forEach(t => clearTimeout(t))
            spinnerTimersRef.current.forEach(t => clearTimeout(t))
        }
    }, []);

    // 处理接收到的助手消息（流式或完整），并标记已读及更新列表
    const appendAssistantWithRead = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => {
        const sid = sessionIdProp || sessionId
        // 生成 chunk ID 防止重复渲染
        const chunkPart = (typeof meta?.chunkIndex === 'number') ? `c${meta!.chunkIndex}_${meta!.chunkTotal ?? 't'}` : Math.random().toString(36).slice(2)
        const msg: Message = {
            id: `msg_${Date.now()}_${chunkPart}`,
            senderId: character.id,
            text,
            quote,
            timestamp: new Date(),
            type: MessageType.TEXT,
            saved: true
        } as any

        setMessages(prev => {
            const next = [...prev];
            // 标记上一条用户消息为已读
            for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].senderId === 'user' && !(next[i] as any).read) { next[i] = { ...next[i], read: true }; break; }
            }
            next.push(msg);
            try { console.log('[CHAT-LIVE] append assistant', { id: msg.id, chunk: meta }) } catch { }
            try { setTimeout(() => onUpdateLastMessage(msg), 0) } catch { }
            return next;
        });

        if (sid) {
            try {
                const cur = localStorage.getItem('current_chat_sid') || ''
                if (cur && cur === sid) {
                    // 如果当前页面是最新的激活会话，跳过部分 centralized 写入逻辑（由 sharedChatWs 处理）
                    console.log('[CHAT-DETAIL] skip write (centralized)', { sid, mid: msg.id })
                }
            } catch { }
        }

        // 根据 chunk 信息判断是否正在输入
        if (meta && typeof meta.chunkIndex === 'number' && typeof meta.chunkTotal === 'number') {
            setIsTyping(meta.chunkIndex < meta.chunkTotal);
        } else {
            setIsTyping(false);
        }
    }

    // 发送消息处理函数
    // @param retryMsgId: 如果传入此 ID，则表示重发该条消息
    const handleSend = async (retryMsgId?: string) => {
        // If retryMsgId is provided, we are resending an existing message.
        // Otherwise we check input.
        let textToSend = input;
        let msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        let isRetry = false;

        if (retryMsgId) {
            // 重试逻辑：查找旧消息内容
            const existing = messagesRef.current.find((m: any) => m.id === retryMsgId);
            if (!existing) return;
            textToSend = existing.text;
            msgId = retryMsgId;
            isRetry = true;

            // 更新 UI 状态为发送中
            setMessages(prev => prev.map(m => (m as any).id === msgId ? ({ ...m, failed: false, pendingAck: true, spinning: false } as any) : m));
        } else {
            // 新消息发送
            if (!textToSend.trim()) return;
            if (textToSend.trim() === '（）' || textToSend.trim() === '()') return;

            const userMsg: Message = {
                id: msgId,
                senderId: 'user',
                text: textToSend,
                timestamp: new Date(),
                type: MessageType.TEXT,
                read: false,
                saved: false
            } as any;

            // 乐观更新 UI
            setMessages(prev => [...prev, { ...userMsg, pendingAck: true } as any]);
            try { setTimeout(() => onUpdateLastMessage(userMsg), 0) } catch { }
            setInput(chatMode === 'scene' ? '（）' : '');
            try { trackEvent('聊天.发送', { 文本长度: textToSend.length, 聊天模式: chatMode === 'scene' ? '场景' : '日常' }) } catch { }
        }

        // Logic for sending
        try {
            let sidToUse = sessionIdProp || sessionId || null;
            if (!sidToUse) {
                // 如果没有会话ID，先创建会话
                const ridRaw = localStorage.getItem('user_chat_role_id');
                const rid = ridRaw ? parseInt(ridRaw) : undefined;
                const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
                const sid = created.sessionId;
                localStorage.setItem(`chat_session_${currentUserId}_${character.id}`, sid);
                setSessionId(sid);
                try { await dbPutSession({ sessionId: sid, userId: currentUserId, characterId: String(character.id) }) } catch { }
                sidToUse = sid;
                sharedChatWs.ensureConnected();
                const sub = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => {
                    appendAssistantWithRead(text, quote, meta);
                };
                if (!wsSubRef.current) {
                    wsSubRef.current = sub;
                    sharedChatWs.subscribe(sid, sub);
                }
            }

            if (sidToUse) {
                if (!isRetry) {
                    // 新消息先入库
                    dbAddMessage({ id: msgId, sessionId: sidToUse, userId: currentUserId, senderId: 'user', text: textToSend, timestamp: Date.now(), type: 'TEXT' }).catch(() => { });
                }

                // 通过 WS 发送
                sharedChatWs.sendText(
                    sidToUse,
                    textToSend,
                    chatMode,
                    effectivePersona,
                    hasModelOverride ? modelId : undefined,
                    hasTempOverride ? modelTemp : undefined,
                    msgId
                );
                sharedChatWs.sendTyping(sidToUse, false);

                // 清理旧计时器
                const oldT = ackTimersRef.current.get(msgId);
                if (oldT) { try { clearTimeout(oldT) } catch { }; ackTimersRef.current.delete(msgId); }
                const oldS = spinnerTimersRef.current.get(msgId);
                if (oldS) { try { clearTimeout(oldS) } catch { }; spinnerTimersRef.current.delete(msgId); }

                // 设置 8秒 超时，若无 ACK 则标记失败
                const timer = window.setTimeout(() => {
                    setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === msgId && !(m as any).saved) ? ({ ...m, failed: true, pendingAck: false, spinning: false } as any) : m));
                    if (!isRetry) dbAddMessage({ id: msgId, sessionId: sidToUse!, userId: currentUserId, senderId: 'user', text: textToSend, timestamp: Date.now(), failed: true, type: 'TEXT' } as any).catch(() => { });
                    ackTimersRef.current.delete(msgId);
                    const st = spinnerTimersRef.current.get(msgId);
                    if (st) { try { clearTimeout(st) } catch { }; spinnerTimersRef.current.delete(msgId); }
                }, 8000);
                ackTimersRef.current.set(msgId, timer);

                // 设置 2秒 只转圈（Spinning）延迟
                const spinnerTimer = window.setTimeout(() => {
                    setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === msgId && (m as any).pendingAck) ? ({ ...m, spinning: true } as any) : m));
                    spinnerTimersRef.current.delete(msgId);
                }, 2000);
                spinnerTimersRef.current.set(msgId, spinnerTimer);
            }
        } catch (e) {
            console.error(e);
            setIsTyping(false);
            setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === msgId) ? ({ ...m, failed: true, pendingAck: false } as any) : m));
        }
    };

    // 重建会话（当会话失效时调用）
    const recreateSession = async () => {
        try {
            const ridRaw = localStorage.getItem('user_chat_role_id');
            const rid = ridRaw ? parseInt(ridRaw) : undefined;
            const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
            const sid = created.sessionId;
            const key = `chat_session_${currentUserId}_${character.id}`;
            const histKey = `chat_history_${currentUserId}_${character.id}`;

            try { localStorage.removeItem(key) } catch { }
            localStorage.setItem(key, sid);
            try { localStorage.removeItem(histKey) } catch { }

            const opener = character.openingLine || character.oneLinePersona || ''
            const mid = `msg_${Date.now()}`
            // const record = { id: mid, senderId: character.id, text: opener, ts: Date.now(), type: MessageType.TEXT }
            // try { localStorage.setItem(histKey, JSON.stringify([record])) } catch { }

            const newMsg: Message = { id: mid, senderId: character.id, text: opener, timestamp: new Date(), type: MessageType.TEXT, saved: true } as any
            setMessages([newMsg])
            try { setTimeout(() => onUpdateLastMessage(newMsg), 0) } catch { }

            setSessionId(sid);
            setIsSessionInvalid(false);

            if (created.model?.id) { setModelId(created.model.id); }
            if (typeof created.temperature === 'number') { setModelTemp(created.temperature!); }

            sharedChatWs.ensureConnected();
            const sub = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => appendAssistantWithRead(text, quote, meta);

            if (wsSubRef.current && sessionId) {
                try { sharedChatWs.unsubscribe(sessionId, wsSubRef.current); } catch { }
            }
            wsSubRef.current = sub;
            sharedChatWs.subscribe(sid, sub);

            sharedChatWs.addControlListener((payload) => {
                if (!payload) return;
                if (payload.type === 'force_logout') setShowDisabledPrompt(true);
                // ... helper for ack?
                // We duplicate the listener logic or assume existing listener persists?
                // sharedChatWs listener is global. But here we add a new one?
                // Original code added listener in Setup. And inside recreate logic it added AGAIN?
                // Original code line 1058: sharedChatWs.addControlListener.
                // Yes it added again. This might be a leak in original code but I will preserve it or clean it up.
                // sharedChatWs.addControlListener usually appends. If we add multiple, we get multiple callbacks.
                // I'll stick to original behavior.
            });

        } catch (e) {
            console.error(e);
        }
    }

    // 初始化/Setup Effect：加载 Session，连接 WS，恢复历史消息
    useEffect(() => {
        const key = `chat_session_${currentUserId}_${character.id}`;
        let activeSid: string | null = null;
        let activeSub: ((text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void) | null = null;

        const setup = async () => {
            let sid = localStorage.getItem(key) || localStorage.getItem(`chat_session_${character.id}`);

            if (sid) {
                setSessionId(sid);
                if (!localStorage.getItem(key)) { try { localStorage.setItem(key, sid) } catch { } }
                try {
                    const info = await getSessionInfo(sid)
                    if (info?.temperature !== undefined) { setModelTemp(info.temperature as number); }
                } catch (e: any) {
                    const msg = String(e?.message || '')
                    if (msg === 'session_not_found' || e?.status === 404) {
                        setIsSessionInvalid(true)
                        return
                    }
                }
            } else {
                // 如果没有 Session，根据 ID 创建新 Session
                // We don't create session automatically here if it doesn't exist? 
                // Original code checks: if (sid) ... else { create... }
                // Yes, original code auto-creates session on mount if missing.
                try {
                    const ridRaw = localStorage.getItem('user_chat_role_id');
                    const rid = ridRaw ? parseInt(ridRaw) : undefined;
                    const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
                    sid = created.sessionId;
                    localStorage.setItem(key, sid);
                    setSessionId(sid);
                    if (created.model?.id) { setModelId(created.model.id); }
                    if (typeof created.temperature === 'number') { setModelTemp(created.temperature!); }
                } catch { }
            }

            if (sid) {
                activeSid = sid
                try { localStorage.setItem('current_chat_sid', sid) } catch { }
                sharedChatWs.ensureConnected()
                const sub = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => {
                    appendAssistantWithRead(text, quote, meta)
                }
                activeSub = sub
                if (!wsSubRef.current) {
                    wsSubRef.current = sub
                    sharedChatWs.subscribe(sid, sub)
                }
                // 后端控制消息监听（ACK, 强制登出等）
                sharedChatWs.addControlListener((payload) => {
                    if (!payload) return
                    if (payload.type === 'force_logout') setShowDisabledPrompt(true)
                    if (payload.type === 'user_ack') {
                        const sidAck = String(payload.sessionId || '')
                        const msgId = String(payload.clientMsgId || payload.client_msg_id || '')
                        const curSid = sessionIdProp || sessionIdRef.current || activeSid
                        if (curSid && sidAck && curSid === sidAck && msgId) {
                            setIsTyping(true)
                            setMessages(prev => {
                                const next = prev.map(m => {
                                    if (m.senderId === 'user' && (m as any).id === msgId) {
                                        const updated = { ...m, saved: true, failed: false, pendingAck: false, spinning: false } as any
                                        dbAddMessage({ ...updated, sessionId: curSid, userId: currentUserId, timestamp: updated.timestamp.getTime(), failed: false }).catch(() => { })
                                        return updated
                                    }
                                    return m
                                })
                                return next
                            })
                            const t = ackTimersRef.current.get(msgId)
                            if (t) { try { clearTimeout(t) } catch { }; ackTimersRef.current.delete(msgId) }
                            const st = spinnerTimersRef.current.get(msgId)
                            if (st) { try { clearTimeout(st) } catch { }; spinnerTimersRef.current.delete(msgId); }
                        }
                    }
                })
            }
        };

        setup();

        return () => {
            if (activeSid && activeSub) { try { sharedChatWs.unsubscribe(activeSid, activeSub as any) } catch { } }
            wsSubRef.current = null
            try {
                const cur = localStorage.getItem('current_chat_sid') || ''
                if (cur && cur === activeSid) localStorage.removeItem('current_chat_sid')
            } catch { }
        };
    }, [character.id]);

    // 从 DB 加载历史消息（分页/初始化）
    useEffect(() => {
        try {
            const sid = sessionIdProp || sessionId
            if (sid) {
                dbListMessages(sid, 500).then(rows => {
                    try { console.log('[CHAT-ENTER] load messages', { sid, count: rows.length }) } catch { }
                    const msgs: Message[] = rows.map(r => ({ id: r.id || `msg_${r.timestamp}`, senderId: r.senderId, text: r.text, timestamp: new Date(r.timestamp), type: MessageType.TEXT, quote: r.quote, saved: true, failed: r.failed } as any))
                    setMessages(msgs)
                        ; (window as any).__last_msgs_cache = rows
                }).catch(() => { })
            }
        } catch { }
    }, [character.id, sessionIdProp, sessionId]);

    // 监听消息提交事件（Sync）
    useEffect(() => {
        const unsub = chatEvents.onMessageCommitted(({ sessionId: sid }) => {
            const cur = sessionIdProp || sessionId
            if (!cur || cur !== sid) return
            dbListMessages(cur, 500).then(rows => {
                const msgs: Message[] = rows.map(r => ({ id: r.id || `msg_${r.timestamp}`, senderId: r.senderId, text: r.text, timestamp: new Date(r.timestamp), type: MessageType.TEXT, quote: r.quote }))
                setMessages(msgs)
            }).catch(() => { })
        })
        return () => { try { unsub() } catch { } }
    }, [sessionIdProp, sessionId])

    return {
        messages, setMessages,
        isTyping,
        sessionId, setSessionId,
        isSessionInvalid, setIsSessionInvalid,
        showDisabledPrompt, setShowDisabledPrompt,
        handleSend,
        appendAssistantWithRead,
        currentUserId,
        histKey: `chat_history_${currentUserId}_${character.id}`,
        ackTimersRef, spinnerTimersRef, wsSubRef,
        recreateSession
    };
};
