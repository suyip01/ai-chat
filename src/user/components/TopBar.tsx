
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent, setTag } from '../services/analytics'
import { Plus, Search, X, MoreVertical, Trash2 } from 'lucide-react';

interface TopBarProps {
  title: string | React.ReactNode;
  onFilterClick?: () => void;
  showAdd?: boolean;
  variant?: 'default' | 'overlay';
  onSearch?: (query: string) => void;
  onDeleteAll?: () => void;
  searchPlaceholder?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onFilterClick, showAdd = true, variant = 'default', onSearch, onDeleteAll, searchPlaceholder }) => {
  const isOverlay = variant === 'overlay'
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSearching) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearching]);

  if (isSearching) {
    return (
      <div className="sticky top-0 z-20 px-6 py-4 bg-primary-50/95 backdrop-blur-md flex items-center gap-3 transition-all">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder || "搜索..."}
            className="w-full bg-slate-100 pl-10 pr-4 py-2 rounded-full text-sm outline-none text-slate-700 placeholder:text-slate-400"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearch?.(searchText);
              }
            }}
          />
        </div>
        <button
          onClick={() => {
            setIsSearching(false);
            setSearchText('');
            onSearch?.('');
          }}
          className="text-sm font-bold text-slate-500 whitespace-nowrap px-1 active:opacity-70"
        >
          取消
        </button>
      </div>
    )
  }

  return (
    <div className={isOverlay ? 'fixed top-0 left-0 right-0 z-30 px-6 py-4 bg-gradient-to-b from-pink-200/60 via-purple-200/40 to-transparent backdrop-blur-sm flex justify-between items-center pointer-events-none' : 'sticky top-0 z-20 px-6 py-4 bg-primary-50/80 backdrop-blur-md flex justify-between items-center transition-all'}>
      <div className={isOverlay ? 'text-2xl font-bold text-slate-800 tracking-tight flex items-center opacity-0' : 'text-2xl font-bold text-slate-800 tracking-tight flex items-center'}>
        {title}
      </div>
      <div className={isOverlay ? 'flex gap-4 opacity-0' : 'flex gap-2'}>
        {onSearch && (
          <button
            onClick={() => { setIsSearching(true); }}
            className="p-2 rounded-full bg-purple-50 text-primary-500 shadow-sm hover:shadow-md transition-all active:scale-95"
            aria-label="搜索"
          >
            <Search size={20} strokeWidth={3} />
          </button>
        )}
        {showAdd && (
          <button
            onClick={() => { try { trackEvent('顶部栏.操作', { 动作: '添加' }) } catch { }; onFilterClick?.() }}
            className="p-2 rounded-full bg-purple-50 text-primary-500 shadow-sm hover:shadow-md transition-all active:scale-95"
            aria-label="添加"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        )}
        {onDeleteAll && (
          <div className="relative">
            <button
              ref={moreButtonRef}
              className="p-2 text-slate-600 transition-all active:scale-95 active:opacity-70"
              onClick={() => {
                if (!isMenuOpen && moreButtonRef.current) {
                  const rect = moreButtonRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.top, right: window.innerWidth - rect.right });
                }
                setIsMenuOpen(!isMenuOpen);
              }}
            >
              <MoreVertical size={20} strokeWidth={2.5} />
            </button>
            {isMenuOpen && createPortal(
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsMenuOpen(false)}></div>
                <div
                  className="fixed bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-max z-[101] animate-in fade-in zoom-in-95 duration-100"
                  style={{ top: menuPos.top, right: menuPos.right }}
                >
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-800 font-bold hover:bg-slate-50 transition-colors"
                    onClick={() => { setIsMenuOpen(false); setShowDeleteAllConfirm(true); }}
                  >
                    删除所有会话
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        )}
      </div>
      {showDeleteAllConfirm && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/20 animate-[fadeBg_200ms_ease]"></div>
          <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm animate-[fadeCard_200ms_ease]">
              <div className="px-6 py-5 text-center text-slate-800 font-bold">确认删除所有会话？</div>
              <div className="px-6 pb-4 text-center text-slate-500 text-sm">此操作不可恢复，将清空所有本地聊天记录。</div>
              <div className="h-[1px] bg-slate-100"></div>
              <div className="flex">
                <button className="flex-1 py-4 text-slate-600 active:opacity-70" onClick={() => setShowDeleteAllConfirm(false)}>取消</button>
                <div className="w-[1px] bg-slate-100"></div>
                <button className="flex-1 py-4 text-red-600 font-bold active:opacity-70" onClick={() => { setShowDeleteAllConfirm(false); if (onDeleteAll) onDeleteAll(); }}>确认删除</button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes fadeCard { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes fadeBg { from { opacity: 0 } to { opacity: 1 } }
          `}</style>
        </>,
        document.body
      )}
    </div>
  );
};
