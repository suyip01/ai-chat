import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft, Menu, Plus, Image as ImageIcon, Smile, Mic, Keyboard,
  Wand2, X, CheckCircle, Trash2, RefreshCw, UserCircle, MessageSquare,
  Heart, Meh, Pen, Quote, MoreHorizontal, Check, User, Sparkles
} from 'lucide-react';

const SYSTEM_EMOJIS = ['😊','😂','🥰','😭','😒','😡','👍','❤️','💔','✨'];
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
  { id: 2, name: '乖巧妹妹', job: '实习生', age: 20, color: 'bg-blue-200 text-blue-500' }
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
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [personas, setPersonas] = useState(INITIAL_PERSONAS);
  const [curPersona, setCurPersona] = useState(INITIAL_PERSONAS[0]);
  const [inputTxt, setInputTxt] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'menu' | 'emoji' | null
  const [chatMode, setChatMode] = useState('daily'); // 'daily' | 'scene'
  const [showAi, setShowAi] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [emojiTab, setEmojiTab] = useState('sys'); // 'sys' | 'cus'
  const [customBg, setCustomBg] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [selectedMsgs, setSelectedMsgs] = useState(new Set());
  const [replyState, setReplyState] = useState(null);
  const [editState, setEditState] = useState(null);
  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0, msg: null, index: -1 });
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClearAlert, setShowClearAlert] = useState(false);
  const [showSwitchAlert, setShowSwitchAlert] = useState(false);
  const [tempPersona, setTempPersona] = useState(null);
  const [newP, setNewP] = useState({ name: '', gender: '女', age: '', job: '', info: '', char: '' });

  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activePanel]);

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
    setShowAi(false);
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

  const handleTouchStart = () => { longPressTimer.current = setTimeout(() => {}, 600); };
  const handleTouchEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };

  const executeMenuAction = (action) => {
    const { msg, index } = ctxMenu;
    if (action === 'delete') setMessages(prev => prev.filter((_, i) => i !== index));
    else if (action === 'reply') { setReplyState(msg); setEditState(null); }
    else if (action === 'edit') { setInputTxt(msg.text); setEditState({ index, msg }); setReplyState(null); }
    setCtxMenu({ ...ctxMenu, show: false });
  };

  const toggleSelectMsg = (index) => {
    const newSet = new Set(selectedMsgs);
    if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
    setSelectedMsgs(newSet);
  };

  const confirmReset = () => { setMessages(prev => prev.filter((_, i) => !selectedMsgs.has(i))); setIsResetMode(false); setSelectedMsgs(new Set()); };

  const handleSavePersona = () => {
    if (!newP.name) return alert('请输入名字');
    const p = { id: Date.now(), ...newP, color: 'bg-green-200 text-green-600' };
    setPersonas(prev => [p, ...prev]); setCurPersona(p);
    setShowCreateModal(false); setShowPersonaModal(true);
    setNewP({ name: '', gender: '女', age: '', job: '', info: '', char: '' });
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setCustomBg(ev.target?.result); reader.readAsDataURL(file); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <span className="text-purple-900 font-cute text-xl font-bold">聊天设置</span>
        <button onClick={() => setShowSidebar(false)}><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => { setShowPersonaModal(true); setShowSidebar(false); }}>
          <div className="flex items-center gap-3 text-gray-600"><UserCircle className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">用户角色设定</span></div>
          <ChevronLeft className="w-3 h-3 text-gray-300 rotate-180" />
        </div>
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50">
          <div className="flex items-center gap-3 text-gray-600"><MessageSquare className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">聊天模式</span></div>
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button onClick={() => setChatMode('daily')} className={`px-2 py-1 text-xs rounded ${chatMode==='daily'?'bg-white text-purple-600 shadow-sm font-bold':'text-gray-500'}`}>日常</button>
            <button onClick={() => setChatMode('scene')} className={`px-2 py-1 text-xs rounded ${chatMode==='scene'?'bg-white text-purple-600 shadow-sm font-bold':'text-gray-500'}`}>场景</button>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => bgInputRef.current?.click()}>
          <div className="flex items-center gap-3 text-gray-600"><ImageIcon className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">聊天背景更改</span></div>
          <ChevronLeft className="w-3 h-3 text-gray-300 rotate-180" />
        </div>
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => setShowClearAlert(true)}>
          <div className="flex items-center gap-3 text-gray-500"><Trash2 className="w-5 h-5 text-slate-500" /><span className="font-medium text-sm text-slate-600">清除全部聊天记录</span></div>
        </div>
        <div className="flex items-center justify-between p-4 px-5 border-b border-gray-50 active:bg-gray-50 transition-colors" onClick={() => { setIsResetMode(true); setShowSidebar(false); }}>
          <div className="flex items-center gap-3 text-gray-600"><RefreshCw className="w-5 h-5 text-purple-600" /><span className="font-medium text-sm">重置部分对话</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#F0EBF5] font-main overflow-hidden relative select-none">
      <FontStyles />
      <input type="file" ref={fileInputRef} className="hidden" />
      <input type="file" ref={bgInputRef} className="hidden" onChange={handleBgUpload} accept="image/*" />

      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: customBg ? `url(${customBg})` : 'linear-gradient(180deg, #F3E5F5 0%, #E8DAEF 100%)' }} />

      <header className={`fixed top-0 left-0 w-full h-[60px] z-50 flex items-center justify-between px-4 border-b border-black/5 backdrop-blur-md transition-colors ${isResetMode ? 'bg-slate-100' : 'bg-[#F3E5F5]/95'}`}>
        {!isResetMode ? (
          <>
            <div className="flex items-center gap-4">
              <ChevronLeft className="w-5 h-5 text-slate-800" />
              <span className="text-[1.1rem] text-[#2E1065] font-cute font-bold">祁云 ({messages.length})</span>
            </div>
            <div onClick={() => setShowSidebar(true)} className="p-2 -mr-2 cursor-pointer text-gray-600"><Menu className="w-6 h-6" /></div>
          </>
        ) : (
          <div className="w-full text-center text-slate-700 font-bold">选择要重置的对话</div>
        )}
      </header>

      <div
        ref={chatContainerRef}
        className={`h-full overflow-y-auto px-4 pt-[70px] flex flex-col gap-4 no-scrollbar transition-all duration-300`}
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${activePanel ? 290 : 80}px)` }}
        onClick={() => { setActivePanel(null); setShowAi(false); }}
      >
        <div className="self-center bg-black/30 backdrop-blur-[4px] text-white text-[0.75rem] px-4 py-1 rounded-[20px] my-2 font-light shadow-sm">今天</div>
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex gap-2.5 max-w-[85%] relative transition-transform duration-300 ${msg.isMe ? 'self-end flex-row-reverse' : ''} ${isResetMode ? (msg.isMe ? '-translate-x-10' : 'translate-x-10') : ''}`} onContextMenu={(e) => handleContextMenu(e, msg, idx)} onTouchStart={() => handleTouchStart(msg, idx)} onTouchEnd={handleTouchEnd} onClick={() => isResetMode && toggleSelectMsg(idx)}>
            <div className={`absolute top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-opacity ${isResetMode ? 'opacity-100' : 'opacity-0'} ${msg.isMe ? '-right-10' : '-left-10'} ${selectedMsgs.has(idx) ? 'bg-[#A855F7] border-[#A855F7]' : 'border-[#DDD] bg-white'}`}>{selectedMsgs.has(idx) && <Check className="w-3.5 h-3.5 text-white" />}</div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[1.1rem] shadow-sm shrink-0 ${msg.isMe ? curPersona.color : 'bg-white text-purple-600 border border-purple-100'}`}>{msg.isMe ? curPersona.name[0] : '祁'}</div>
            <div className="flex flex-col gap-1 min-w-0">
              {msg.replyTo && (<div className="text-[0.75rem] text-gray-500 bg-black/5 px-2 py-1 rounded border-l-[3px] border-[#A855F7] mb-[2px] truncate max-w-full">回复：{msg.replyTo}</div>)}
              <div className={`px-3.5 py-2.5 text-[0.95rem] leading-normal break-all shadow-sm ${msg.isMe ? 'bg-[#A855F7] text-white rounded-[18px] rounded-tr-[4px]' : 'bg-white text-[#1F2937] rounded-[18px] rounded-tl-[4px]'}`}>{msg.text}</div>
            </div>
            <div className={`flex flex-col justify-end text-[0.65rem] text-gray-400 min-w-[40px] pb-0.5 ${msg.isMe ? 'items-end' : 'items-start'}`}>{msg.isMe && <span className="text-[#A855F7] mb-0.5">已读</span>}<span className="scale-90 origin-bottom">{msg.time}</span></div>
          </div>
        ))}
      </div>

      <div className={`fixed bottom-0 left-0 w-full z-[60] bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.03)] transition-transform duration-300 ${activePanel ? '-translate-y-[280px]' : 'translate-y-0'} ${isResetMode ? 'translate-y-[100%]' : ''}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {(replyState || editState) && (
          <div className="absolute bottom-full left-0 w-full bg-[#F9FAFB] border-t border-[#E5E7EB] px-3 py-2 flex justify-between items-center text-[0.85rem] text-gray-600 shadow-sm">
            <div className="flex-1 truncate pr-2"><span className="text-purple-600 font-bold mr-1">{editState ? '正在编辑：' : '引用：'}</span>{editState ? editState.msg.text : replyState.text}</div>
            <div onClick={() => { setReplyState(null); setEditState(null); setInputTxt(''); }} className="w-5 h-5 bg-[#E5E7EB] rounded-full flex items-center justify-center text-gray-500 cursor-pointer"><X className="w-3 h-3" /></div>
          </div>
        )}

        <div className={`absolute bottom-full left-0 w-full px-3 pb-4 flex flex-col gap-2 transition-all duration-300 pointer-events-none ${showAi ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-5'}`}>
          {(chatMode === 'scene' ? SUGGESTIONS_SCENE : SUGGESTIONS_DAILY).map((s, i) => (
            <div key={i} onClick={() => handleAiSelect(s)} className="bg-white/95 backdrop-blur-sm self-start px-4 py-2.5 rounded-[20px] border border-[#F3E8FF] shadow-[0_4px_15px_rgba(0,0,0,0.08)] text-[#4C1D95] text-[0.9rem] cursor-pointer active:scale-95 transition-transform flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> {s}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 p-2.5">
          <div onClick={() => setActivePanel(activePanel === 'menu' ? null : 'menu')} className={`w-8 h-8 flex items-center justify-center text-[#7C3AED] transition-transform duration-300 ${activePanel === 'menu' ? 'rotate-45' : ''}`}> <Plus className="w-7 h-7" /> </div>
          <div onClick={() => fileInputRef.current?.click()} className="w-8 h-8 flex items-center justify-center text-[#7C3AED]"><ImageIcon className="w-6 h-6" /></div>
          <div className="flex-1 h-10 bg-[#F3F4F6] rounded-[20px] flex items-center px-3 relative">
            {isVoice ? (
              <button className="w-full h-full text-gray-500 font-bold text-[1rem] active:bg-[#E5E5EA] rounded-[20px] flex items-center justify-center">按住 说话</button>
            ) : (
              <input type="text" value={inputTxt} onChange={(e) => setInputTxt(e.target.value)} onFocus={() => { setActivePanel(null); setShowAi(false); }} placeholder={chatMode === 'scene' ? '请输入消息 (场景模式)...' : '请输入消息...'} className="w-full h-full bg-transparent border-none outline-none text-[1rem]" />
            )}
            {!isVoice && (<div onClick={() => setShowAi(!showAi)} className="absolute right-1 w-8 h-8 flex items-center justify-center text-[#A855F7] cursor-pointer"><Wand2 className="w-5 h-5" /></div>)}
          </div>
          <div onClick={() => setActivePanel(activePanel === 'emoji' ? null : 'emoji')} className="w-8 h-8 flex items-center justify-center text-[#7C3AED]"><Smile className="w-6 h-6" /></div>
          {inputTxt.trim() && !isVoice ? (
            <button onClick={handleSend} className="px-3 py-1.5 bg-[#A855F7] text-white rounded-lg text-[0.9rem] font-bold">{editState ? '更新' : '发送'}</button>
          ) : (
            <div onClick={() => setIsVoice(!isVoice)} className="w-8 h-8 flex items-center justify-center text-[#7C3AED]">{isVoice ? <Keyboard className="w-6 h-6" /> : <Mic className="w-6 h-6" />}</div>
          )}
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 w-full bg-[#FDF4FF] border-t border-[#F0E6FA] z-[55] transition-transform duration-300 flex flex-col h-[280px] ${activePanel ? 'translate-y-0' : 'translate-y-full'}`}>
        {activePanel === 'menu' && (
          <div className="grid grid-cols-4 gap-4 p-8 pt-8">
            {[
              { icon: MoreHorizontal, label: '情节' },
              { icon: Quote, label: '日记' },
              { icon: RefreshCw, label: '记忆' },
              { icon: Heart, label: '日运' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 cursor-pointer">
                <div className="w-[60px] h-[60px] bg-white rounded-[18px] shadow-[0_4px_15px_rgba(168,85,247,0.1)] flex items-center justify-center text-[#7C3AED]"><item.icon className="w-7 h-7" /></div>
                <span className="text-[0.8rem] font-bold text-gray-500 font-cute">{item.label}</span>
              </div>
            ))}
          </div>
        )}
        {activePanel === 'emoji' && (
          <>
            <div className="flex-1 p-4 overflow-y-auto">
              {emojiTab === 'sys' ? (
                <div className="grid grid-cols-5 gap-y-4">{SYSTEM_EMOJIS.map(e => (<div key={e} onClick={() => setInputTxt(prev => prev + e)} className="text-[1.8rem] text-center cursor-pointer">{e}</div>))}</div>
              ) : (
                <div className="grid grid-cols-4 gap-4"><div className="w-[60px] h-[60px] border-2 border-dashed border-[#D8B4FE] rounded-lg flex items-center justify-center text-[#A855F7] bg-[#FAF5FF]"><Plus className="w-6 h-6" /></div></div>
              )}
            </div>
            <div className="flex border-t border-[#EEE] bg-white">
              <div onClick={() => setEmojiTab('sys')} className={`flex-1 py-3 flex justify-center cursor-pointer text-[1.2rem] ${emojiTab==='sys'?'bg-[#FDF4FF] text-[#A855F7]':'text-[#CCC]'}`}><Smile className="w-6 h-6" /></div>
              <div onClick={() => setEmojiTab('cus')} className={`flex-1 py-3 flex justify-center cursor-pointer text-[1.2rem] ${emojiTab==='cus'?'bg-[#FDF4FF] text-[#A855F7]':'text-[#CCC]'}`}><Heart className="w-6 h-6" /></div>
            </div>
          </>
        )}
      </div>

      <div className={`fixed bottom-0 left-0 w-full p-4 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-[90] transition-transform duration-300 flex gap-4 ${isResetMode ? 'translate-y-0' : 'translate-y-full'}`}>
        <button onClick={() => { setIsResetMode(false); setSelectedMsgs(new Set()); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-full">取消</button>
        <button onClick={confirmReset} className="flex-1 py-3 bg-purple-500 text-white font-bold rounded-full">重置 ({selectedMsgs.size})</button>
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

      <div className={`fixed inset-0 z-[200] bg-[#F5F5F7] transition-transform duration-300 flex flex-col ${showPersonaModal ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-md p-3 border-b border-[#E5E5EA] flex justify-between items-center z-10"><div onClick={() => setShowPersonaModal(false)} className="flex items-center gap-2"><ChevronLeft className="w-6 h-6" /> <span className="font-bold text-lg">我的角色</span></div><Plus onClick={() => { setShowPersonaModal(false); setShowCreateModal(true); }} className="w-6 h-6 text-purple-600" /></div>
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">{personas.map(p => (<div key={p.id} onClick={() => { setTempPersona(p); setShowSwitchAlert(true); }} className={`p-4 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3 ${curPersona.id===p.id?'border-2 border-[#A855F7] bg-[#FBF5FF]':''}`}><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${p.color || 'bg-gray-200'}`}>{p.name[0]}</div><div className="flex-1"><div className="font-bold">{p.name}</div><div className="text-xs text-gray-500">{p.job}</div></div>{curPersona.id===p.id && <CheckCircle className="w-5 h-5 text-purple-600" />}</div>))}</div>
      </div>

      <div className={`fixed inset-0 z-[200] bg-[#F5F5F7] transition-transform duration-300 flex flex-col ${showCreateModal ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-md p-3 border-b border-[#E5E5EA] flex justify-between items-center z-10"><ChevronLeft onClick={() => { setShowCreateModal(false); setShowPersonaModal(true); }} className="w-6 h-6" /><button onClick={handleSavePersona} className="bg-purple-50 text-purple-500 px-4 py-1 rounded-lg font-bold text-sm">完成</button></div>
        <div className="p-5 overflow-y-auto"><div className="flex justify-center mb-6"><div className="w-24 h-24 bg-red-200 rounded-full flex items-center justify-center relative"><User className="w-10 h-10 text-white" /><div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center"><Pen className="w-3 h-3 text-gray-400" /></div></div></div><div className="bg-white rounded-[10px] overflow-hidden mb-5 px-4"><div className="py-3 border-b border-[#F0F0F0] flex flex-col gap-1.5"><div className="text-[0.9rem] font-bold text-[#333]">性别</div><div className="flex gap-4 py-1"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={newP.gender==='男'} onChange={() => setNewP({ ...newP, gender: '男' })} /> 男性</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={newP.gender==='女'} onChange={() => setNewP({ ...newP, gender: '女' })} /> 女性</label></div></div></div><div className="bg-white rounded-[10px] overflow-hidden mb-5 px-4"><div className="py-3 border-b border-[#F0F0F0] flex flex-col gap-1.5"><div className="text-[0.9rem] font-bold text-[#333]">名字 (必填)</div><input value={newP.name} onChange={e => setNewP({ ...newP, name: e.target.value })} className="w-full text-[1rem] outline-none border-none" placeholder="请输入您的名字" /></div></div><div className="bg-white rounded-[10px] overflow-hidden mb-5 px-4"><div className="py-3 border-b border-[#F0F0F0] flex flex-col gap-1.5"><div className="text-[0.9rem] font-bold text-[#333]">基本信息</div><textarea value={newP.info} onChange={e => setNewP({ ...newP, info: e.target.value })} className="w-full h-[60px] text-[1rem] outline-none border-none resize-none font-sans mt-1" placeholder="角色身份背景和外貌特征..." /></div></div></div>
      </div>

      {(showClearAlert || showSwitchAlert) && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center animate-fade-in"><div className="bg-white w-[80%] max-w-[320px] rounded-2xl p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.2)]"><h3 className="font-bold text-lg mb-2">{showClearAlert ? '确认清空？' : '确认运用'}</h3><p className="text-xs text-gray-400 mb-6">{showClearAlert ? '清空后所有消息将无法恢复，请谨慎考虑' : `确定要切换为角色“${tempPersona?.name}”吗？`}</p><div className="flex gap-4"><button onClick={() => { setShowClearAlert(false); setShowSwitchAlert(false); }} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold">取消</button><button onClick={() => { if (showClearAlert) { setMessages([]); setShowClearAlert(false); setShowSidebar(false); } if (showSwitchAlert) { setCurPersona(tempPersona); setShowSwitchAlert(false); setShowPersonaModal(false); } }} className="flex-1 py-2 bg-purple-500 rounded-lg text-white font-bold">确认</button></div></div></div>
      )}
    </div>
  );
}
