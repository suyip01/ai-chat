
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Send, MoreVertical, X, ChevronRight, User as UserIcon, MessageSquare, Cpu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion'
import { androidSlideRight, fade } from '../animations'
import { UserCharacterSettings } from '../components/UserCharacterSettings';
import { UserRoleSelectorSheet } from '../components/UserRoleSelectorSheet';
import { ModelSelectorSheet } from '../components/ModelSelectorSheet';
import { Character, Message, MessageType, UserPersona } from '../types';
import { createChatSession, connectChatWs, updateSessionConfig, getSessionInfo } from '../services/chatService';
import { trackEvent, setTag } from '../services/analytics'

interface ChatDetailProps {
  character: Character;
  initialMessages: Message[];
  userPersona?: UserPersona;
  onBack: () => void;
  onUpdateLastMessage: (msg: Message) => void;
  onOpenUserSettings: () => void;
  onShowProfile: () => void;
  onUpdateUserPersona?: (persona: UserPersona) => void;
}

export const ChatDetail: React.FC<ChatDetailProps> = ({
  character,
  initialMessages,
  userPersona,
  onBack,
  onUpdateLastMessage,
  onOpenUserSettings,
  onShowProfile,
  onUpdateUserPersona
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updatePersona = onUpdateUserPersona ?? ((_: UserPersona) => { });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsRef = useRef<{ sendText: (t: string, chatMode?: 'daily' | 'scene', userRole?: UserPersona, modelId?: string, temperature?: number) => void; sendTyping: (typing: boolean) => void; close: () => void } | null>(null);
  const currentUserId = (() => { try { return localStorage.getItem('user_id') || '0' } catch { return '0' } })();
  const histKey = `chat_history_${currentUserId}_${character.id}`;
  const configKey = `chat_config_${character.id}`;
  const modelKey = `chat_model_${character.id}`;
  const tempKey = `chat_temp_${character.id}`;
  const modelNameKey = `chat_model_name_${character.id}`;

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
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].senderId === 'user' && !(next[i] as any).read) { next[i] = { ...next[i], read: true }; break; }
      }
      const msg: Message = { id: (Date.now() + 1).toString(), senderId: character.id, text, quote, timestamp: new Date(), type: MessageType.TEXT };
      next.push(msg);
      try { setTimeout(() => onUpdateLastMessage(msg), 0) } catch { }
      return next;
    });
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

  useEffect(() => {
    try {
      const legacyKey = `chat_history_${character.id}`
      const raw = localStorage.getItem(histKey) || (currentUserId === '0' ? localStorage.getItem(legacyKey) : null);
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ id: string; senderId: string; text: string; ts: number; type: string; quote?: string; read?: boolean }>;
        const msgs: Message[] = arr.map(m => ({ id: m.id, senderId: m.senderId, text: m.text, timestamp: new Date(m.ts), type: m.type as MessageType, quote: m.quote, read: m.read }));
        if (msgs.length) setMessages(msgs);
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  useEffect(() => {
    try {
      const arr = messages.map(m => ({ id: m.id, senderId: m.senderId, text: m.text, ts: m.timestamp?.getTime?.() ? m.timestamp.getTime() : Date.now(), type: m.type, quote: m.quote, read: (m as any).read }));
      localStorage.setItem(histKey, JSON.stringify(arr));
    } catch { }
  }, [messages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(configKey);
      if (raw) {
        const cfg = JSON.parse(raw) as { chatMode?: 'daily' | 'scene'; persona?: UserPersona };
        if (cfg?.chatMode === 'daily' || cfg?.chatMode === 'scene') {
          setChatMode(cfg.chatMode);
          setInput(cfg.chatMode === 'scene' ? '（）' : '');
        }
        if (cfg?.persona) setPersonaLocal(cfg.persona);
      }
      const mid = localStorage.getItem(modelKey) || undefined
      const tRaw = localStorage.getItem(tempKey)
      const t = tRaw ? parseFloat(tRaw) : undefined
      if (mid) { setModelId(mid); setHasModelOverride(true) }
      if (typeof t === 'number' && !isNaN(t)) { setModelTemp(t); setHasTempOverride(true) }
      const mname = localStorage.getItem(modelNameKey) || undefined
      if (mname) setModelNick(mname)
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  useEffect(() => {
    const key = `chat_session_${currentUserId}_${character.id}`;
    const sid = localStorage.getItem(key) || localStorage.getItem(`chat_session_${character.id}`);
    const setup = async () => {
      if (sid) {
        setSessionId(sid);
        // migrate legacy session key
        if (!localStorage.getItem(key)) { try { localStorage.setItem(key, sid) } catch { } }
        try {
          const info = await getSessionInfo(sid)
          if (info?.temperature !== undefined) { setModelTemp(info.temperature as number); try { localStorage.setItem(tempKey, String(info.temperature)) } catch { } }
          const conn = connectChatWs(sid, (text, quote, meta) => {
            appendAssistantWithRead(text, quote, meta);
          }, (payload) => { if (payload && payload.type === 'force_logout') setShowDisabledPrompt(true) });
          wsRef.current = conn;
          return;
        } catch (e: any) {
          const msg = String(e?.message || '')
          if (msg === 'session_not_found' || e?.status === 404) {
            setIsSessionInvalid(true)
            return
          }
        }
      }
      try {
        const ridRaw = localStorage.getItem('user_chat_role_id');
        const rid = ridRaw ? parseInt(ridRaw) : undefined;
        const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
        const sid = created.sessionId;
        localStorage.setItem(key, sid);
        setSessionId(sid);
        if (created.model?.id) { setModelId(created.model.id); try { localStorage.setItem(modelKey, created.model.id) } catch { } }

        if (typeof created.temperature === 'number') { setModelTemp(created.temperature!); try { localStorage.setItem(tempKey, String(created.temperature!)) } catch { } }
        const conn = connectChatWs(sid, (text, quote, meta) => {
          appendAssistantWithRead(text, quote, meta);
        }, (payload) => { if (payload && payload.type === 'force_logout') setShowDisabledPrompt(true) });
        wsRef.current = conn;
      } catch { }
    };
    setup();
    return () => { wsRef.current?.close(); wsRef.current = null };
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
        } catch {}
      }
      localStorage.setItem(configKey, JSON.stringify({ chatMode: mode, persona: nextPersona }))
      trackEvent('聊天模式.切换', { 目标模式: mode === 'scene' ? '场景' : '日常' })
      setTag('聊天模式', mode === 'scene' ? '场景' : '日常')
    } catch { }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    // Don't send if it's just empty brackets
    if (input.trim() === '（）' || input.trim() === '()') return;

    const userMsg: Message = {
      id: Date.now().toString(),
      senderId: 'user',
      text: input,
      timestamp: new Date(),
      type: MessageType.TEXT,
      read: false
    };

    setMessages(prev => [...prev, userMsg]);
    try { setTimeout(() => onUpdateLastMessage(userMsg), 0) } catch { }
    // Reset input based on mode
    setInput(chatMode === 'scene' ? '（）' : '');
    setIsTyping(true);
    try { trackEvent('聊天.发送', { 文本长度: input.length, 聊天模式: chatMode === 'scene' ? '场景' : '日常' }) } catch {}

    try {
      if (!sessionId) {
        const ridRaw = localStorage.getItem('user_chat_role_id');
        const rid = ridRaw ? parseInt(ridRaw) : undefined;
        const created = await createChatSession(character.id, typeof rid === 'number' ? rid : undefined);
        const sid = created.sessionId;
        localStorage.setItem(`chat_session_${currentUserId}_${character.id}`, sid);
        setSessionId(sid);
        const conn = connectChatWs(sid, (text, quote, meta) => {
          appendAssistantWithRead(text, quote, meta);
        });
        wsRef.current = conn;
      }
      wsRef.current?.sendText(
        userMsg.text,
        chatMode,
        effectivePersona,
        hasModelOverride ? modelId : undefined,
        hasTempOverride ? modelTemp : undefined
      );
      wsRef.current?.sendTyping(false);
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-primary-50 z-50"
      style={{ ...viewportStyle, overscrollBehavior: 'none', position: 'fixed' }}
      initial={{ x: ((navigator as any)?.maxTouchPoints > 0) ? '100%' : 0 }}
      animate={{ x: 0 }}
      exit={{ x: ((navigator as any)?.maxTouchPoints > 0) ? '100%' : 0 }}
      transition={{ duration: ((navigator as any)?.maxTouchPoints > 0) ? 0.3 : 0, ease: 'linear' }}
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

        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-primary-50" style={{ overflowAnchor: 'none' }}>
          <div className="flex justify-center my-4">
            <span className="bg-black/10 text-white text-[10px] px-3 py-1 rounded-full font-medium">今天</span>
          </div>

          {messages.map((msg, index) => {
            const isMe = msg.senderId === 'user';

            return (
              <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-4 group`}>

                {/* Character Avatar */}
                {!isMe && (
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
                )}

                {/* Message Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div
                    className={`
                      px-4 py-3 text-[15px] shadow-sm leading-relaxed relative
                      ${isMe
                        ? 'bg-[#A855F7] text-white rounded-[20px] rounded-tr-sm'
                        : 'bg-white text-slate-800 rounded-[20px] rounded-tl-sm border border-slate-100'
                      }
                    `}
                  >
                    {msg.text}
                  </div>
                  {!isMe && msg.quote && (
                    <div className="mt-1 max-w-full">
                      <div className="inline-block bg-slate-100 text-slate-500 text-xs leading-tight rounded-[12px] px-2 py-1 border border-slate-200">
                        {msg.quote}
                      </div>
                    </div>
                  )}
                  {/* Timestamp */}
                  <div className={`flex items-center gap-2 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {isMe && msg.read && (
                      <span className="text-[10px] text-slate-400">已读</span>
                    )}
                    <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>

                {/* User Avatar */}
                {isMe && (
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-pink-200 flex items-center justify-center text-pink-600 font-bold border border-white shadow-sm">
                      {(!userImgError && effectivePersona?.avatar) ? (
                        <img src={effectivePersona.avatar} alt={effectivePersona?.name || '我'} className="w-full h-full object-cover" onError={() => setUserImgError(true)} />
                      ) : (
                        (effectivePersona?.name ? effectivePersona.name[0] : '我')
                      )}
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
                onChange={(e) => { setInput(e.target.value); wsRef.current?.sendTyping(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onFocus={() => { scrollToBottom(); setTimeout(scrollToBottom, 150); setTimeout(scrollToBottom, 300); resizeTextarea(); setTimeout(resizeTextarea, 0); }}
                onBlur={() => wsRef.current?.sendTyping(false)}
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
                </div>
              </motion.div>
            </>
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
                        try { localStorage.removeItem(key) } catch {}
                        localStorage.setItem(key, sid);
                        try { localStorage.removeItem(histKey) } catch {}
                        {
                          const opener = character.openingLine || character.oneLinePersona || ''
                          const mid = `msg_${Date.now()}`
                          const record = { id: mid, senderId: character.id, text: opener, ts: Date.now(), type: MessageType.TEXT }
                          try { localStorage.setItem(histKey, JSON.stringify([record])) } catch {}
                          const newMsg: Message = { id: mid, senderId: character.id, text: opener, timestamp: new Date(), type: MessageType.TEXT }
                          setMessages([newMsg])
                          try { setTimeout(() => onUpdateLastMessage(newMsg), 0) } catch {}
                        }
                        setSessionId(sid);
                        setIsSessionInvalid(false);
                        if (created.model?.id) { setModelId(created.model.id); try { localStorage.setItem(modelKey, created.model.id) } catch { } }
                        if (typeof created.temperature === 'number') { setModelTemp(created.temperature!); try { localStorage.setItem(tempKey, String(created.temperature!)) } catch { } }
                        const conn = connectChatWs(sid, (text, quote, meta) => { appendAssistantWithRead(text, quote, meta) }, (payload) => { if (payload && payload.type === 'force_logout') setShowDisabledPrompt(true) });
                        wsRef.current = conn;
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
                            try { await fetch('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) }) } catch {}
                          }
                        }
                      } catch {}
                      try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch {}
                      setShowDisabledPrompt(false)
                      try { window.location.reload() } catch {}
                    }}
                  >确定</button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </motion.div>
  );
};
