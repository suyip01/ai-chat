import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Camera, 
  Plus, 
  Sparkles, 
  Globe, 
  Lock, 
  Info, 
  Wand2, 
  X, 
  Mic, 
  Save, 
  Music,
  User
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Global CSS                                 */
/* -------------------------------------------------------------------------- */

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Varela+Round&family=Noto+Sans+SC:wght@400;500;700&display=swap');

    :root {
      --font-cute: 'ZCOOL KuaiLe', cursive;
      --font-body: 'Varela Round', 'Noto Sans SC', sans-serif;
    }

    body {
      font-family: var(--font-body);
      background-color: #F3E5F5;
      color: #4A4060;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .font-cute {
      font-family: var(--font-cute);
      letter-spacing: 1px;
    }

    /* 滚动条美化 (Desktop) */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.3);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(167, 139, 250, 0.5);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.7);
    }

    /* 移动端隐藏滚动条 */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    /* 动画定义 */
    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes floatStar {
      0% { transform: translateY(20px) scale(0.5); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(-20px) scale(0); opacity: 0; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
      animation: fadeIn 0.4s ease-out forwards;
    }
  `}</style>
);

/* -------------------------------------------------------------------------- */
/* Utility Components                              */
/* -------------------------------------------------------------------------- */

// 动态星空背景
const StarBackground = () => {
  return (
    <>
      <div 
        className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none"
        style={{
          background: `
            radial-gradient(at 0% 0%, hsla(270, 60%, 96%, 1) 0, transparent 50%),
            radial-gradient(at 50% 100%, hsla(260, 60%, 90%, 1) 0, transparent 50%),
            radial-gradient(at 100% 0%, hsla(290, 60%, 94%, 1) 0, transparent 50%)
          `,
          backgroundSize: '200% 200%',
          animation: 'gradientMove 15s ease infinite'
        }}
      />
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-yellow-300 rounded-full shadow-[0_0_8px_rgba(255,215,0,0.8)]"
            style={{
              width: Math.random() * 4 + 3 + 'px',
              height: Math.random() * 4 + 3 + 'px',
              left: Math.random() * 100 + '%',
              animation: `floatStar ${Math.random() * 3 + 4}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
    </>
  );
};

// 毛玻璃卡片容器
const GlassCard = ({ children, className = '', noPadding = false }) => (
  <div className={`
    bg-white/70 backdrop-blur-xl border-2 border-white/90 
    shadow-[0_8px_30px_rgba(139,92,246,0.08)] rounded-3xl 
    transition-all duration-300 hover:shadow-[0_12px_40px_rgba(139,92,246,0.12)]
    ${noPadding ? 'p-0' : 'p-6'} 
    ${className}
  `}>
    {children}
  </div>
);

// 标题组件
const SectionTitle = ({ children, icon: Icon }) => (
  <div className="font-cute text-xl text-purple-900 mb-4 flex items-center">
    <div className="w-1.5 h-5 bg-yellow-400 rounded-full mr-3 shadow-sm"></div>
    {children}
    {Icon && <Icon className="w-5 h-5 ml-2 text-purple-300 opacity-60" />}
  </div>
);

// 输入框组件
const DreamInput = ({ className = '', ...props }) => (
  <input 
    className={`
      w-full bg-white/60 border-2 border-purple-50 rounded-2xl px-4 py-3
      text-slate-700 placeholder-purple-300/80 transition-all duration-300
      focus:bg-white focus:border-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-200/20
      hover:bg-white/80
      ${className}
    `}
    {...props}
  />
);

const DreamTextarea = ({ className = '', ...props }) => (
  <textarea 
    className={`
      w-full bg-white/60 border-2 border-purple-50 rounded-2xl px-4 py-3
      text-slate-700 placeholder-purple-300/80 transition-all duration-300
      focus:bg-white focus:border-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-200/20
      hover:bg-white/80 resize-none
      ${className}
    `}
    {...props}
  />
);

