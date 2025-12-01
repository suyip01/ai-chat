import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    MessageCircle,
    User,
    Settings,
    LogOut
} from 'lucide-react';

const NavBar = ({ activeTab, setActiveTab }) => {
    const navigate = useNavigate();
    const navItems = [
        { id: 'home', icon: Home, label: '主页' },
        { id: 'chat', icon: MessageCircle, label: '聊天' },
        { id: 'my', icon: User, label: '我的' },
    ];

    return (
        <nav className={`
            fixed bottom-0 left-0 right-0 w-full z-50
            flex flex-row justify-center items-center pointer-events-none
        `}>
            <div className="pointer-events-auto mx-auto max-w-[430px] w-full h-16 bg-white/80 backdrop-blur-xl border-t border-purple-100 shadow-[0_-4px_20px_rgba(139,92,246,0.05)] flex flex-row justify-around items-center px-4">
                {/* PC端 Logo区域 (仅在MD以上显示) */}
                <div className="hidden w-full justify-center px-4 mb-6">
                    <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Linksurge
                    </div>
                </div>

                <div className="flex flex-row w-full justify-around md:justify-between gap-1 md:gap-2">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { if (activeTab !== item.id) { navigate('/'); setActiveTab(item.id); } }}
                                className={`
                                flex flex-col md:flex-row items-center justify-center md:justify-start
                                w-full md:flex-1 md:w-auto md:px-3 md:py-2.5 rounded-xl
                                transition-all duration-200 group
                                ${isActive
                                        ? 'text-purple-600 md:bg-purple-50'
                                        : 'text-gray-400 hover:text-purple-400 hover:bg-purple-50/50'
                                    }
                            `}
                            >
                                <div className={`
                                p-1 rounded-xl transition-all duration-300
                                ${isActive ? '-translate-y-1 md:translate-y-0' : 'group-hover:-translate-y-0.5 md:group-hover:translate-y-0'} 
                            `}>
                                    <item.icon
                                        size={24}
                                        className={`transition-all duration-300 ${isActive ? "fill-purple-600 scale-110" : "scale-100"}`}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                </div>
                                <span className={`
                                text-[10px] md:text-sm md:ml-3 mt-1 md:mt-0 font-medium
                                transition-all duration-200
                                ${isActive ? 'font-bold' : ''}
                            `}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Desktop Bottom Actions */}
                <div className="hidden flex-col w-full mt-auto mb-6 px-3 gap-2">
                    <button className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-xl transition-all w-full">
                        <Settings size={20} />
                        <span className="text-sm font-medium">设置</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
