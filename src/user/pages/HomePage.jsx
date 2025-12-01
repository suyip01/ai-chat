import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, BookOpen, RotateCw, Heart, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { userCharactersAPI } from '../api.js';

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
    },
    {
        id: 3,
        title: "被遗忘的时光花园",
        subtitle: "寻找记忆碎片的奇幻之旅",
        tags: ["奇幻", "冒险", "治愈"],
        likes: "856",
        reads: 42,
        imageColor: "bg-purple-100"
    },
    {
        id: 4,
        title: "猫咪咖啡馆的午后",
        subtitle: "与猫耳少年的甜蜜邂逅",
        tags: ["恋爱", "萌宠", "日常"],
        likes: "3,421",
        reads: 128,
        imageColor: "bg-orange-100"
    }
];

const HomePage = () => {
    const [activeTab, setActiveTab] = React.useState(() => sessionStorage.getItem('home_active_tab') || 'game');
    const navigate = useNavigate();
    const location = useLocation();



    const [activeTag, setActiveTag] = React.useState(null);
    const [filteredChars, setFilteredChars] = React.useState([]);
    const [loadingChars, setLoadingChars] = React.useState(false);
    const [errorText, setErrorText] = React.useState('');
    const [publishedChars, setPublishedChars] = React.useState([]);
    const [publishedCacheChecked, setPublishedCacheChecked] = React.useState(false);

    const isReload = React.useMemo(() => {
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav && nav.type) return nav.type === 'reload';
        } catch {}
        return performance && performance.navigation && performance.navigation.type === 1;
    }, []);

    const loadByTag = async (tag) => {
        setActiveTag(tag);
        setLoadingChars(true);
        setErrorText('');
        try {
            const d = await userCharactersAPI.list({ tag });
            setFilteredChars(d.items || []);
        } catch (e) { setErrorText('加载失败'); }
        finally { setLoadingChars(false); }
    };

    React.useEffect(() => {
        if (!isReload) {
            try {
                const cached = sessionStorage.getItem('home_published_chars');
                if (cached) {
                    const arr = JSON.parse(cached);
                    if (Array.isArray(arr) && arr.length) setPublishedChars(arr);
                }
            } catch {}
        }
        setPublishedCacheChecked(true);
    }, [isReload]);

    React.useEffect(() => {
        const fetchInitial = async () => {
            setLoadingChars(true);
            setErrorText('');
            try {
                const d = await userCharactersAPI.list({ limit: 24 });
                setPublishedChars(d.items || []);
            } catch (e) { setErrorText('加载失败'); }
            finally { setLoadingChars(false); }
        };
        if (publishedCacheChecked && activeTab === 'character' && (isReload || publishedChars.length === 0)) fetchInitial();
    }, [activeTab, publishedCacheChecked, isReload]);

    React.useEffect(() => {
        if (publishedChars && publishedChars.length) {
            try { sessionStorage.setItem('home_published_chars', JSON.stringify(publishedChars)); } catch { }
        }
    }, [publishedChars]);

    React.useEffect(() => {
        sessionStorage.setItem('home_active_tab', activeTab);
    }, [activeTab]);

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sec = params.get('section');
        if (sec === 'character') setActiveTab('character');
    }, [location.search]);

    return (
        <div className="h-full flex flex-col">
            {/* 顶部 Tab 和 搜索 - 固定在顶部 */}
            <header className="flex-shrink-0 bg-white/95 backdrop-blur-md px-6 h-16 w-full flex items-center justify-between border-b border-purple-50/50 shadow-sm">
                <div className="flex gap-8 text-lg font-bold">
                    <button
                        onClick={() => { if (activeTab !== 'game') setActiveTab('game'); }}
                        className={`relative transition-colors ${activeTab === 'game' ? 'text-slate-800' : 'text-gray-400 hover:text-slate-600'}`}
                    >
                        故事
                        {activeTab === 'game' && (
                            <span className="absolute -bottom-5 left-0 w-full h-1 bg-purple-500 rounded-t-full"></span>
                        )}
                    </button>
                    <button
                        onClick={() => { if (activeTab !== 'character') setActiveTab('character'); }}
                        className={`relative transition-colors ${activeTab === 'character' ? 'text-slate-800' : 'text-gray-400 hover:text-slate-600'}`}
                    >
                        角色
                        {activeTab === 'character' && (
                            <span className="absolute -bottom-5 left-0 w-full h-1 bg-purple-500 rounded-t-full"></span>
                        )}
                    </button>
                </div>
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 hover:bg-purple-100 transition-colors cursor-pointer">
                    <Search size={20} />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto relative w-full hide-scrollbar">
                <div className="relative w-full h-full">
                    <div className={`transition-opacity duration-200 ${activeTab==='game' ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        <>
                                {/* Hero Banner */}
                                <div className="relative w-full aspect-[4/5] bg-slate-900 overflow-hidden shadow-xl shadow-purple-900/10 group cursor-pointer">
                                    {/* 模拟背景图 */}
                                    <img
                                        src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2550&auto=format&fit=crop"
                                        alt="Banner"
                                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent" />

                                    {/* 内容文字 */}
                                    <div className="absolute bottom-8 left-6 md:left-10 right-6 text-white max-w-2xl">
                                        <div className="flex gap-3 mb-3 text-xs font-medium opacity-90">
                                            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                                                <BookOpen size={14} /> 6
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                                                <RotateCw size={14} /> 2
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-bold leading-tight mb-3 tracking-tight">
                                            未婚夫出轨了<br className="md:hidden" />为了复仇嫁给他弟弟
                                        </h2>
                                        <p className="text-sm text-gray-200 line-clamp-2 opacity-90">
                                            纠缠的四角关系中藏着他长久的暗恋，在这场豪门恩怨中，谁才是真正的赢家？
                                        </p>
                                    </div>

                                    {/* 右上角计数 */}
                                    <div className="absolute top-6 right-6 bg-black/30 px-3 py-1.5 rounded-full text-xs font-medium text-white backdrop-blur-md border border-white/10">
                                        1 / 13
                                    </div>
                                </div>

                                {/* Section 2: 推荐列表 */}
                                <div className="mt-10 md:mt-12">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                            为你推荐
                                        </h3>
                                        <button className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors">
                                            查看全部 <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    {/* Grid Layout for Desktop, Scroll for Mobile */}
                                    <div className="grid grid-cols-1 gap-6">
                                        {HOME_RECOMMENDATIONS.map(item => (
                                            <div key={item.id} className="group cursor-pointer">
                                                <div className={`w-full aspect-[4/3] ${item.imageColor} rounded-2xl mb-4 relative overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300`}>
                                                    <img
                                                        src={`https://images.unsplash.com/photo-${item.id === 1 ? '1634926878763-86af3f06ba83' : '1515462277174-2a669cd3bb44'}?q=80&w=1000&auto=format&fit=crop`}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        alt="cover"
                                                    />
                                                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1.5">
                                                        <BookOpen size={12} /> {item.reads}
                                                    </div>
                                                    {item.likes && (
                                                        <div className="absolute bottom-3 right-3 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-rose-500/20">
                                                            <Heart size={12} fill="white" /> {item.likes}
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-base leading-snug mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 mb-3 line-clamp-1">{item.subtitle}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.tags.map(tag => (
                                                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                        </>
                    </div>
                    <div className={`transition-opacity duration-200 ${activeTab==='character' ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        <> {/* Character Tab Content */}
                                <div className="mt-2">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                            热门
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 px-2">
                                        {publishedChars.map(char => (
                                            <div key={char.id} className="group cursor-pointer flex flex-col gap-2">
                                                {/* Avatar Container - Square with Rounded Corners */}
                                                <div onClick={() => navigate(`/characters/${char.id}`)} className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform">
                                                    {char.avatar ? (
                                                        <img
                                                            src={char.avatar}
                                                            alt={char.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">{char.name ? char.name[0] : '?'}</div>
                                                    )}
                                                    {/* Gradient Overlay for Text Readability */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                                                    {/* Name at Bottom Left */}
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        <h4 className="text-white font-bold text-lg truncate shadow-sm">{char.name}</h4>
                                                    </div>

                                                    {/* Status Indicator */}
                                                    {char.status && (
                                                        <div className={`absolute top-3 right-3 w-3 h-3 border-2 border-white/20 rounded-full ${char.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                    )}
                                                </div>

                                                {/* Info Below Avatar */}
                                                <div className="space-y-1 px-1">
                                                    {/* Description - Single Line Truncated */}
                                                    <p className="text-xs text-slate-500" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{char.intro || ''}</p>

                                                    {/* Tags - Single Line Truncated */}
                                                    <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                                                        {(char.tags || []).map(tag => (
                                                            <button key={tag} onClick={() => loadByTag(tag)} className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0 hover:bg-slate-200">
                                                                #{tag}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {!loadingChars && publishedChars.length === 0 && (
                                            <div className="col-span-2 text-sm text-slate-400">暂无角色</div>
                                        )}
                                    </div>
                                </div>
                                {activeTag && (
                                    <div className="mt-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                                按标签筛选：#{activeTag}
                                            </h3>
                                        </div>
                                        {loadingChars && <div className="text-sm text-slate-500">加载中...</div>}
                                        {errorText && <div className="text-sm text-red-500">{errorText}</div>}
                                        {!loadingChars && !errorText && (
                                            <div className="grid grid-cols-2 gap-3 px-2">
                                                {filteredChars.map(item => (
                                                    <div key={item.id} className="group cursor-pointer flex flex-col gap-2">
                                                        <div onClick={() => navigate(`/characters/${item.id}`)} className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform">
                                                            {item.avatar ? (
                                                                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">{item.name ? item.name[0] : '?'}</div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1 px-1">
                                                            <p className="text-xs text-slate-500" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{(item.intro && item.intro.trim()) ? item.intro : '暂无简介\n暂无简介'}</p>
                                                            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                                                                {(item.tags || []).map(tag => (
                                                                    <span key={tag} className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">#{tag}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                        </>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
