import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import StyleInjector from './components/StyleInjector.jsx';
import LoginPage from './components/LoginPage.jsx';
import { ToastProvider } from './Toast.jsx';
import Sidebar from './components/Sidebar.jsx';
import TemplatesView from './templates/TemplatesView.jsx';
import CharacterManagement from './characters/CharacterManagement.jsx';
import UsersView from './users/UsersView.jsx';
import SettingsView from './settings/SettingsView.jsx';

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');

  const navigate = (path) => {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', path);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    const path = window.location.pathname;
    if (token) {
      setIsLoggedIn(true);
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
          <LoginPage onLogin={() => { setIsLoggedIn(true); setActiveTab('templates'); navigate('/super-admin/sysprompt'); }} />
        </ToastProvider>
      </>
    );
  }
  return (
    <div className="flex min-h-screen bg-[#F3E5F5]">
      <StyleInjector />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'templates') navigate('/super-admin/sysprompt');
        }}
        onLogout={() => { setIsLoggedIn(false); localStorage.removeItem('admin_access_token'); localStorage.removeItem('admin_refresh_token'); navigate('/super-admin/login'); }}
      />
      <main className="flex-1 ml-64 p-8 relative z-10">
        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-20">
          <Sparkles size={120} className="text-purple-300" />
        </div>
        {activeTab === 'templates' && <TemplatesView />}
        {activeTab === 'characters' && <CharacterManagement />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
      <div className="ambient-bg"></div>
    </div>
  );
};

export default AdminDashboard;