// 标签胶囊
const TagPill = ({ children, onClose, active = false }) => (
  <span className={`
    inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer
    ${active 
      ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-200' 
      : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 hover:scale-105'
    }
  `}>
    #{children}
    {onClose && (
      <X 
        className="w-3 h-3 ml-1.5 opacity-60 hover:opacity-100 cursor-pointer" 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />
    )}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Main Application                                */
/* -------------------------------------------------------------------------- */

export default function CreateCharacterApp() {
  /* State */
  const [form, setForm] = useState({
    type: '原创角色',
    avatar: '',
    name: '',
    gender: '男',
    identity: '',
    tagline: '',
    personality: '',
    searchTags: [],
    relationship: '陌生人',
    plotTheme: '',
    plotSummary: '',
    openingLine: '',
    styleExamples: ['', '', ''],
    hobbies: '',
    experiences: '',
    isPublic: true
  });

  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isCustomRel, setIsCustomRel] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  /* Data Constants */
  const roleTypes = ['原创角色', '二次创作', '其他'];
  const relationships = ['陌生人', '暧昧', '恋爱中', '冷战', '分手'];
  const availableTags = [
    'M/M', 'M/F', 'BL', 'BG', '耽美', '百合', '责任感', '偶像', '占有欲', 
    '霸道', '调戏', '腹黑', '温柔', '年下', '年上', '感性', '体贴', '理性', 
    '反差', '激情', '校园', '贴心', '偏执', '疯批', '傲娇', '职场', '冷漠', 
    '忧郁', '人夫', '养胃', '控制欲', '黏人', '可爱', '成熟', '性感'
  ];

  /* Handlers */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setForm({ ...form, avatar: e.target.result });
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag) => {
    const newTags = form.searchTags.includes(tag)
      ? form.searchTags.filter(t => t !== tag)
      : [...form.searchTags, tag];
    setForm({ ...form, searchTags: newTags });
  };

  const addCustomTag = () => {
    if (customTagInput.trim() && !form.searchTags.includes(customTagInput.trim())) {
      setForm({ ...form, searchTags: [...form.searchTags, customTagInput.trim()] });
      setCustomTagInput('');
    }
  };

  const getStylePlaceholder = (idx) => {
    const arr = [
      "例：哼，别以为我会感谢你。",
      "例：今晚月色真美，不一起走走吗？",
      "例：再靠近一步，我就不客气了。"
    ];
    return arr[idx];
  };

  /* ------------------------------- Sub Components ------------------------------- */

  // Modal Component (Responsive: Bottom Sheet on Mobile, Center Modal on Desktop)
  const TagSelectionModal = () => (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 ${showTagModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowTagModal(false)}
      />
      
      {/* Modal Content */}
      <div className={`
        fixed z-[51] bg-white transition-all duration-300 shadow-2xl flex flex-col
        /* Mobile Styles */
        bottom-0 left-0 right-0 rounded-t-[2.5rem] h-[80vh] transform
        ${showTagModal ? 'translate-y-0' : 'translate-y-full'}
        
        /* Desktop Styles */
        md:inset-0 md:m-auto md:w-[600px] md:h-auto md:max-h-[85vh] md:rounded-[2rem] 
        md:${showTagModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-purple-50 flex justify-between items-center bg-white/50 rounded-t-[2.5rem]">
            <button 
                onClick={() => setShowTagModal(false)}
                className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-cute text-purple-900">添加 #标签</h3>
            <button 
                onClick={() => setShowTagModal(false)}
                className="text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 px-4 py-1.5 rounded-full shadow-lg shadow-purple-200 transition-all active:scale-95"
            >
                完成
            </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Selected Tags */}
            <section>
                <div className="text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">已选标签</div>
                <div className="min-h-[60px] bg-purple-50/50 rounded-2xl border-2 border-purple-100 border-dashed p-3 flex flex-wrap gap-2">
                    {form.searchTags.length === 0 && (
                        <span className="text-sm text-slate-400 self-center w-full text-center italic">暂无标签...</span>
                    )}
                    {form.searchTags.map(tag => (
                        <TagPill key={tag} active onClose={() => toggleTag(tag)}>{tag}</TagPill>
                    ))}
                </div>
            </section>

            {/* Custom Input */}
            <section>
                <div className="text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">自定义标签</div>
                <div className="flex gap-2">
                    <DreamInput 
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                        placeholder="输入标签名称 (回车添加)"
                        className="bg-white border-purple-100"
                    />
                    <button 
                        onClick={addCustomTag}
                        className="bg-purple-500 text-white px-5 rounded-2xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-transform"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* Tag Cloud */}
            <section>
                <div className="text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">热门推荐</div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {availableTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`
                                py-2 rounded-xl text-xs font-bold transition-all truncate
                                ${form.searchTags.includes(tag) 
                                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200' 
                                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                }
                            `}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </section>
        </div>
      </div>
    </>
  );

  /* ------------------------------- Main Layout ------------------------------- */

  return (
    <div className="min-h-screen relative pb-32 md:pb-12">
      <GlobalStyles />
      <StarBackground />
      <TagSelectionModal />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/50 shadow-sm px-4 md:px-8 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl md:text-2xl font-cute text-purple-900">创建角色</h1>
            <button className="text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-full transition flex items-center gap-1">
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">存草稿</span>
            </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 mt-6 md:mt-10">
        
        {/* Desktop: 2-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-start">
            
            {/* Left Column: Avatar & Core Identity (Sticky on Desktop) */}
            <div className="md:col-span-4 lg:col-span-3 md:sticky md:top-24 space-y-6">
                {/* Role Type Tabs */}
                <div className="flex md:flex-wrap gap-2 overflow-x-auto no-scrollbar pb-1">
                    {roleTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setForm({ ...form, type })}
                            className={`
                                flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap font-cute tracking-wide flex-1
                                ${form.type === type 
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' 
                                    : 'bg-white/60 text-slate-500 hover:bg-white'
                                }
                            `}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Avatar Uploader Card */}
                <GlassCard className="flex flex-col items-center text-center relative overflow-hidden group">
                     {/* Decorative bg blob */}
                     <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-purple-100/50 to-transparent pointer-events-none"></div>

                    <div className="relative cursor-pointer group-hover:scale-105 transition-transform duration-500 mt-2">
                        <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden relative z-10">
                            {form.avatar ? (
                                <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-purple-200 flex flex-col items-center">
                                    <Camera className="w-10 h-10 mb-1" />
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-purple-500 text-white w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-20 pointer-events-none">
                            <Plus className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-purple-400 font-bold tracking-widest uppercase">点击上传头像</p>
                    
                    {/* Name Input moved here for better desktop flow */}
                    <div className="w-full mt-6 space-y-3">
                         <div className="relative">
                            <User className="absolute left-3 top-3.5 w-4 h-4 text-purple-300" />
                            <DreamInput 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                placeholder="角色姓名 (例: 祁云)" 
                                className="text-center font-bold text-lg pl-10"
                            />
                         </div>
                         <DreamInput 
                            value={form.tagline} 
                            onChange={e => setForm({...form, tagline: e.target.value})}
                            placeholder="一句话人设" 
                            className="text-xs text-center bg-transparent border-transparent focus:bg-white hover:bg-white/40"
                         />
                    </div>
                </GlassCard>

                {/* Desktop-Only Submit Button (Visually nicer to have it here on wide screens) */}
                <button className="hidden md:flex w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-200 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all items-center justify-center tracking-widest font-cute text-lg group">
                    <Sparkles className="w-5 h-5 text-yellow-300 mr-2 group-hover:rotate-12 transition-transform" /> 
                    唤醒角色
                </button>
            </div>

            {/* Right Column: Detailed Form */}
            <div className="md:col-span-8 lg:col-span-9 space-y-6">
                
                {/* 1. Basic Settings */}
                <GlassCard>
                    <SectionTitle>基础设定</SectionTitle>
                    
                    <div className="space-y-6">
                        {/* Gender */}
                        <div>
                            <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">性别</label>
                            <div className="flex gap-3">
                                {['男', '女', '其他'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setForm({...form, gender: g})}
                                        className={`
                                            flex-1 py-3 rounded-2xl text-sm font-bold transition-all font-cute
                                            ${form.gender === g
                                                ? g === '男' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200'
                                                : g === '女' ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-200'
                                                : 'bg-purple-100 text-purple-600 ring-2 ring-purple-200'
                                                : 'bg-white/50 text-slate-400 hover:bg-white'
                                            }
                                        `}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Identity */}
                        <div>
                             <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">身份背景</label>
                             <DreamTextarea 
                                rows={3}
                                value={form.identity}
                                onChange={e => setForm({...form, identity: e.target.value})}
                                placeholder="例：28岁，生于医学世家，现任A市第一医院的骨科医生。"
                             />
                        </div>

                         {/* Personality */}
                         <div>
                             <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">性格特点</label>
                             <DreamTextarea 
                                rows={2}
                                value={form.personality}
                                onChange={e => setForm({...form, personality: e.target.value})}
                                placeholder="例：占有欲强，容易吃醋，对外人高冷对你温柔..."
                             />
                        </div>

                        {/* Tags */}
                        <div>
                             <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">角色标签</label>
                             <div 
                                onClick={() => setShowTagModal(true)}
                                className="w-full bg-white/60 border-2 border-purple-50 rounded-2xl px-3 py-2 min-h-[52px] flex flex-wrap gap-2 items-center cursor-pointer hover:bg-white/90 hover:border-purple-200 transition group"
                             >
                                {form.searchTags.length === 0 ? (
                                    <span className="text-xs text-purple-300 ml-1 group-hover:text-purple-400">点击添加标签 (#傲娇 #高冷...)</span>
                                ) : (
                                    form.searchTags.map(tag => (
                                        <TagPill key={tag} onClose={() => toggleTag(tag)}>{tag}</TagPill>
                                    ))
                                )}
                                <ChevronRight className="ml-auto w-4 h-4 text-purple-300" />
                             </div>
                        </div>

                        {/* Relationship */}
                        <div>
                            <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">当下的关系</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button 
                                    onClick={() => { setIsCustomRel(true); setForm({...form, relationship: ''}) }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all font-cute border ${isCustomRel ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-slate-500 border-purple-100 hover:border-purple-300'}`}
                                >
                                    自定义
                                </button>
                                {relationships.map(rel => (
                                    <button
                                        key={rel}
                                        onClick={() => { setIsCustomRel(false); setForm({...form, relationship: rel}) }}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all font-cute border ${form.relationship === rel && !isCustomRel ? 'bg-purple-500 text-white border-purple-500 shadow-md' : 'bg-white text-slate-500 border-purple-100 hover:border-purple-300'}`}
                                    >
                                        {rel}
                                    </button>
                                ))}
                            </div>
                            {isCustomRel && (
                                <div className="animate-fade-in">
                                    <DreamInput 
                                        value={form.relationship}
                                        onChange={e => setForm({...form, relationship: e.target.value})}
                                        placeholder="请输入自定义关系" 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* 2. First Plot */}
                <GlassCard>
                    <SectionTitle>第一情节</SectionTitle>
                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 mb-6 flex gap-3 text-xs text-slate-600 leading-relaxed">
                        <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        第一情节的内容将被应用于和角色的第一次聊天。此外，设定第一情节并选择公开角色后，情节内容将显示在角色资料页上。
                    </div>

                    <div className="bg-white/40 p-5 rounded-[1.5rem] border border-white/60 space-y-5">
                         {/* Plot Theme */}
                         <div className="relative group/input">
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">主题</label>
                            <DreamInput 
                                value={form.plotTheme}
                                onChange={e => setForm({...form, plotTheme: e.target.value})}
                                placeholder="例：当温柔人夫终于爆发腹黑属性" 
                                className="bg-white/80"
                            />
                            <button className="absolute bottom-1.5 right-1.5 bg-amber-400 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg shadow-amber-200 opacity-0 group-focus-within/input:opacity-100 group-hover/input:opacity-100 transition-all transform translate-y-2 group-focus-within/input:translate-y-0">
                                <Wand2 className="w-3 h-3 mr-1" /> AI 灵感
                            </button>
                         </div>

                         {/* Plot Summary */}
                         <div className="relative group/input">
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">情节梗概</label>
                            <DreamTextarea 
                                rows={5}
                                value={form.plotSummary}
                                onChange={e => setForm({...form, plotSummary: e.target.value})}
                                placeholder="例：在一起这么久了，他还是一如既往的温柔体贴..." 
                                className="bg-white/80"
                            />
                            <button className="absolute bottom-3 right-3 bg-amber-400 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg shadow-amber-200 opacity-0 group-focus-within/input:opacity-100 group-hover/input:opacity-100 transition-all transform translate-y-2 group-focus-within/input:translate-y-0">
                                <Wand2 className="w-3 h-3 mr-1" /> AI 扩写
                            </button>
                         </div>
                        
                         {/* Opening Line */}
                         <div className="relative group/input">
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">开场白</label>
                            <DreamTextarea 
                                rows={2}
                                value={form.openingLine}
                                onChange={e => setForm({...form, openingLine: e.target.value})}
                                placeholder="例：“出来，我在酒吧门口”" 
                                className="bg-white/80"
                            />
                            <button className="absolute bottom-3 right-3 bg-amber-400 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg shadow-amber-200 opacity-0 group-focus-within/input:opacity-100 group-hover/input:opacity-100 transition-all transform translate-y-2 group-focus-within/input:translate-y-0">
                                <Wand2 className="w-3 h-3 mr-1" /> AI 生成
                            </button>
                         </div>
                    </div>
                </GlassCard>

                {/* 3. Advanced Settings */}
                <GlassCard noPadding className="overflow-hidden">
                    <button 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between p-6 bg-transparent hover:bg-white/40 transition"
                    >
                        <div className="flex items-center gap-3">
                            <SectionTitle>进阶设定</SectionTitle>
                            <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md font-bold border border-purple-200 mb-4">可选</span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-purple-400 transition-transform duration-300 mb-4 ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showAdvanced && (
                        <div className="p-6 pt-0 space-y-6 animate-fade-in border-t border-white/50">
                            {/* Dialogue Style */}
                            <div>
                                <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">说话风格示例</label>
                                <div className="space-y-3">
                                    {[0, 1, 2].map((idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-purple-300 font-mono">0{idx+1}</span>
                                            <DreamInput 
                                                value={form.styleExamples[idx]}
                                                onChange={e => {
                                                    const newArr = [...form.styleExamples];
                                                    newArr[idx] = e.target.value;
                                                    setForm({...form, styleExamples: newArr});
                                                }}
                                                placeholder={getStylePlaceholder(idx)} 
                                                className="flex-1 py-2.5"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Hobbies & Experiences */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">爱好</label>
                                    <DreamTextarea 
                                        rows={2}
                                        value={form.hobbies}
                                        onChange={e => setForm({...form, hobbies: e.target.value})}
                                        placeholder="例：喜欢看书、收集古董怀表..." 
                                    />
                                </div>
                                <div>
                                    <label className="text-purple-900 font-bold text-sm mb-2 block ml-1">经历</label>
                                    <DreamTextarea 
                                        rows={2}
                                        value={form.experiences}
                                        onChange={e => setForm({...form, experiences: e.target.value})}
                                        placeholder="角色个人经历或共同经历" 
                                    />
                                </div>
                            </div>

                            {/* Voice Upload */}
                            <div>
                                <label className="text-purple-900 font-bold text-sm mb-1 block ml-1">自定义声音</label>
                                <p className="text-[10px] text-red-400 mb-2 opacity-80 font-bold ml-1">
                                    *请确保音频为无背景杂音的日常说话声，不能上传歌曲和戏曲。
                                </p>
                                <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 flex flex-col items-center justify-center text-purple-400 bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer group">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                        <Mic className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <span className="text-xs font-bold font-cute tracking-widest text-purple-600">点击上传音频</span>
                                    <span className="text-[10px] opacity-60 mt-1">支持 MP3 / WAV</span>
                                </div>
                            </div>

                            {/* Public Toggle */}
                            <div className="pt-4 border-t border-purple-100">
                                <label className="text-purple-900 font-bold text-sm mb-1 block ml-1">是否公开</label>
                                <p className="text-[10px] text-slate-500 leading-tight mb-3 ml-1">
                                    选择公开，角色将被发布到广场供其他用户选择和使用。不公开角色则仅供个人使用。
                                </p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setForm({...form, isPublic: true})}
                                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all font-cute flex items-center justify-center gap-2 ${form.isPublic ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-500 border border-purple-100'}`}
                                    >
                                        <Globe className="w-4 h-4" /> 公开
                                    </button>
                                    <button 
                                        onClick={() => setForm({...form, isPublic: false})}
                                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all font-cute flex items-center justify-center gap-2 ${!form.isPublic ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-500 border border-purple-100'}`}
                                    >
                                        <Lock className="w-4 h-4" /> 不公开
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
      </main>

      {/* Mobile-Only Bottom Floating Button */}
      <div className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md p-4 z-40 border-t border-purple-50 md:hidden">
        <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-purple-300 active:scale-95 transition-transform flex items-center justify-center tracking-widest font-cute text-lg">
            <Sparkles className="w-5 h-5 text-yellow-300 mr-2 animate-pulse" /> 唤醒角色
        </button>
      </div>

    </div>
  );
}