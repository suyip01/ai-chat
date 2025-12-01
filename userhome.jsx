import React, { useState, useEffect } from 'react';
import {
    Home,
    MessageCircle,
    Heart,
    User,
    Search,
    Bell,
    Megaphone,
    Settings,
    ChevronRight,
    Plus,
    Filter,
    BookOpen,
    RotateCw,
    MoreHorizontal
} from 'lucide-react';

/**
 * 模拟数据 - 聊天列表
 */
const CHAT_DATA = [
    {
        id: 1,
        name: "陆子南",
        message: "*陆子南猛地收回了手，仿佛被烫到一般，眼底闪过一丝不易察觉的慌乱。他冷冷地...",
        tag: "熟人",
        avatarColor: "bg-slate-700",
        unread: false
    },
    {
        id: 2,
        name: "Ling Jingyue",
        message: "「谁在那里？」一阵寒风吹过，我微微蹙眉，琥珀金色的眼眸扫向你。后山药园，闲人免进...",
        tag: "熟人",
        avatarColor: "bg-gray-400",
        unread: false
    },
    {
        id: 3,
        name: "黎玄",
        message: "*黎玄的眼神里闪过一丝极细微的、短暂的思索，那双灰蓝色的眼眸依旧平静，却像是...",
        tag: "熟人",
        avatarColor: "bg-indigo-900",
        unread: true
    },
    {
        id: 4,
        name: "许修竹 & 许清越",
        message: "*许修竹开场* ...",
        tag: "熟人",
        avatarColor: "bg-amber-700",
        unread: false
    }
];

/**
 * 模拟数据 - 首页推荐
 */
const HOME_RECOMMENDATIONS = [
    {
        id: 1,
        title: "......都跟你说了电影里都是演出来的嘛",
        subtitle: "与天然系反派演员的同居日常",
        tags: ["现代题材", "反差萌", "偶像/名人"],
        likes: "2,246",
        reads: 7,
        imageColor: "bg-blue-100"
    },
    {
        id: 2,
        title: "系统消息:新生活开始。需要确认任务。",
        subtitle: "帮助邻居解决...",
        tags: ["治愈/疗愈"],
        likes: "1,092",
        reads: 17,
        imageColor: "bg-gray-200"
    }
];

/**
 * 组件：底部/左侧 导航栏
 */
const Navigation = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'home', icon: Home, label: '主页' },
        { id: 'chat', icon: MessageCircle, label: '聊天' },
        { id: 'couple', icon: Heart, label: 'Couple' },
        { id: 'my', icon: User, label: 'MY' },
    ];

    return (
        <nav className={`
      bg-white border-t md:border-t-0 md:border-r border-gray-100
      fixed bottom-0 left-0 w-full h-16 
      md:relative md:w-24 md:h-full lg:w-64 md:flex-col md:items-start md:pt-10
      flex flex-row justify-around items-center z-50
      transition-all duration-300
    `}>
            {/* PC端 Logo区域 (仅在MD以上显示) */}
            <div className="hidden md:flex w-full justify-center lg:justify-start lg:px-8 mb-8">
                <div className="text-2xl font-black text-rose-500">Lovey</div>
            </div>

            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`
              flex flex-col md:flex-row items-center justify-center md:justify-start
              w-full md:w-auto md:px-4 lg:px-8 md:py-4 md:mb-2
              ${isActive ? 'text-rose-500' : 'text-gray-400'}
              hover:text-rose-400 transition-colors
            `}
                    >
                        <div className={`
              p-1 rounded-xl transition-all
              ${isActive && 'md:bg-rose-50'} 
            `}>
                            <item.icon
                                size={24}
                                className={isActive ? "fill-rose-500" : ""}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                        </div>
                        <span className={`
              text-[10px] md:text-base md:ml-3 mt-1 md:mt-0 font-medium
              ${isActive ? 'md:font-bold' : ''}
            `}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

/**
 * 页面：首页 (Home)
 */
