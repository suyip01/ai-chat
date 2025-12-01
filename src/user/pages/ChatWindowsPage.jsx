import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, Menu, Image as ImageIcon,
  X, Trash2, MessageSquare,
  Heart, Meh, Pen, Quote,
  UserCircle, CheckCircle
} from 'lucide-react';

const SYSTEM_EMOJIS = ['😊', '😂', '🥰', '😭', '😒', '😡', '👍', '❤️', '💔', '✨'];
const SUGGESTIONS_DAILY = ['凶什么凶嘛，这就出来了...', '就不，有本事你进来抓我呀？', '刚碰到个熟人聊两句，你急什么。'];
const SUGGESTIONS_SCENE = ['(低头看手机，有些心虚) 马上就来...', '(故意拖延时间) 我没带伞...', '(深吸一口气，推开门) 来了。'];

const INITIAL_MESSAGES = [
  { id: 1, isMe: false, text: '出来，我在酒吧门口。', time: '22:30' },
  { id: 2, isMe: true, text: '你怎么来了？不是说今天值夜班吗？', time: '22:31' },
  { id: 3, isMe: false, text: '别让我说第二遍。', time: '22:31' },
  { id: 4, isMe: false, text: '外面下雨了，我带了伞。', time: '22:32' }
];

const INITIAL_PERSONAS = [
  { id: 1, name: '傲娇千金', job: '学生', age: 22, color: 'bg-pink-200 text-pink-500' },
  { id: 2, name: '高冷女王', job: '总裁', age: 32, color: 'bg-green-200 text-green-500' },
  { id: 3, name: '乖巧妹妹', job: '实习生', age: 20, color: 'bg-blue-200 text-blue-500' } 
];

