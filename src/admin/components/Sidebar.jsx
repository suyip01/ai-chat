import React, { useState, useEffect } from 'react';
import { adminsAPI } from '../api.js';
import { Sparkles, LogOut, FileText, Users, UserCog, Settings, ChevronDown, ChevronRight, Bot, User, Cpu, Database, Shield } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout, username, onEditProfile }) => {
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

  const [showEdit, setShowEdit] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const submitEdit = async () => {
    const payload = {};
    if (newNickname && newNickname.trim()) payload.nickname = newNickname.trim();
    if (pwd1) {
      if (pwd1 !== pwd2) return;
      payload.password = pwd1;
    }
    try { await adminsAPI.updateMe(payload); setShowEdit(false); setNewNickname(''); setPwd1(''); setPwd2(''); } catch {}
  };
  return (
    <div className="w-16 xl:w-56 glass-nav h-screen fixed left-0 top-0 flex flex-col z-20 transition-all duration-300" style={{ backgroundColor: '#f4f6fb' }}>
      <div className="p-4 xl:p-8 flex items-center justify-center xl:justify-start gap-3">
        <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
          <Sparkles size={18} />
        </div>
        <span className="text-xl font-cute text-pink-900 tracking-wide hidden xl:block">Linksurge Admin</span>
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
                ? 'bg-pink-100 text-pink-700 shadow-sm'
                : 'text-gray-500 hover:bg-white/50 hover:text-pink-600'
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
                          ? 'bg-pink-200/50 text-pink-800'
                          : 'text-gray-400 hover:text-pink-600 hover:bg-white/30'
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
      <div className="p-4 border-t border-pink-100">
        <div className="w-full flex xl:flex-row flex-col items-center xl:justify-start justify-center gap-3">
          <div className="group relative" onClick={() => onEditProfile && onEditProfile()}>
            <SidebarAvatar username={username} />
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full -top-2 bg-pink-700 text-white text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {username}
            </div>
          </div>
          <button onClick={onLogout} className="w-full xl:flex-1 flex items-center justify-center xl:justify-start gap-3 px-2 xl:px-4 py-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors font-bold text-sm">
            <LogOut size={18} className="flex-shrink-0" />
            <span className="hidden xl:block">退出登录</span>
          </button>
        </div>
      </div>
      {showEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <div className="font-bold mb-4 text-pink-900">修改资料</div>
            <div className="space-y-3">
              <div>
                <input type="text" placeholder={`昵称（当前：${username}）`} value={newNickname} onChange={e => setNewNickname(e.target.value)} className="dream-input w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-700" />
              </div>
              <div>
                <input type="password" placeholder="新密码" value={pwd1} onChange={e => setPwd1(e.target.value)} className="dream-input w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-700" />
              </div>
              <div>
                <input type="password" placeholder="再次输入新密码" value={pwd2} onChange={e => setPwd2(e.target.value)} className="dream-input w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-700" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600" onClick={() => { setShowEdit(false); setNewNickname(''); setPwd1(''); setPwd2(''); }}>取消</button>
              <button className="px-4 py-2 rounded-xl bg-pink-500 text-white" onClick={submitEdit} disabled={!newNickname.trim() && !pwd1}>保存</button>
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-slate-300"></div>
    </div>
      )}
    </div>
  );
};

export default Sidebar;

const SidebarAvatar = ({ username }) => {
  const [avatar, setAvatar] = useState('');
  useEffect(() => {
    let mounted = true;
    adminsAPI.getMyAvatar().then(r => { if (mounted) setAvatar(r?.avatar || '/uploads/avatars/default_admin.jpg'); }).catch(() => { if (mounted) setAvatar('/uploads/avatars/default_admin.jpg'); });
    return () => { mounted = false; };
  }, [username]);
  return (
    <div className="group relative w-8 h-8 rounded-full overflow-hidden border border-pink-200 bg-white flex items-center justify-center">
      {avatar ? (<img src={avatar} alt={username} className="w-full h-full object-cover" />) : (<User size={16} className="text-pink-500" />)}
    </div>
  );
};
