import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChatPreview } from '../types';
import { ChatItem } from './ChatItem';

interface ChatListProps {
  chats: ChatPreview[];
  onChatClick: (chat: ChatPreview) => void;
  onTogglePin: (characterId: string) => void;
  onDeleteChat: (characterId: string) => void;
  isDetailOpen?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, onChatClick, onTogglePin, onDeleteChat, isDetailOpen = false }) => {
  const isTouch = (navigator as any)?.maxTouchPoints > 0
  const pinnedChats = chats.filter(c => c.character.isPinned);
  const otherChats = chats.filter(c => !c.character.isPinned);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const activeIdRef = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; id: string | null }>({ visible: false, x: 0, y: 0, id: null });

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    activeIdRef.current = id;
  };
  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (activeIdRef.current !== id) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    if (Math.abs(dy) > Math.abs(dx)) return; // Vertical scroll, ignore swipe

    const offset = Math.max(-96, Math.min(0, dx));
    setOffsets(prev => ({ ...prev, [id]: offset }));
  };
  const onTouchEnd = (id: string) => {
    if (activeIdRef.current !== id) return;
    const current = offsets[id] || 0;
    const final = current < -60 ? -96 : 0;
    setOffsets(prev => ({ ...prev, [id]: final }));
    activeIdRef.current = null;
  };
  const closeSwipe = (id: string) => setOffsets(prev => ({ ...prev, [id]: 0 }));

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (isTouch) return;
    let x = e.clientX;
    const menuWidth = 120;
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    setContextMenu({ visible: true, x, y: e.clientY, id });
  };

  return (
    <motion.div
      className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700"
      initial={{ x: 0 }}
      animate={isDetailOpen && isTouch ? { x: '-100%' } : { x: 0 }}
      transition={isDetailOpen && isTouch ? { duration: 0.3, ease: 'linear' } : { duration: 0 }}
    >

      {pinnedChats.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">置顶</h2>
          {pinnedChats.map(chat => (
            <div key={chat.characterId} className="relative overflow-hidden mb-3 rounded-2xl">
              {(() => {
                const reveal = Math.min(96, Math.max(0, -((offsets[chat.characterId] || 0))))
                return (
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center justify-center rounded-r-2xl shadow-sm"
                    style={{ width: `${reveal}px`, transition: 'width 120ms ease' }}
                  >
                    <button onClick={() => setConfirmId(chat.characterId)} className="text-white font-bold drop-shadow-sm">删除</button>
                  </div>
                )
              })()}
              <div
                onTouchStart={(e) => onTouchStart(e, chat.characterId)}
                onTouchMove={(e) => onTouchMove(e, chat.characterId)}
                onTouchEnd={() => onTouchEnd(chat.characterId)}
                onContextMenu={(e) => handleContextMenu(e, chat.characterId)}
                style={{ transform: `translateX(${offsets[chat.characterId] || 0}px)`, transition: 'transform 180ms ease' }}
              >
                <ChatItem
                  chat={chat}
                  onClick={() => onChatClick(chat)}
                  onTogglePin={() => onTogglePin(chat.characterId)}
                  roundedClass={(offsets[chat.characterId] || 0) < 0 ? 'rounded-l-2xl rounded-r-none' : 'rounded-2xl'}
                />
              </div>

            </div>
          ))}
        </div>
      )}

      {otherChats.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">消息</h2>
          {otherChats.map(chat => (
            <div key={chat.characterId} className="relative overflow-hidden mb-3 rounded-2xl">
              {(() => {
                const reveal = Math.min(96, Math.max(0, -((offsets[chat.characterId] || 0))))
                return (
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center justify-center rounded-r-2xl shadow-sm"
                    style={{ width: `${reveal}px`, transition: 'width 120ms ease' }}
                  >
                    <button onClick={() => setConfirmId(chat.characterId)} className="text-white font-bold drop-shadow-sm">删除</button>
                  </div>
                )
              })()}
              <div
                onTouchStart={(e) => onTouchStart(e, chat.characterId)}
                onTouchMove={(e) => onTouchMove(e, chat.characterId)}
                onTouchEnd={() => onTouchEnd(chat.characterId)}
                onContextMenu={(e) => handleContextMenu(e, chat.characterId)}
                style={{ transform: `translateX(${offsets[chat.characterId] || 0}px)`, transition: 'transform 180ms ease' }}
              >
                <ChatItem
                  chat={chat}
                  onClick={() => onChatClick(chat)}
                  onTogglePin={() => onTogglePin(chat.characterId)}
                  roundedClass={(offsets[chat.characterId] || 0) < 0 ? 'rounded-l-2xl rounded-r-none' : 'rounded-2xl'}
                />
              </div>

            </div>
          ))}
        </div>
      )}
      {confirmId && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/20 animate-[fadeBg_200ms_ease]"></div>
          <div className="fixed inset-0 z-[90] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm animate-[fadeCard_200ms_ease]">
              <div className="px-6 py-5 text-center text-slate-800 font-bold">确认删除此会话？</div>
              <div className="h-[1px] bg-slate-100"></div>
              <div className="flex">
                <button className="flex-1 py-4 text-slate-600 active:opacity-70" onClick={() => { closeSwipe(confirmId); setConfirmId(null); }}>取消</button>
                <div className="w-[1px] bg-slate-100"></div>
                <button className="flex-1 py-4 text-red-600 font-bold active:opacity-70" onClick={() => { const id = confirmId; setConfirmId(null); onDeleteChat(id); }}>确认删除</button>
              </div>
            </div>
          </div>
          <style>{`
        @keyframes fadeCard { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeBg { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
        </>
      )}

      {chats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-500 font-medium">暂无消息</p>
          <p className="text-slate-400 text-sm mt-1">快去和角色聊天吧！</p>
        </div>
      )}

      {contextMenu.visible && (
        <>
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(prev => ({ ...prev, visible: false })); }}
          ></div>
          <div
            className="fixed z-[100] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => { if (contextMenu.id) setConfirmId(contextMenu.id); setContextMenu(prev => ({ ...prev, visible: false })); }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
            >
              删除
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};
