import React from 'react';
import { Plus } from 'lucide-react';

interface TopBarProps {
  title: string | React.ReactNode;
  onFilterClick?: () => void;
  showAdd?: boolean;
  variant?: 'default' | 'overlay';
}

export const TopBar: React.FC<TopBarProps> = ({ title, onFilterClick, showAdd = true, variant = 'default' }) => {
  const isOverlay = variant === 'overlay'
  return (
    <div className={isOverlay ? 'fixed top-0 left-0 right-0 z-30 px-6 py-4 bg-gradient-to-b from-pink-200/60 via-purple-200/40 to-transparent backdrop-blur-sm flex justify-between items-center pointer-events-none' : 'sticky top-0 z-20 px-6 py-4 bg-primary-50/80 backdrop-blur-md flex justify-between items-center transition-all'}>
      <div className={isOverlay ? 'text-2xl font-bold text-slate-800 tracking-tight flex items-center opacity-0' : 'text-2xl font-bold text-slate-800 tracking-tight flex items-center'}>
        {title}
      </div>
      <div className={isOverlay ? 'flex gap-4 opacity-0' : 'flex gap-4'}>
        {showAdd && (
          <button 
            onClick={onFilterClick}
            className="p-2 rounded-full bg-white text-primary-500 shadow-sm hover:shadow-md transition-all active:scale-95"
            aria-label="添加"
          >
            <Plus size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