const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Varela+Round&display=swap');
    .font-cute { font-family: 'ZCOOL KuaiLe', cursive; letter-spacing: 1px; }
    .font-main { font-family: 'Varela Round', 'PingFang SC', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .animate-fade-in { animation: fadeIn 0.18s ease-out; }
  `}</style>
);

export default function ChatProPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCharacter = location.state?.fromCharacter;
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [personas, setPersonas] = useState(INITIAL_PERSONAS);
  const [curPersona, setCurPersona] = useState(INITIAL_PERSONAS[0]);
  const [inputTxt, setInputTxt] = useState('');
  const [chatMode, setChatMode] = useState('daily'); // 'daily' | 'scene'

  const [showSidebar, setShowSidebar] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);

  const [customBg, setCustomBg] = useState('');

  const [replyState, setReplyState] = useState(null);
  const [editState, setEditState] = useState(null);
  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0, msg: null, index: -1 });
  const [showClearAlert, setShowClearAlert] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (chatMode === 'scene') setInputTxt(prev => prev || '()');
    else if (inputTxt === '()') setInputTxt('');
  }, [chatMode]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 80);
  };

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      if (vv) {
        setKbOffset(Math.max(0, window.innerHeight - vv.height));
      } else {
        setKbOffset(0);
      }
    };
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('orientationchange', update);
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const saveSession = () => {
    try {
      const list = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
      const last = messages[messages.length - 1];
      const entry = {
        id: fromCharacter?.id || 0,
        name: fromCharacter?.name || '祁云',
        message: last ? last.text : '(开始聊天)',
        tag: '熟人',
        avatarColor: 'bg-slate-700',
        unread: false
      };
      const idx = list.findIndex((x) => x.id === entry.id && entry.id !== 0);
      if (idx >= 0) list[idx] = entry; else list.unshift(entry);
      localStorage.setItem('chat_sessions', JSON.stringify(list));
    } catch { }
  };

  const handleSend = () => {
    if (!inputTxt.trim()) return;
    if (editState) {
      setMessages(prev => prev.map((m, i) => i === editState.index ? { ...m, text: inputTxt } : m));
      setEditState(null);
    } else {
      const newMsg = {
        id: Date.now(), isMe: true, text: inputTxt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyTo: replyState ? replyState.text : null
      };
      setMessages(prev => [...prev, newMsg]);
      setReplyState(null);
    }
    setInputTxt(chatMode === 'scene' ? '()' : '');
    scrollToBottom();
  };

  const handleAiSelect = (text) => { setInputTxt(text); handleSend(); };

  const handleContextMenu = (e, msg, index) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const menuWidth = 180;
    const x = clientX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 20 : clientX;
    setCtxMenu({ show: true, x, y: clientY, msg, index });
  };

  const handleTouchStart = () => { longPressTimer.current = setTimeout(() => { }, 600); };
  const handleTouchEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };

  const executeMenuAction = (action) => {
    const { msg, index } = ctxMenu;
    if (action === 'delete') setMessages(prev => prev.filter((_, i) => i !== index));
    else if (action === 'reply') { setReplyState(msg); setEditState(null); }
    else if (action === 'edit') { setInputTxt(msg.text); setEditState({ index, msg }); setReplyState(null); }
    setCtxMenu({ ...ctxMenu, show: false });
  };





  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setCustomBg(ev.target?.result); reader.readAsDataURL(file); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <span className="text-purple-900 font-cute text-xl font-bold">聊天设置</span>
        <button onClick={() => setShowSidebar(false)} className="ml-auto"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => { setShowPersonaModal(true); setShowSidebar(false); }}>
          <div className="flex items-center gap-3 text-gray-600"><UserCircle className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">用户角色设定</span></div>
          <ChevronLeft className="w-3 h-3 text-gray-300 rotate-180" />
        </div>

        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50">
          <div className="flex items-center gap-3 text-gray-600"><MessageSquare className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">聊天模式</span></div>
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button onClick={() => setChatMode('daily')} className={`px-2 py-1 text-xs rounded ${chatMode === 'daily' ? 'bg-white text-purple-600 shadow-sm font-bold' : 'text-gray-500'}`}>日常</button>
            <button onClick={() => setChatMode('scene')} className={`px-2 py-1 text-xs rounded ${chatMode === 'scene' ? 'bg-white text-purple-600 shadow-sm font-bold' : 'text-gray-500'}`}>场景</button>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => bgInputRef.current?.click()}>
          <div className="flex items-center gap-3 text-gray-600"><ImageIcon className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">聊天背景更改</span></div>
          <ChevronLeft className="w-3 h-3 text-gray-300 rotate-180" />
        </div>
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => setShowClearAlert(true)}>
          <div className="flex items-center gap-3 text-gray-500"><Trash2 className="w-5 h-5 text-slate-500" /><span className="font-medium text-sm text-slate-600">清除全部聊天记录</span></div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#F0EBF5] font-main overflow-hidden relative select-none flex flex-col">
      <FontStyles />
      <input type="file" ref={fileInputRef} className="hidden" />
      <input type="file" ref={bgInputRef} className="hidden" onChange={handleBgUpload} accept="image/*" />

      <div className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: customBg ? `url(${customBg})` : 'linear-gradient(180deg, #F3E5F5 0%, #E8DAEF 100%)' }} />

      <header className="fixed top-0 left-0 w-full h-[60px] z-50 flex items-center justify-between px-4 border-b border-black/5 backdrop-blur-md bg-[#F3E5F5]/95" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-4">
          <ChevronLeft onClick={() => { saveSession(); navigate('/', { state: { tab: 'chat' } }); }} className="w-5 h-5 text-slate-800 cursor-pointer" />
          <span className="text-[1.1rem] text-[#2E1065] font-cute font-bold">{fromCharacter?.name || '祁云'} ({messages.length})</span>
        </div>
        <div onClick={() => setShowSidebar(true)} className="p-2 -mr-2 cursor-pointer text-gray-600"><Menu className="w-6 h-6" /></div>
      </header>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 flex flex-col gap-4 no-scrollbar relative z-10"
        style={{ overscrollBehavior: 'contain', paddingTop: 'calc(env(safe-area-inset-top) + 60px)', paddingBottom: `calc(env(safe-area-inset-bottom) + ${kbOffset}px + 80px)` }}
        onClick={() => { }}
      >
        <div className="self-center bg-black/30 backdrop-blur-[4px] text-white text-[0.75rem] px-4 py-1 rounded-[20px] my-2 font-light shadow-sm flex-shrink-0">今天</div>
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex gap-2.5 max-w-[85%] relative transition-transform duration-300 flex-shrink-0 ${msg.isMe ? 'self-end flex-row-reverse' : ''}`} onContextMenu={(e) => handleContextMenu(e, msg, idx)} onTouchStart={() => handleTouchStart(msg, idx)} onTouchEnd={handleTouchEnd}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[1.1rem] shadow-sm shrink-0 ${msg.isMe ? curPersona.color : 'bg-white text-purple-600 border border-purple-100'}`}>{msg.isMe ? curPersona.name[0] : '祁'}</div>
            <div className="flex flex-col gap-1 min-w-0">
              {msg.replyTo && (<div className="text-[0.75rem] text-gray-500 bg-black/5 px-2 py-1 rounded border-l-[3px] border-[#A855F7] mb-[2px] truncate max-w-full">回复：{msg.replyTo}</div>)}
              <div className={`px-3.5 py-2.5 text-[0.95rem] leading-normal break-all shadow-sm ${msg.isMe ? 'bg-[#A855F7] text-white rounded-[18px] rounded-tr-[4px]' : 'bg-white text-[#1F2937] rounded-[18px] rounded-tl-[4px]'}`}>{msg.text}</div>
            </div>
            <div className={`flex flex-col justify-end text-[0.65rem] text-gray-400 min-w-[40px] pb-0.5 ${msg.isMe ? 'items-end' : 'items-start'}`}>{msg.isMe && <span className="text-[#A855F7] mb-0.5">已读</span>}<span className="scale-90 origin-bottom">{msg.time}</span></div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full z-[60] bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.03)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)', bottom: kbOffset }}>
        {(replyState || editState) && (
          <div className="absolute bottom-full left-0 w-full bg-[#F9FAFB] border-t border-[#E5E7EB] px-3 py-2 flex justify-between items-center text-[0.85rem] text-gray-600 shadow-sm">
            <div className="flex-1 truncate pr-2"><span className="text-purple-600 font-bold mr-1">{editState ? '正在编辑：' : '引用：'}</span>{editState ? editState.msg.text : replyState.text}</div>
            <div onClick={() => { setReplyState(null); setEditState(null); setInputTxt(''); }} className="w-5 h-5 bg-[#E5E7EB] rounded-full flex items-center justify-center text-gray-500 cursor-pointer"><X className="w-3 h-3" /></div>
          </div>
        )}



        <div className="flex items-center gap-2.5 p-2.5">
          <div className="flex-1 h-10 bg-[#F3F4F6] rounded-[20px] flex items-center px-3">
            <input type="text" value={inputTxt} onChange={(e) => setInputTxt(e.target.value)} onFocus={scrollToBottom} placeholder={chatMode === 'scene' ? '请输入消息 (场景模式)...' : '请输入消息...'} className="w-full h-full bg-transparent border-none outline-none text-[1rem]" />
          </div>
          {inputTxt.trim() && (
            <button onClick={handleSend} className="px-3 py-1.5 bg-[#A855F7] text-white rounded-lg text-[0.9rem] font-bold">{editState ? '更新' : '发送'}</button>
          )}
        </div>
      </div>





      {ctxMenu.show && (
        <>
          <div className="fixed inset-0 z-[300]" onClick={() => setCtxMenu({ ...ctxMenu, show: false })} />
          <div className="fixed z-[301] w-[180px] bg-black/40 backdrop-blur-[10px] rounded-xl p-2 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-white/10 animate-fade-in" style={{ top: ctxMenu.y, left: ctxMenu.x }}>
            <div className="flex justify-around py-1.5">
              <div onClick={() => executeMenuAction('edit')} className="flex flex-col items-center gap-1 cursor-pointer opacity-90 text-[0.7rem]"><Pen className="w-4 h-4 mb-0.5" />编辑</div>
              <div onClick={() => executeMenuAction('reply')} className="flex flex-col items-center gap-1 cursor-pointer opacity-90 text-[0.7rem]"><Quote className="w-4 h-4 mb-0.5" />引用</div>
              <div onClick={() => executeMenuAction('delete')} className="flex flex-col items-center gap-1 cursor-pointer opacity-90 text-[0.7rem]"><Trash2 className="w-4 h-4 mb-0.5" />删除</div>
            </div>
            {!ctxMenu.msg?.isMe && (<><div className="h-[1px] bg-white/20 my-1" /><div className="flex justify-around py-1"><Heart className="w-4 h-4 text-pink-400" /><Meh className="w-4 h-4 text-yellow-400" /><X className="w-4 h-4 text-purple-600 font-bold" /></div></>)}
          </div>
        </>
      )}

      <div className={`fixed inset-0 z-[250] pointer-events-none ${showSidebar ? 'pointer-events-auto' : ''}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ease-linear ${showSidebar ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowSidebar(false)}
        />
        <div
          className={`absolute top-0 right-0 w-[70%] max-w-[320px] h-full bg-white shadow-[0_0_20px_rgba(0,0,0,0.1)] border-l border-gray-100 transition-transform duration-250 ease-linear ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <SidebarContent />
        </div>
      </div>



      {showClearAlert && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center animate-fade-in"><div className="bg-white w-[80%] max-w-[320px] rounded-2xl p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.2)]"><h3 className="font-bold text-lg mb-2">确认清空？</h3><p className="text-xs text-gray-400 mb-6">清空后所有消息将无法恢复，请谨慎考虑</p><div className="flex gap-4"><button onClick={() => { setShowClearAlert(false); }} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold">取消</button><button onClick={() => { setMessages([]); setShowClearAlert(false); setShowSidebar(false); }} className="flex-1 py-2 bg-purple-500 rounded-lg text-white font-bold">确认</button></div></div></div>
      )}

      <div className={`fixed inset-0 z-[260] pointer-events-none ${showPersonaModal ? 'pointer-events-auto' : ''}`}>
        <div className={`absolute inset-0 bg-black/30 transition-opacity duration-250 ease-linear ${showPersonaModal ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowPersonaModal(false)} />
        <div className={`absolute bottom-0 left-0 right-0 bg-[#F5F5F7] rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-250 ease-linear ${showPersonaModal ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="sticky top-0 bg-white/95 backdrop-blur-md p-3 border-b border-[#E5E5EA] flex justify-between items-center z-10">
            <div onClick={() => setShowPersonaModal(false)} className="flex items-center gap-2 cursor-pointer"><ChevronLeft className="w-6 h-6" /> <span className="font-bold text-lg">我的角色</span></div>
          </div>
          <div className="p-4 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
            {personas.map(p => (
              <div key={p.id} onClick={() => { setCurPersona(p); setShowPersonaModal(false); }} className={`p-4 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3 ${curPersona.id===p.id?'border-2 border-[#A855F7] bg-[#FBF5FF]':''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${p.color || 'bg-gray-200'}`}>{p.name[0]}</div>
                <div className="flex-1">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.job}</div>
                </div>
                {curPersona.id===p.id && <CheckCircle className="w-5 h-5 text-purple-600" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
