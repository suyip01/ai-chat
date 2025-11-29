import React from 'react';
import { Sparkles, LogOut, FileText, Users, UserCog, Settings } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'templates', label: '提示词模版', icon: FileText },
    { id: 'characters', label: '角色管理', icon: Users },
    { id: 'users', label: '用户管理', icon: UserCog },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  return (
    <div className="w-64 glass-nav h-screen fixed left-0 top-0 flex flex-col z-20">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white">
          <Sparkles size={18} />
        </div>
        <span className="text-xl font-cute text-purple-900 tracking-wide">Cute Admin</span>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${
              activeTab === item.id ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-white/50 hover:text-purple-600'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-purple-100">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors font-bold text-sm">
          <LogOut size={18} />
          退出登录
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

