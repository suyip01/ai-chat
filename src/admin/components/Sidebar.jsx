import React, { useState, useEffect } from 'react';
import { Sparkles, LogOut, FileText, Users, UserCog, Settings, ChevronDown, ChevronRight } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const [expandedMenus, setExpandedMenus] = useState(['characters']);

  const menuItems = [
    { id: 'templates', label: '提示词模版', icon: FileText },
    {
      id: 'characters',
      label: '角色管理',
      icon: Users,
      subItems: [
        { id: 'official_characters', label: '官方角色' },
        { id: 'user_characters', label: '用户角色' },
      ]
    },
    { id: 'users', label: '用户管理', icon: UserCog },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  const toggleMenu = (id) => {
    setExpandedMenus(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="w-16 xl:w-56 glass-nav h-screen fixed left-0 top-0 flex flex-col z-20 transition-all duration-300">
      <div className="p-4 xl:p-8 flex items-center justify-center xl:justify-start gap-3">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
          <Sparkles size={18} />
        </div>
        <span className="text-xl font-cute text-purple-900 tracking-wide hidden xl:block">Linksurge Admin</span>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.subItems) {
                  toggleMenu(item.id);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-center xl:justify-start gap-3 px-2 xl:px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${(activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab)))
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-500 hover:bg-white/50 hover:text-purple-600'
                }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className="hidden xl:block flex-1 text-left">{item.label}</span>
              {item.subItems && (
                <span className="hidden xl:block">
                  {expandedMenus.includes(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
            </button>
            {item.subItems && expandedMenus.includes(item.id) && (
              <div className="mt-1 space-y-1 xl:pl-4">
                {item.subItems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveTab(sub.id)}
                    className={`w-full flex items-center justify-center xl:justify-start gap-2 px-2 xl:px-4 py-2.5 rounded-xl transition-all duration-300 text-xs font-bold ${activeTab === sub.id
                      ? 'bg-purple-200/50 text-purple-800'
                      : 'text-gray-400 hover:text-purple-600 hover:bg-white/30'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 hidden xl:block"></span>
                    <span className="hidden xl:block">{sub.label}</span>
                    {/* Icon only mode fallback */}
                    <span className="xl:hidden text-[10px]">{sub.label.substring(0, 1)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-purple-100">
        <button onClick={onLogout} className="w-full flex items-center justify-center xl:justify-start gap-3 px-2 xl:px-4 py-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors font-bold text-sm">
          <LogOut size={18} className="flex-shrink-0" />
          <span className="hidden xl:block">退出登录</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