const HomeView = () => {
    return (
        <div className="pb-24 md:pb-10">
            {/* 顶部 Tab 和 搜索 */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm px-4 h-14 flex items-center justify-between">
                <div className="flex gap-6 text-lg font-bold">
                    <span className="text-black">游戏</span>
                    <span className="text-gray-400">角色</span>
                </div>
                <Search className="text-black" size={24} />
            </header>

            {/* Hero Banner (模拟第一张图的大图) */}
            <div className="px-4 mt-2">
                <div className="relative w-full aspect-[4/5] md:aspect-[21/9] bg-slate-800 rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
                    {/* 模拟背景图 */}
                    <img
                        src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2550&auto=format&fit=crop"
                        alt="Banner"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* 内容文字 */}
                    <div className="absolute bottom-6 left-4 right-4 text-white">
                        <div className="flex gap-3 mb-2 text-xs font-medium opacity-80">
                            <span className="flex items-center gap-1"><BookOpen size={14} /> 6</span>
                            <span className="flex items-center gap-1"><RotateCw size={14} /> 2</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-2">
                            未婚夫出轨了为了复仇嫁给他弟弟
                        </h2>
                        <p className="text-sm md:text-lg text-gray-300 line-clamp-1">
                            纠缠的四角关系中藏着他长久的暗恋
                        </p>
                    </div>

                    {/* 右上角计数 */}
                    <div className="absolute top-4 right-4 bg-black/40 px-2 py-1 rounded text-xs text-white backdrop-blur-md">
                        1/13
                    </div>
                </div>
            </div>

            {/* Section 2: 推荐列表 */}
            <div className="mt-8">
                <div className="px-4 flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">如果你需要一个只看着你的温柔男友</h3>
                    <ChevronRight className="text-gray-400" size={20} />
                </div>

                {/* 横向滚动容器 */}
                <div className="flex overflow-x-auto px-4 gap-4 pb-4 snap-x hide-scrollbar">
                    {HOME_RECOMMENDATIONS.map(item => (
                        <div key={item.id} className="min-w-[85%] md:min-w-[300px] snap-center">
                            <div className={`w-full aspect-video ${item.imageColor} rounded-xl mb-3 relative overflow-hidden`}>
                                <img
                                    src={`https://images.unsplash.com/photo-${item.id === 1 ? '1634926878763-86af3f06ba83' : '1515462277174-2a669cd3bb44'}?q=80&w=1000&auto=format&fit=crop`}
                                    className="w-full h-full object-cover"
                                    alt="cover"
                                />
                                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <BookOpen size={10} /> {item.reads}
                                </div>
                                {item.likes && (
                                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Heart size={10} fill="white" /> {item.likes}
                                    </div>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">{item.title}</h4>
                            <p className="text-xs text-gray-500 mb-2">{item.subtitle}</p>
                            <div className="flex flex-wrap gap-1">
                                {item.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * 页面：聊天 (Chat)
 */
const ChatView = () => {
    return (
        <div className="pb-24 md:pb-10 bg-white min-h-full">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm px-4 h-14 flex items-center justify-between border-b border-gray-50">
                <h1 className="text-xl font-bold text-black">聊天</h1>
                <Filter className="text-black" size={24} />
            </header>

            {/* 签到 Banner */}
            <div className="px-4 py-4">
                <div className="w-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-2xl p-4 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
                    {/* 装饰圆圈 */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

                    <div className="z-10">
                        <div className="font-bold text-base mb-0.5">每日签到活动</div>
                        <div className="font-bold text-base mb-1">每天签到并获得10果酱</div>
                        <div className="text-[10px] opacity-80">(* 韩国标准时间00:00至23:59之间可领取一次)</div>
                    </div>
                    <button className="z-10 bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                        签到
                    </button>
                </div>
            </div>

            {/* 聊天列表 */}
            <div className="px-4">
                {CHAT_DATA.map((chat) => (
                    <div key={chat.id} className="flex gap-3 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer rounded-lg px-2 -mx-2">
                        {/* 头像 */}
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-full ${chat.avatarColor} overflow-hidden ring-2 ring-gray-100`}>
                                <img
                                    src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${chat.name}`}
                                    alt={chat.name}
                                    className="w-full h-full object-cover bg-gray-200"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-rose-400 p-0.5 rounded-full border-2 border-white">
                                <User size={10} fill="white" className="text-white" />
                            </div>
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900 text-sm md:text-base">{chat.name}</span>
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[10px] rounded font-medium flex items-center gap-1">
                                    <Heart size={8} fill="#9ca3af" /> {chat.tag}
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                {chat.message}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * 页面：我的 (My)
 */
const MyView = () => {
    return (
        <div className="pb-24 md:pb-10 bg-gray-50 min-h-full">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm px-4 h-14 flex items-center justify-between">
                <h1 className="text-xl font-bold font-sans tracking-tight">MY</h1>
                <div className="flex gap-4">
                    <div className="relative">
                        <Bell size={24} strokeWidth={1.5} />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-gray-50"></div>
                    </div>
                    <div className="relative">
                        <Megaphone size={24} strokeWidth={1.5} />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-gray-50"></div>
                    </div>
                    <Settings size={24} strokeWidth={1.5} />
                </div>
            </header>

            <div className="px-4 space-y-4">
                {/* 用户资料卡片 */}
                <div className="bg-white rounded-3xl p-5 shadow-sm">
                    {/* 头像行 */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-rose-200 rounded-full flex items-center justify-center text-rose-500 overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full" alt="avatar" />
                            </div>
                            <span className="font-bold text-lg">user_58085</span>
                        </div>
                        <button className="bg-gray-100 px-3 py-1.5 rounded-full text-xs text-gray-500 font-medium">
                            我的个人资料
                        </button>
                    </div>

                    {/* 数据统计 */}
                    <div className="flex justify-between items-center px-4 mb-6">
                        <div className="flex items-center gap-2 flex-1 justify-center border-r border-gray-100">
                            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                                <div className="w-4 h-5 bg-pink-400 rounded-sm"></div>
                            </div>
                            <span className="font-bold text-lg text-rose-500">1</span>
                            <ChevronRight size={16} className="text-gray-300" />
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-center">
                            <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center">
                                <div className="w-5 h-3 bg-rose-400 rotate-45 rounded-sm"></div>
                            </div>
                            <span className="font-bold text-lg text-rose-500">0</span>
                            <ChevronRight size={16} className="text-gray-300" />
                        </div>
                    </div>

                    {/* 列表选项 */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pt-2">
                            <span className="font-bold text-sm">Lovey会员</span>
                            <div className="flex items-center gap-1 cursor-pointer">
                                <span className="text-rose-500 text-sm font-bold">订阅</span>
                                <ChevronRight size={16} className="text-gray-300" />
                            </div>
                        </div>
                        <div className="w-full h-[1px] bg-gray-100"></div>
                        <div className="flex justify-between items-center pb-2">
                            <span className="font-medium text-sm text-gray-700">已购内容</span>
                            <ChevronRight size={16} className="text-gray-300" />
                        </div>
                    </div>
                </div>

                {/* 档案与喜欢 */}
                <div className="bg-white rounded-3xl p-6 shadow-sm flex">
                    <div className="flex-1 flex flex-col items-center gap-2 border-r border-gray-100">
                        <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-400">
                            <User size={20} fill="currentColor" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">多重档案</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 border border-gray-100">
                            <User size={20} />
                        </div>
                        <span className="text-xs font-medium text-gray-600">喜欢</span>
                    </div>
                </div>

                {/* 我的角色 Section */}
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-gray-800">我的角色</h3>
                        <button className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-200 hover:bg-rose-600 transition-colors">
                            <Plus size={24} />
                        </button>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 mb-8">
                        <button className="bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                            全部 <ChevronRight size={12} className="rotate-90" />
                        </button>
                        <button className="flex items-center gap-1">
                            最新 <ChevronRight size={12} className="rotate-90" />
                        </button>
                    </div>

                    {/* 空状态占位 */}
                    <div className="h-40 flex items-center justify-center text-gray-300 text-sm">
                        暂无角色，点击右上角创建
                    </div>
                </div>
            </div>
        </div>
    );
};

const CoupleView = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
        <Heart size={64} className="mb-4 text-pink-200" fill="currentColor" />
        <p>Couple 页面开发中...</p>
    </div>
);

/**
 * 主应用组件
 */
const App = () => {
    const [activeTab, setActiveTab] = useState('home');

    // 内容区域根据 Tab 切换
    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <HomeView />;
            case 'chat': return <ChatView />;
            case 'couple': return <CoupleView />;
            case 'my': return <MyView />;
            default: return <HomeView />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden font-sans text-slate-800">

            {/* 导航栏逻辑：
        order-2 md:order-1 -> 移动端在下(Flex中排第2)，PC端在左(Flex中排第1)
      */}
            <div className="order-2 md:order-1 flex-shrink-0 z-50">
                <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            {/* 主内容区域：
        order-1 md:order-2 -> 移动端在上，PC端在右
      */}
            <main className="order-1 md:order-2 flex-1 h-full overflow-y-auto relative w-full scroll-smooth">
                <div className="max-w-4xl mx-auto h-full min-h-full bg-white md:shadow-lg md:border-x border-gray-100">
                    {renderContent()}
                </div>
            </main>

        </div>
    );
};

export default App;