import React, { useState, useEffect } from 'react';
import { Sparkles, LogOut, FileText, Users, UserCog, Settings, ChevronDown, ChevronRight, Bot, User, Cpu, Database, Shield } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout, username }) => {
  const [expandedMenus, setExpandedMenus] = useState(['characters', 'settings']);

  const menuItems = [
    { id: 'templates', label: '提示词模版', icon: FileText },
    {
      id: 'characters',
      label: '角色管理',
      icon: Users,
      subItems: [
        { id: 'official_characters', label: '官方角色', icon: Bot },
        { id: 'user_characters', label: '用户角色', icon: User },
      ]
    },
    { id: 'users', label: '用户管理', icon: UserCog },
    {
      id: 'settings',
      label: '系统设置',
      icon: Settings,
      subItems: [
        { id: 'model_settings', label: '模型设置', icon: Cpu },
        ...(username === 'admin' ? [
          { id: 'model_manage', label: '模型管理', icon: Database },
          { id: 'admin_accounts', label: '管理员账号', icon: Shield },
        ] : [])
      ]
    },
  ];

  // Ensure the submenu containing the active tab is always expanded
  useEffect(() => {
    const activeParent = menuItems.find(item =>
      item.subItems?.some(sub => sub.id === activeTab)
    );

    if (activeParent) {
      setExpandedMenus(prev => {
        if (!prev.includes(activeParent.id)) {
          return [...prev, activeParent.id];
        }
        return prev;
      });
    }
  }, [activeTab]);

  const toggleMenu = (id) => {
    setExpandedMenus(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleMouseEnter = (id) => {
    setExpandedMenus(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleMouseLeave = (id) => {
    // Check if this menu contains the active tab
    const item = menuItems.find(i => i.id === id);
    const hasActiveSubItem = item?.subItems?.some(sub => sub.id === activeTab);

    // If it doesn't contain the active tab, collapse it
    if (!hasActiveSubItem) {
      setExpandedMenus(prev => prev.filter(x => x !== id));
    }
  };

  const handleItemClick = (item) => {
    if (item.subItems) {
      toggleMenu(item.id);
    } else {
      setActiveTab(item.id);
      // When clicking a top-level item, collapse others but keep the active one if it was a submenu?
      // Requirement: "When clicking on other first-level directories, default expanded secondary directories will be put away"
      // Requirement: "When right side page belongs to a secondary directory, the secondary directory will not be put away"
      // If we are switching TO a top-level item, the "right side page" is NO LONGER a secondary directory.
      // So we can collapse everything.
      setExpandedMenus([]);
    }
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
          <div
            key={item.id}
            onMouseEnter={() => item.subItems && handleMouseEnter(item.id)}
            onMouseLeave={() => item.subItems && handleMouseLeave(item.id)}
          >
            <button
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center justify-center xl:justify-start gap-3 px-2 xl:px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${(activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab)))
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-500 hover:bg-white/50 hover:text-purple-600'
                }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className="hidden xl:block flex-1 text-left">{item.label}</span>
              {item.subItems && (
                <span className="hidden xl:block transition-transform duration-300">
                  {expandedMenus.includes(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
            </button>

            {/* Elastic/Smooth Animation Container */}
            {item.subItems && (
              <div
                className={`grid transition-all duration-300 ease-in-out ${expandedMenus.includes(item.id)
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="mt-1 space-y-1 xl:pl-4">
                    {item.subItems.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(sub.id);
                        }}
                        className={`w-full flex items-center justify-center xl:justify-start gap-2 px-2 xl:px-4 py-2.5 rounded-xl transition-all duration-300 text-xs font-bold ${activeTab === sub.id
                          ? 'bg-purple-200/50 text-purple-800'
                          : 'text-gray-400 hover:text-purple-600 hover:bg-white/30'
                          }`}
                      >
                        {sub.icon ? (
                          <sub.icon size={16} className="flex-shrink-0 hidden xl:block" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 hidden xl:block"></span>
                        )}
                        <span className="hidden xl:block">{sub.label}</span>
                        {/* Icon only mode fallback */}
                        <span className="xl:hidden">
                          {sub.icon ? <sub.icon size={14} /> : sub.label.substring(0, 1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-purple-100">
        <div className="w-full flex xl:flex-row flex-col items-center xl:justify-start justify-center gap-3">
          <div className="group relative w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
            <User size={16} />
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full -top-2 bg-purple-700 text-white text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {username}
            </div>
          </div>
          <button onClick={onLogout} className="w-full xl:flex-1 flex items-center justify-center xl:justify-start gap-3 px-2 xl:px-4 py-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors font-bold text-sm">
            <LogOut size={18} className="flex-shrink-0" />
            <span className="hidden xl:block">退出登录</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
