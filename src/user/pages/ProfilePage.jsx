import React from 'react';
import { Bell, Megaphone, Settings, ChevronRight, User, Plus, Heart } from 'lucide-react';

const ProfilePage = () => {
    return (
        <div className="pb-24 min-h-full">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between border-b border-purple-50/50">
                <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-800">MY</h1>
                <div className="flex gap-4 text-slate-600">
                    <div className="relative hover:text-purple-600 transition-colors cursor-pointer">
                        <Bell size={24} strokeWidth={1.5} />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="relative hover:text-purple-600 transition-colors cursor-pointer">
                        <Megaphone size={24} strokeWidth={1.5} />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="hover:text-purple-600 transition-colors cursor-pointer">
                        <Settings size={24} strokeWidth={1.5} />
                    </div>
                </div>
            </header>

            <div className="p-4 max-w-md mx-auto space-y-6">
                {/* 用户资料卡片 */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-500/5 border border-purple-50">
                    {/* 头像行 */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 overflow-hidden ring-4 ring-purple-50">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full" alt="avatar" />
                            </div>
                            <div>
                                <div className="font-bold text-xl text-slate-800 mb-1">user_58085</div>
                                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md inline-block">ID: 8837219</div>
                            </div>
                        </div>
                        <button className="bg-slate-50 hover:bg-purple-50 px-4 py-2 rounded-full text-xs text-slate-600 hover:text-purple-600 font-bold transition-colors border border-slate-100 hover:border-purple-100">
                            编辑资料
                        </button>
                    </div>

                    {/* 数据统计 */}
                    <div className="flex justify-between items-center px-4 mb-8 bg-slate-50/50 rounded-2xl py-4">
                        <div className="flex items-center gap-3 flex-1 justify-center border-r border-slate-200/60">
                            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-500">
                                <div className="w-4 h-5 bg-pink-400 rounded-sm"></div>
                            </div>
                            <div>
                                <div className="font-bold text-xl text-slate-800">1</div>
                                <div className="text-[10px] text-slate-400 font-medium">我的果酱</div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 ml-2" />
                        </div>
                        <div className="flex items-center gap-3 flex-1 justify-center">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-500">
                                <div className="w-5 h-3 bg-purple-400 rotate-45 rounded-sm"></div>
                            </div>
                            <div>
                                <div className="font-bold text-xl text-slate-800">0</div>
                                <div className="text-[10px] text-slate-400 font-medium">我的积分</div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 ml-2" />
                        </div>
                    </div>

                    {/* 列表选项 */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <span className="font-bold text-sm text-slate-700 group-hover:text-purple-700">会员</span>
                            <div className="flex items-center gap-2">
                                <span className="text-purple-500 text-xs font-bold bg-purple-50 px-2 py-1 rounded-md">订阅</span>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-300" />
                            </div>
                        </div>
                        <div className="w-full h-[1px] bg-slate-50 mx-3"></div>
                        <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <span className="font-medium text-sm text-slate-600 group-hover:text-purple-700">已购内容</span>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-300" />
                        </div>
                    </div>
                </div>

                {/* 档案与喜欢 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center gap-3 border border-slate-50 group">
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                            <User size={24} fill="currentColor" />
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-rose-500">多重档案</span>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center gap-3 border border-slate-50 group">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                            <Heart size={24} />
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">喜欢</span>
                    </div>
                </div>

                {/* 我的角色 Section */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>
                            我的角色
                        </h3>
                        <button className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-105 transition-all">
                            <Plus size={24} />
                        </button>
                    </div>

                    <div className="flex gap-3 mb-6 px-2">
                        <button className="bg-white border border-slate-100 px-4 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-100 transition-colors flex items-center gap-1">
                            全部 <ChevronRight size={12} className="rotate-90" />
                        </button>
                        <button className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                            最新 <ChevronRight size={12} className="rotate-90" />
                        </button>
                    </div>

                    {/* 空状态占位 */}
                    <div className="h-48 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-3 hover:border-purple-100 hover:bg-purple-50/10 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={24} className="text-slate-300 group-hover:text-purple-300" />
                        </div>
                        <span className="text-sm font-medium group-hover:text-purple-400">暂无角色，点击创建</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
