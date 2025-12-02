import React from 'react';
import { Plus } from 'lucide-react';

interface TopBarProps {
  title: string | React.ReactNode;
  onFilterClick?: () => void;
  showAdd?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onFilterClick, showAdd = true }) => {
  return (
    <div className="sticky top-0 z-20 px-6 py-4 bg-primary-50/80 backdrop-blur-md flex justify-between items-center transition-all">
      <div className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
        {title}
      </div>
      <div className="flex gap-4">
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