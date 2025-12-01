import React from 'react';
import { Filter, User, Heart } from 'lucide-react';

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

const ChatPage = () => {
    const extra = React.useMemo(() => {
        try { return JSON.parse(localStorage.getItem('chat_sessions') || '[]'); } catch { return []; }
    }, []);
    const chats = [...extra, ...CHAT_DATA];
    return (
        <div className="pb-24 min-h-full">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between border-b border-purple-50/50">
                <h1 className="text-2xl font-bold text-slate-800">聊天</h1>
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 hover:bg-purple-100 transition-colors cursor-pointer">
                    <Filter size={20} />
                </div>
            </header>

            <div className="p-4 max-w-md mx-auto">
                {/* 签到 Banner */}
                <div className="mb-6">
                    <div className="w-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-3xl p-6 text-white flex justify-between items-center shadow-xl shadow-purple-500/20 relative overflow-hidden group">
                        {/* 装饰圆圈 */}
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="absolute left-10 bottom-0 w-20 h-20 bg-indigo-500/30 rounded-full blur-xl"></div>

                        <div className="z-10 relative">
                            <div className="font-bold text-lg mb-1 flex items-center gap-2">
                                每日签到活动
                                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">HOT</span>
                            </div>
                            <div className="text-purple-100 text-sm mb-2">每天签到并获得10果酱</div>
                            <div className="text-[10px] opacity-70">(* 韩国标准时间00:00至23:59之间可领取一次)</div>
                        </div>
                        <button className="z-10 bg-white text-purple-600 text-sm font-bold px-6 py-2.5 rounded-full whitespace-nowrap shadow-lg hover:bg-purple-50 transition-colors transform hover:scale-105 duration-200">
                            立即签到
                        </button>
                    </div>
                </div>

                {/* 聊天列表 */}
                <div className="space-y-2">
                    {chats.map((chat) => (
                        <div key={chat.id} className="flex gap-4 p-4 hover:bg-white hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 cursor-pointer rounded-2xl border border-transparent hover:border-purple-50 group">
                            {/* 头像 */}
                            <div className="relative flex-shrink-0">
                                <div className={`w-14 h-14 rounded-full ${chat.avatarColor} overflow-hidden ring-4 ring-white shadow-sm group-hover:ring-purple-50 transition-all`}>
                                    <img
                                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${chat.name}`}
                                        alt={chat.name}
                                        className="w-full h-full object-cover bg-gray-200"
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-rose-400 to-pink-500 p-1 rounded-full border-2 border-white shadow-sm">
                                    <User size={10} fill="white" className="text-white" />
                                </div>
                                {chat.unread && (
                                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></div>
                                )}
                            </div>

                            {/* 内容 */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 text-base group-hover:text-purple-700 transition-colors">{chat.name}</span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-md font-medium flex items-center gap-1">
                                            <Heart size={8} fill="#64748b" /> {chat.tag}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">12:30</span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-1 leading-relaxed group-hover:text-slate-600">
                                    {chat.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
