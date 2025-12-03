import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { adminsAPI } from './api.js';
import StyleInjector from './components/StyleInjector.jsx';
import LoginPage from './components/LoginPage.jsx';
import { ToastProvider } from './Toast.jsx';
import Sidebar from './components/Sidebar.jsx';
import TemplatesView from './templates/TemplatesView.jsx';
import CharacterManagement from './characters/CharacterManagement.jsx';
import UsersView from './users/UsersView.jsx';
import ModelSettingsView from './settings/ModelSettingsView.jsx';
import ModelManageView from './settings/ModelManageView.jsx';
import AdminAccountsView from './settings/AdminAccountsView.jsx';

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [username, setUsername] = useState('');
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

  const navigate = (path) => {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', path);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    const user = localStorage.getItem('admin_username');
    const path = window.location.pathname;
    if (token) {
      setIsLoggedIn(true);
      if (user) setUsername(user);
      setActiveTab('templates');
      if (path !== '/super-admin/sysprompt') navigate('/super-admin/sysprompt');
    } else {
      setIsLoggedIn(false);
      if (path !== '/super-admin/login') navigate('/super-admin/login');
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <>
        <StyleInjector />
        <ToastProvider>
          <LoginPage onLogin={() => {
            setIsLoggedIn(true);
            const user = localStorage.getItem('admin_username');
            if (user) setUsername(user);
            setActiveTab('templates');
            navigate('/super-admin/sysprompt');
          }} />
        </ToastProvider>
      </>
    );
  }
  return (
    <div className="flex min-h-screen bg-white">
      <StyleInjector />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'templates') navigate('/super-admin/sysprompt');
        }}
        onLogout={() => {
          setIsLoggedIn(false);
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          localStorage.removeItem('admin_username');
          navigate('/super-admin/login');
        }}
        username={username}
        onEditProfile={() => setShowEdit(true)}
      />
      <main className="flex-1 ml-16 xl:ml-56 p-8 relative z-10 transition-all duration-300 h-screen overflow-y-auto">
        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-20">
          <Sparkles size={120} className="text-pink-300" />
        </div>
        {activeTab === 'templates' && <TemplatesView />}
        {(activeTab === 'characters' || activeTab === 'official_characters') && <CharacterManagement creatorRole="admin_role" />}
        {activeTab === 'user_characters' && <CharacterManagement creatorRole="user_role" />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'model_settings' && <ModelSettingsView />}
        {activeTab === 'model_manage' && username === 'admin' && <ModelManageView />}
        {activeTab === 'admin_accounts' && username === 'admin' && <AdminAccountsView />}
      </main>
      <div className="ambient-bg"></div>
      {showEdit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
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
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
