
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Send, MoreVertical, X, ChevronRight, User as UserIcon, MessageSquare, Cpu, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion'
import { androidSlideRight, fade } from '../animations'
import { UserCharacterSettings } from '../components/UserCharacterSettings';
import { UserRoleSelectorSheet } from '../components/UserRoleSelectorSheet';
import { ModelSelectorSheet } from '../components/ModelSelectorSheet';
import { Character, Message, MessageType, UserPersona } from '../types';
import { createChatSession, getSessionInfo } from '../services/chatService';
import { sharedChatWs } from '../services/sharedChatWs'
import { trackEvent, setTag } from '../services/analytics'
import { listMessages as dbListMessages, putConfig as dbPutConfig, getConfig as dbGetConfig, putSession as dbPutSession, addMessage as dbAddMessage } from '../services/chatDb'
import { chatEvents } from '../services/chatEvents'

interface ChatDetailProps {
  character: Character;
  initialMessages: Message[];
  userPersona?: UserPersona;
  onBack: () => void;
  onUpdateLastMessage: (msg: Message) => void;
  onOpenUserSettings: () => void;
  onShowProfile: () => void;
  onUpdateUserPersona?: (persona: UserPersona) => void;
  sessionId?: string;
}

export const ChatDetail: React.FC<ChatDetailProps> = ({
  character,
  initialMessages,
  userPersona,
  onBack,
  onUpdateLastMessage,
  onOpenUserSettings,
  onShowProfile,
  onUpdateUserPersona,
  sessionId: sessionIdProp
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages.map(m => ({ ...m, saved: true } as any)));
  // Default to Scene mode with brackets pre-filled
  const [chatMode, setChatMode] = useState<'daily' | 'scene'>('scene');
  const [input, setInput] = useState('（）');
  const [isTyping, setIsTyping] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserSettingsOpenLocal, setIsUserSettingsOpenLocal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<UserPersona | undefined>(undefined)
  const [editingRoleId, setEditingRoleId] = useState<number | undefined>(undefined)
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [isModelSheetOpen, setIsModelSheetOpen] = useState(false);
  const [modelId, setModelId] = useState<string | undefined>(undefined)
  const [modelTemp, setModelTemp] = useState<number>(0.1)
  const [modelNick, setModelNick] = useState<string | undefined>(undefined)
  const [hasModelOverride, setHasModelOverride] = useState<boolean>(false)
  const [hasTempOverride, setHasTempOverride] = useState<boolean>(false)
  const [personaLocal, setPersonaLocal] = useState<UserPersona | undefined>(undefined)
  const [charImgError, setCharImgError] = useState(false)
  const [userImgError, setUserImgError] = useState(false)
  const [isSessionInvalid, setIsSessionInvalid] = useState(false)
  const [showDisabledPrompt, setShowDisabledPrompt] = useState(false)
  const [isBgSheetOpen, setIsBgSheetOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updatePersona = onUpdateUserPersona ?? ((_: UserPersona) => { });
  const [sessionId, setSessionId] = useState<string | null>(sessionIdProp || null);
  const wsSubRef = useRef<((text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void) | null>(null)
  const currentUserId = (() => { try { return localStorage.getItem('user_id') || '0' } catch { return '0' } })();
  const histKey = `chat_history_${currentUserId}_${character.id}`;
  const configKey = `chat_config_${character.id}`;
  const modelKey = `chat_model_${character.id}`;
  const tempKey = `chat_temp_${character.id}`;
  const modelNameKey = `chat_model_name_${character.id}`;
  const bgKey = `chat_bg_${character.id}`;
  const [chatBg, setChatBg] = useState<string | undefined>(undefined)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const [isBgDark, setIsBgDark] = useState<boolean | null>(null)
  const ackTimersRef = useRef<Map<string, number>>(new Map())
  const spinnerTimersRef = useRef<Map<string, number>>(new Map())
  const sessionIdRef = useRef(sessionId)

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  useEffect(() => {
    return () => {
      ackTimersRef.current.forEach(t => clearTimeout(t))
      spinnerTimersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  const analyzeBgBrightness = (src?: string) => {
    if (!src) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const w = 32, h = 32;
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            sum += lum;
          }
          const avg = sum / (w * h);
          setIsBgDark(avg < 128);
        } catch { }
      };
    } catch { }
  };

  const effectivePersona = useMemo<UserPersona | undefined>(() => {
    if (personaLocal) return personaLocal;
    try {
      const nickname = localStorage.getItem('user_nickname') || '';
      const avatar = localStorage.getItem('user_avatar') || '';
      if (nickname || avatar) {
        return {
          name: nickname || '我',
          gender: 'secret',
          age: '',
          profession: '',
          basicInfo: '',
          personality: '',
          avatar: avatar || undefined,
        };
      }
    } catch { }
    return undefined;
  }, [personaLocal]);

  const appendAssistantWithRead = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => {
    const sid = sessionIdProp || sessionId
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
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].senderId === 'user' && !(next[i] as any).read) { next[i] = { ...next[i], read: true }; break; }
      }
      next.push(msg);
      try { console.log('[CHAT-LIVE] append assistant', { id: msg.id, chunk: meta }) } catch { }
      messagesRef.current = next
      try { setTimeout(() => onUpdateLastMessage(msg), 0) } catch { }
      return next;
    });

    if (sid) {
      try {
        const cur = localStorage.getItem('current_chat_sid') || ''
        if (cur && cur === sid) {
          // DB write centralized in sharedChatWs to avoid duplicates
          console.log('[CHAT-DETAIL] skip write (centralized)', { sid, mid: msg.id })
        }
      } catch { }
    }

    if (meta && typeof meta.chunkIndex === 'number' && typeof meta.chunkTotal === 'number') {
      setIsTyping(meta.chunkIndex < meta.chunkTotal);
    } else {
      setIsTyping(false);
    }
  }

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const resizeTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    try {
      const styles = window.getComputedStyle(ta)
      const lineHeight = parseFloat(styles.lineHeight || '22') || 22
      const maxH = parseFloat(styles.maxHeight || '0') || (lineHeight * 4)
      ta.style.height = 'auto'
      const sc = ta.scrollHeight
      const next = Math.min(sc, maxH)
      ta.style.height = `${Math.max(next, 22)}px`
    } catch {
      ta.style.height = 'auto'
      const sc = ta.scrollHeight
      ta.style.height = `${Math.max(Math.min(sc, 96), 22)}px`
    }
  }

  useEffect(() => {
    scrollToBottom();
    resizeTextarea();
  }, [messages, isTyping]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => resizeTextarea())
    return () => cancelAnimationFrame(raf)
  }, [input])

  const [viewportStyle, setViewportStyle] = useState<{ height: string | number; top: string | number }>({ height: '100%', top: 0 });

  useEffect(() => {
    const handleVisualViewport = () => {
      if (window.visualViewport) {
        setViewportStyle({
          height: `${window.visualViewport.height}px`,
          top: `${window.visualViewport.offsetTop}px`
        });

        // Ensure input is visible by scrolling to bottom
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
      // Initial set
      handleVisualViewport();
    }

    const onResize = () => {
      if (!window.visualViewport) {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        } else {
          scrollToBottom();
        }
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewport);
        window.visualViewport.removeEventListener('scroll', handleVisualViewport);
      }
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages }, [messages]);

  useEffect(() => {
    const sid = sessionIdProp || sessionId
    return () => { void sid }
  }, [sessionIdProp, sessionId])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, sessionIdProp, sessionId]);

  useEffect(() => {
    const unsub = chatEvents.onMessageCommitted(({ sessionId: sid }) => {
      const cur = sessionIdProp || sessionId
      if (!cur || cur !== sid) return
      // When message is committed, we might want to reload to ensure consistency, 
      // but we also have it live.
      // If we blindly reload, we might flicker. 
      // Since appendAssistantWithRead manages live updates, strict reloading might NOT be necessary if the content is same.
      // However, to ensure we have the 'saved' state or identical IDs, let's just reload nicely or merge.
      // For now, let's keep the reload but check if it causes jump.

      dbListMessages(cur, 500).then(rows => {
        const msgs: Message[] = rows.map(r => ({ id: r.id || `msg_${r.timestamp}`, senderId: r.senderId, text: r.text, timestamp: new Date(r.timestamp), type: MessageType.TEXT, quote: r.quote }))
        // If the new list is longer or different, set it.
        setMessages(msgs)
      }).catch(() => { })
    })
    return () => { try { unsub() } catch { } }
  }, [sessionIdProp, sessionId])

  useEffect(() => {
    try {
      const sid = sessionIdProp || sessionId
      if (sid) {
        dbGetConfig(sid).then(cfg => {
          if (!cfg) return
          if (cfg.mode === 'daily' || cfg.mode === 'scene') {
            setChatMode(cfg.mode)
            setInput(cfg.mode === 'scene' ? '（）' : '')
          }
          if (cfg.persona) setPersonaLocal(cfg.persona as any)
          if (typeof cfg.temperature === 'number') setModelTemp(cfg.temperature!)
        }).catch(() => { })
      }
      const mid = localStorage.getItem(modelKey) || undefined
      const tRaw = localStorage.getItem(tempKey)
      const t = tRaw ? parseFloat(tRaw) : undefined
      if (mid) { setModelId(mid); setHasModelOverride(true) }
      if (typeof t === 'number' && !isNaN(t)) { setModelTemp(t); setHasTempOverride(true) }
      const mname = localStorage.getItem(modelNameKey) || undefined
      if (mname) setModelNick(mname)
      const bg = localStorage.getItem(bgKey) || undefined
      if (bg) setChatBg(bg)
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  useEffect(() => {
    if (chatBg) analyzeBgBrightness(chatBg)
  }, [chatBg])

  useEffect(() => {
    const key = `chat_session_${currentUserId}_${character.id}`;
    let activeSid: string | null = null;
    let activeSub: ((text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void) | null = null;

    const setup = async () => {
      let sid = localStorage.getItem(key) || localStorage.getItem(`chat_session_${character.id}`);

      if (sid) {
        setSessionId(sid);
        // migrate legacy session key
        if (!localStorage.getItem(key)) { try { localStorage.setItem(key, sid) } catch { } }
        try {
          const info = await getSessionInfo(sid)
          if (info?.temperature !== undefined) { setModelTemp(info.temperature as number); try { localStorage.setItem(tempKey, String(info.temperature)) } catch { } }
        } catch (e: any) {
          const msg = String(e?.message || '')
          if (msg === 'session_not_found' || e?.status === 404) {
            setIsSessionInvalid(true)
            return
          }
        }
      } else {
        try {
          const ridRaw = localStorage.getItem('user_chat_role_id');
          const rid = ridRaw ? parseInt(ridRaw) : undefined;
          const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
          sid = created.sessionId;
          localStorage.setItem(key, sid);
          setSessionId(sid);
          if (created.model?.id) { setModelId(created.model.id); try { localStorage.setItem(modelKey, created.model.id) } catch { } }
          if (typeof created.temperature === 'number') { setModelTemp(created.temperature!); try { localStorage.setItem(tempKey, String(created.temperature!)) } catch { } }
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
              if (st) { try { clearTimeout(st) } catch { }; spinnerTimersRef.current.delete(msgId) }
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

  const handleModeSwitch = (mode: 'daily' | 'scene') => {
    setChatMode(mode);
    if (mode === 'scene') {
      // Add brackets if not present
      if (!input.includes('（') && !input.includes('(')) {
        setInput(prev => `（）${prev}`);
      } else if (input === '') {
        setInput('（）');
      }
    } else {
      // Remove empty brackets when switching to daily
      if (input === '（）' || input === '()') {
        setInput('');
      }
    }
    try {
      let nextPersona: UserPersona | undefined = personaLocal || userPersona || undefined
      if (!nextPersona) {
        try {
          const raw = localStorage.getItem(configKey)
          if (raw) {
            const cfg = JSON.parse(raw) as { chatMode?: 'daily' | 'scene'; persona?: UserPersona }
            if (cfg && cfg.persona) nextPersona = cfg.persona
          }
        } catch { }
      }
      const sid = sessionIdProp || sessionId
      if (sid) dbPutConfig(sid, { sessionId: sid, mode, persona: nextPersona })
      trackEvent('聊天模式.切换', { 目标模式: mode === 'scene' ? '场景' : '日常' })
      setTag('聊天模式', mode === 'scene' ? '场景' : '日常')
    } catch { }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    // Don't send if it's just empty brackets
    if (input.trim() === '（）' || input.trim() === '()') return;

    const userMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      senderId: 'user',
      text: input,
      timestamp: new Date(),
      type: MessageType.TEXT,
      read: false,
      saved: false
    } as any;

    setMessages(prev => [...prev, { ...userMsg, pendingAck: true } as any]);
    try { setTimeout(() => onUpdateLastMessage(userMsg), 0) } catch { }
    // Reset input based on mode
    setInput(chatMode === 'scene' ? '（）' : '');
    try { trackEvent('聊天.发送', { 文本长度: input.length, 聊天模式: chatMode === 'scene' ? '场景' : '日常' }) } catch { }

    try {
      let sidToUse = sessionIdProp || sessionId || null
      if (!sidToUse) {
        const ridRaw = localStorage.getItem('user_chat_role_id');
        const rid = ridRaw ? parseInt(ridRaw) : undefined;
        const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
        const sid = created.sessionId;
        localStorage.setItem(`chat_session_${currentUserId}_${character.id}`, sid);
        setSessionId(sid);
        try { await dbPutSession({ sessionId: sid, userId: currentUserId, characterId: String(character.id) }) } catch { }
        sidToUse = sid
        sharedChatWs.ensureConnected()
        const sub = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => {
          appendAssistantWithRead(text, quote, meta)
        }
        if (!wsSubRef.current) {
          wsSubRef.current = sub
          sharedChatWs.subscribe(sid, sub)
        }
      }
      if (sidToUse) {
        dbAddMessage({ id: userMsg.id, sessionId: sidToUse, userId: currentUserId, senderId: 'user', text: userMsg.text, timestamp: userMsg.timestamp.getTime(), type: 'TEXT' }).catch(() => { })
        sharedChatWs.sendText(
          sidToUse,
          userMsg.text,
          chatMode,
          effectivePersona,
          hasModelOverride ? modelId : undefined,
          hasTempOverride ? modelTemp : undefined,
          userMsg.id
        )
        sharedChatWs.sendTyping(sidToUse, false)
        const timer = window.setTimeout(() => {
          setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === userMsg.id && !(m as any).saved) ? ({ ...m, failed: true, pendingAck: false, spinning: false } as any) : m))
          dbAddMessage({ ...userMsg, sessionId: sidToUse, userId: currentUserId, timestamp: userMsg.timestamp.getTime(), failed: true }).catch(() => { })
          ackTimersRef.current.delete(userMsg.id)
          const st = spinnerTimersRef.current.get(userMsg.id)
          if (st) { try { clearTimeout(st) } catch { }; spinnerTimersRef.current.delete(userMsg.id) }
        }, 8000)
        ackTimersRef.current.set(userMsg.id, timer)

        const spinnerTimer = window.setTimeout(() => {
          setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === userMsg.id && (m as any).pendingAck) ? ({ ...m, spinning: true } as any) : m))
          spinnerTimersRef.current.delete(userMsg.id)
        }, 2000)
        spinnerTimersRef.current.set(userMsg.id, spinnerTimer)
      }
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === userMsg.id) ? ({ ...m, failed: true, pendingAck: false } as any) : m))
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-primary-50 z-50"
      style={{ ...viewportStyle, overscrollBehavior: 'none', position: 'fixed' }}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="mx-auto w-full max-w-md h-full flex flex-col relative bg-white shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden">
        <div className="bg-primary-50/95 backdrop-blur-md pt-[env(safe-area-inset-top)] shadow-none z-10 border-b border-white/50 flex-shrink-0">
          <div className="px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 -ml-2 text-slate-800 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>

              {/* Header Name - Clickable */}
              <div
                className="flex items-center cursor-pointer active:opacity-70 transition-opacity"
              >
                <h2 className="font-bold text-slate-800 text-lg">
                  {isTyping ? '对方正在输入中...' : character.name}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-800 hover:text-primary-600 rounded-full hover:bg-black/5 transition-all"
            >
              <MoreVertical size={24} />
            </button>
          </div>
        </div>

        <div
          ref={contentRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar ${chatBg ? '' : 'bg-primary-50'}`}
          style={{
            overflowAnchor: 'none',
            backgroundImage: chatBg ? `url(${chatBg})` : undefined,
            backgroundSize: chatBg ? 'cover' : undefined,
            backgroundPosition: chatBg ? 'center' : undefined,
            backgroundRepeat: chatBg ? 'no-repeat' : undefined,
          }}
        >
          <div className="flex justify-center my-4">
            <span
              className={`text-[10px] px-3 py-1 rounded-full font-medium backdrop-blur-sm ${chatBg ? (isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'bg-black/10 text-white'}`}
            >今天</span>
          </div>

          {messages.map((msg, index) => {
            const isMe = msg.senderId === 'user';

            return (
              <div key={`${msg.id}_${index}`} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-4 group`}>

                {/* User Message Layout Refactored for Vertical Alignment */}
                {isMe ? (
                  <div className="flex w-full justify-end mb-4 group">
                    {/* Wrapper for Content + Indicators */}
                    <div className="flex flex-col items-end max-w-[75%]">
                      <div className="flex items-center justify-end gap-2">
                        {/* Retry Button */}
                        {(msg as any).failed && (
                          <div className="flex items-center justify-center">
                            <button
                              className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                              onClick={() => {
                                const sidToUse = sessionIdProp || sessionId
                                if (!sidToUse) return
                                const mid = (msg as any).id
                                setMessages(prev => prev.map(m => (m as any).id === mid ? ({ ...m, failed: false, pendingAck: true, spinning: false } as any) : m))

                                sharedChatWs.sendText(
                                  sidToUse,
                                  msg.text,
                                  chatMode,
                                  effectivePersona,
                                  hasModelOverride ? modelId : undefined,
                                  hasTempOverride ? modelTemp : undefined,
                                  mid
                                )
                                const old = ackTimersRef.current.get(mid)
                                if (old) { try { clearTimeout(old) } catch { }; ackTimersRef.current.delete(mid) }
                                const oldS = spinnerTimersRef.current.get(mid)
                                if (oldS) { try { clearTimeout(oldS) } catch { }; spinnerTimersRef.current.delete(mid) }

                                const t = window.setTimeout(() => {
                                  setMessages(prev => prev.map(m => ((m as any).id === mid && !(m as any).saved) ? ({ ...m, failed: true, pendingAck: false, spinning: false } as any) : m))
                                  dbAddMessage({ ...msg, sessionId: sidToUse, userId: currentUserId, timestamp: msg.timestamp.getTime(), failed: true } as any).catch(() => { })
                                  ackTimersRef.current.delete(mid)
                                  const st = spinnerTimersRef.current.get(mid)
                                  if (st) { try { clearTimeout(st) } catch { }; spinnerTimersRef.current.delete(mid) }
                                }, 8000)
                                ackTimersRef.current.set(mid, t)

                                const spinnerTimer = window.setTimeout(() => {
                                  setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === mid && (m as any).pendingAck) ? ({ ...m, spinning: true } as any) : m))
                                  spinnerTimersRef.current.delete(mid)
                                }, 2000)
                                spinnerTimersRef.current.set(mid, spinnerTimer)
                              }}
                              title="重新发送"
                            >
                              <span className="font-bold text-xs">!</span>
                            </button>
                          </div>
                        )}

                        {/* Loading Spinner */}
                        {(msg as any).spinning && !(msg as any).failed && (
                          <div className={`flex items-center justify-center ${chatBg ? 'p-1 rounded-full backdrop-blur-sm ' + (isBgDark ? 'bg-white/30' : 'bg-black/30') : ''}`}>
                            <Loader2 className={`w-4 h-4 animate-spin ${chatBg ? (isBgDark ? 'text-slate-800' : 'text-white') : 'text-slate-400'}`} />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`
                              px-4 py-3 text-[15px] shadow-sm leading-relaxed relative
                              bg-[#A855F7] text-white rounded-[20px] rounded-tr-sm
                            `}
                        >
                          {msg.text}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mt-1 mr-1">
                        {msg.read && (
                          <span
                            className={`text-[10px] ${chatBg ? 'px-1.5 py-0.5 rounded-full backdrop-blur-sm ' + (isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'text-slate-400'}`}
                            style={chatBg ? { textShadow: isBgDark ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.6)' } : undefined}
                          >已读</span>
                        )}
                        <span
                          className={`text-[10px] ${chatBg ? 'px-1.5 py-0.5 rounded-full backdrop-blur-sm ' + (isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'text-slate-400'}`}
                          style={chatBg ? { textShadow: isBgDark ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.6)' } : undefined}
                        >{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>

                    {/* User Avatar */}
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-pink-200 flex items-center justify-center text-pink-600 font-bold border border-white shadow-sm">
                        {(!userImgError && effectivePersona?.avatar) ? (
                          <img src={effectivePersona.avatar} alt={effectivePersona?.name || '我'} className="w-full h-full object-cover" onError={() => setUserImgError(true)} />
                        ) : (
                          (effectivePersona?.name ? effectivePersona.name[0] : '我')
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Character Message Layout (Unchanged)
                  <div className="flex w-full justify-start mb-4 group">
                    <div className="flex-shrink-0 mr-3 flex flex-col items-center gap-1">
                      <div
                        onClick={onShowProfile}
                        className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-500 font-bold border border-white cursor-pointer active:scale-95 transition-transform"
                      >
                        {(!charImgError && character.avatar) ? (
                          <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" onError={() => setCharImgError(true)} />
                        ) : (
                          character.name[0]
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start max-w-[75%]">
                      <div
                        className={`
                          px-4 py-3 text-[15px] shadow-sm leading-relaxed relative
                          bg-white text-slate-800 rounded-[20px] rounded-tl-sm border border-slate-100
                        `}
                      >
                        {msg.text}
                      </div>
                      {msg.quote && (
                        <div className="mt-1 max-w-full">
                          <div className="inline-block bg-slate-100 text-slate-500 text-xs leading-tight rounded-[12px] px-2 py-1 border border-slate-200">
                            {msg.quote}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 ml-1">
                        <span
                          className={`text-[10px] ${chatBg ? 'px-1.5 py-0.5 rounded-full backdrop-blur-sm ' + (isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'text-slate-400'}`}
                          style={chatBg ? { textShadow: isBgDark ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.6)' } : undefined}
                        >{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}

          {/* 顶部状态显示替代下方打字提示，不再渲染会话内loading气泡 */}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white p-3 pb-3 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] pb-[env(safe-area-inset-bottom)] mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white rounded-[24px] px-3 py-2 border border-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.12)] transition-shadow focus-within:shadow-[0_16px_40px_rgba(0,0,0,0.16)]">

            <div className="flex-1 flex items-center pl-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); if (sessionId) sharedChatWs.sendTyping(sessionId, true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onFocus={() => { scrollToBottom(); setTimeout(scrollToBottom, 150); setTimeout(scrollToBottom, 300); resizeTextarea(); setTimeout(resizeTextarea, 0); }}
                onBlur={() => { if (sessionId) sharedChatWs.sendTyping(sessionId, false) }}
                placeholder=""
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-700 text-sm p-0 resize-none max-h-24 overflow-y-auto no-scrollbar leading-5 placeholder:text-slate-400"
                rows={1}
                style={{ minHeight: '22px' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || input.trim() === '（）'}
              className={`p-2 rounded-full transition-all duration-300 flex-shrink-0 flex items-center justify-center ${input.trim() && input.trim() !== '（）' ? 'bg-[#A855F7] text-white shadow-md active:scale-95' : 'bg-transparent text-[#A855F7]'}`}
            >
              <Send size={20} className={input.trim() && input.trim() !== '（）' ? 'ml-0.5' : ''} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isSettingsOpen && (
            <>
              <motion.div className="absolute inset-0 bg-black/20 z-[60] will-change-opacity" onClick={() => setIsSettingsOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} />
              <motion.div className="absolute top-0 right-0 h-full w-3/4 bg-white z-[70] shadow-2xl will-change-transform transform-gpu" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={androidSlideRight}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800">聊天设置</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-2">
                  {/* My Character Settings */}
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsRoleSheetOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <UserIcon size={18} />
                      </div>
                      <span className="font-bold text-sm">我的角色设置</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>

                  <div className="h-[1px] bg-slate-50 mx-4"></div>

                  {/*
                  <button
                    onClick={() => { setIsSettingsOpen(false); setIsModelSheetOpen(true) }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <Cpu size={18} />
                      </div>
                      <span className="font-bold text-sm">模型</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{modelNick || '默认'}</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </button>
                  */}

                  <div className="h-[1px] bg-slate-50 mx-4"></div>

                  {/* Chat Mode */}
                  <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <MessageSquare size={18} />
                      </div>
                      <span className="font-bold text-sm">聊天模式</span>
                    </div>

                    {/* Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => handleModeSwitch('daily')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chatMode === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                      >
                        日常
                      </button>
                      <button
                        onClick={() => handleModeSwitch('scene')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chatMode === 'scene' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        场景
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-50 mx-4"></div>

                  <button
                    onClick={() => { setIsSettingsOpen(false); setIsBgSheetOpen(true); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <ImageIcon size={18} />
                      </div>
                      <span className="font-bold text-sm">聊天背景更改</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isBgSheetOpen && (
            <motion.div
              className="absolute inset-0 bg-white z-[70] will-change-transform"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={androidSlideRight}
            >
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => setIsBgSheetOpen(false)} className="p-2 -ml-2 text-slate-800 hover:bg-black/5 rounded-full">
                  <ArrowLeft size={24} />
                </button>
                <h3 className="font-bold text-lg text-slate-800">聊天背景</h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { setChatBg(undefined); setIsBgDark(null); try { localStorage.removeItem(bgKey) } catch { }; setIsBgSheetOpen(false) }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="font-bold text-sm text-slate-700">重置背景</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <div className="h-[1px] bg-slate-50 mx-4"></div>
                <button
                  onClick={() => { setIsBgSheetOpen(false); bgInputRef.current?.click(); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="font-bold text-sm text-slate-700">从相册中选择</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isUserSettingsOpenLocal && (
          <UserCharacterSettings
            currentPersona={editingPersona}
            roleId={editingRoleId}
            onBack={() => setIsUserSettingsOpenLocal(false)}
            onSave={(_) => {
              setIsUserSettingsOpenLocal(false);
              setIsRoleSheetOpen(true);
            }}
            withinContainer
          />
        )}

        <UserRoleSelectorSheet
          isOpen={isRoleSheetOpen}
          currentPersona={personaLocal || userPersona}
          characterId={character.id}
          onClose={() => setIsRoleSheetOpen(false)}
          onAdd={() => { setIsRoleSheetOpen(false); setEditingPersona(undefined); setEditingRoleId(undefined); setIsUserSettingsOpenLocal(true); }}
          onSelect={(persona) => { setPersonaLocal(persona); try { localStorage.setItem(configKey, JSON.stringify({ chatMode, persona })); } catch { } }}
          onEdit={(persona, roleId) => { setIsRoleSheetOpen(false); setEditingPersona(persona); setEditingRoleId(roleId); setIsUserSettingsOpenLocal(true) }}
        />

        {/**
        <ModelSelectorSheet
          isOpen={isModelSheetOpen}
          currentModelId={modelId}
          onClose={() => setIsModelSheetOpen(false)}
          onSelect={(mid, nickname) => { setModelId(mid); setHasModelOverride(true); setModelNick(nickname); try { localStorage.setItem(modelKey, mid); if (nickname) localStorage.setItem(modelNameKey, nickname) } catch { } }}
          temperature={modelTemp}
          onTempChange={(t) => { setModelTemp(t); setHasTempOverride(true); try { localStorage.setItem(tempKey, String(t)) } catch { } }}
        />
        */}

        {isSessionInvalid && (
          <>
            <div className="fixed inset-0 z-[80] bg-black/20"></div>
            <div className="fixed inset-0 z-[90] flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm">
                <div className="px-6 py-5 text-center text-slate-800 font-bold">该会话已失效，请新建会话。</div>
                <div className="h-[1px] bg-slate-100"></div>
                <div className="flex">
                  <button className="flex-1 py-3 text-slate-600 active:opacity-70" onClick={() => { setIsSessionInvalid(false); onBack(); }}>返回列表</button>
                  <div className="w-[1px] bg-slate-100"></div>
                  <button
                    className="flex-1 py-3 text-primary-600 font-bold active:opacity-70"
                    onClick={async () => {
                      try {
                        const ridRaw = localStorage.getItem('user_chat_role_id');
                        const rid = ridRaw ? parseInt(ridRaw) : undefined;
                        const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
                        const sid = created.sessionId;
                        const uid = localStorage.getItem('user_id') || '0'
                        const key = `chat_session_${uid}_${character.id}`
                        try { localStorage.removeItem(key) } catch { }
                        localStorage.setItem(key, sid);
                        try { localStorage.removeItem(histKey) } catch { }
                        {
                          const opener = character.openingLine || character.oneLinePersona || ''
                          const mid = `msg_${Date.now()}`
                          const record = { id: mid, senderId: character.id, text: opener, ts: Date.now(), type: MessageType.TEXT }
                          try { localStorage.setItem(histKey, JSON.stringify([record])) } catch { }
                          const newMsg: Message = { id: mid, senderId: character.id, text: opener, timestamp: new Date(), type: MessageType.TEXT }
                          setMessages([newMsg])
                          try { setTimeout(() => onUpdateLastMessage(newMsg), 0) } catch { }
                        }
                        setSessionId(sid);
                        setIsSessionInvalid(false);
                        if (created.model?.id) { setModelId(created.model.id); try { localStorage.setItem(modelKey, created.model.id) } catch { } }
                        if (typeof created.temperature === 'number') { setModelTemp(created.temperature!); try { localStorage.setItem(tempKey, String(created.temperature!)) } catch { } }
                        sharedChatWs.ensureConnected()
                        const sub = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => appendAssistantWithRead(text, quote, meta)
                        if (!wsSubRef.current) {
                          wsSubRef.current = sub
                          sharedChatWs.subscribe(sid, sub)
                        }
                        sharedChatWs.addControlListener((payload) => {
                          if (!payload) return
                          if (payload.type === 'force_logout') setShowDisabledPrompt(true)
                          if (payload.type === 'user_ack') {
                            const sidAck = String(payload.sessionId || '')
                            const msgId = String(payload.clientMsgId || '')
                            const curSid = sid
                            if (curSid && sidAck && curSid === sidAck && msgId) {
                              setMessages(prev => prev.map(m => (m.senderId === 'user' && (m as any).id === msgId) ? ({ ...m, saved: true, failed: false, pendingAck: false } as any) : m))
                              const t = ackTimersRef.current.get(msgId)
                              if (t) { try { clearTimeout(t) } catch { }; ackTimersRef.current.delete(msgId) }
                            }
                          }
                        })
                      } catch { }
                    }}
                  >新建会话</button>
                </div>
              </div>
            </div>
          </>
        )}

        {showDisabledPrompt && (
          <>
            <div className="fixed inset-0 z-[80] bg-black/30"></div>
            <div className="fixed inset-0 z-[90] flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm">
                <div className="px-6 py-5 text-center font-bold text-red-600">此帐号已暂停使用，请联络工作人员。</div>
                <div className="h-[1px] bg-slate-100"></div>
                <div className="flex">
                  <button
                    className="flex-1 py-3 text-primary-600 font-bold active:opacity-70"
                    onClick={async () => {
                      try {
                        const rt = localStorage.getItem('user_refresh_token') || ''
                        if (rt) {
                          const res = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) })
                          if (!res.ok) {
                            try { await fetch('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) }) } catch { }
                          }
                        }
                      } catch { }
                      try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch { }
                      setShowDisabledPrompt(false)
                      try { window.location.reload() } catch { }
                    }}
                  >确定</button>
                </div>
              </div>
            </div>
          </>
        )}

        <input
          type="file"
          accept="image/*"
          ref={bgInputRef}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              const r = new FileReader()
              r.onload = (ev) => {
                const result = ev.target?.result as string
                setChatBg(result)
                try { localStorage.setItem(bgKey, result) } catch { }
                analyzeBgBrightness(result)
              }
              r.readAsDataURL(f)
            }
            try { e.currentTarget.value = '' } catch { }
          }}
        />

      </div>
    </motion.div>
  );
};
