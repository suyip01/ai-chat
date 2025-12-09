import React from 'react';
import { trackEvent, setTag } from '../services/analytics'
import { Home, MessageCircle, User as UserIcon } from 'lucide-react';
import { NavTab } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const getTabClass = (tab: NavTab) => {
    const isActive = activeTab === tab;
    return `flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
      isActive ? 'text-primary-600 scale-105' : 'text-slate-400 hover:text-primary-400'
    }`;
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30">
      <div className="mx-auto w-full max-w-md h-20 bg-white/90 backdrop-blur-lg border-t border-primary-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex justify-around items-center px-4 rounded-none md:rounded-b-3xl md:shadow-2xl">
        <button 
          className={getTabClass(NavTab.HOME)} 
          onClick={() => { onTabChange(NavTab.HOME); try { trackEvent('底部导航.点击'); setTag('导航项', '主页') } catch {} }}
        >
          <Home size={24} strokeWidth={activeTab === NavTab.HOME ? 2.5 : 2} />
          <span className="text-xs mt-1 font-semibold">主页</span>
        </button>

        <button 
          className={getTabClass(NavTab.CHAT)} 
          onClick={() => { onTabChange(NavTab.CHAT); try { trackEvent('底部导航.点击'); setTag('导航项', '聊天') } catch {} }}
        >
          <div className="relative">
            <MessageCircle size={24} strokeWidth={activeTab === NavTab.CHAT ? 2.5 : 2} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white"></span>
          </div>
          <span className="text-xs mt-1 font-semibold">聊天</span>
        </button>

        <button 
          className={getTabClass(NavTab.ME)} 
          onClick={() => { onTabChange(NavTab.ME); try { trackEvent('底部导航.点击'); setTag('导航项', '我的') } catch {} }}
        >
          <UserIcon size={24} strokeWidth={activeTab === NavTab.ME ? 2.5 : 2} />
          <span className="text-xs mt-1 font-semibold">我的</span>
        </button>
      </div>
    </div>
  );
};
