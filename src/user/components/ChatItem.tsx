import React, { useState } from 'react';
import { Pin } from 'lucide-react';

interface ChatItemProps {
  chat: {
    character: { name: string; avatar: string; isPinned?: boolean };
    lastMessage: { senderId: string; text: string; timestamp: Date };
    unreadCount: number;
  };
  onClick: () => void;
  onTogglePin: () => void;
  roundedClass?: string;
}

export const ChatItem: React.FC<ChatItemProps> = ({ chat, onClick, onTogglePin, roundedClass }) => {
  // Format time relative to now (simple implementation)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const [imgError, setImgError] = useState(false)

  const handlePinClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin();
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative flex items-center gap-4 p-4 bg-white ${roundedClass || 'rounded-2xl'} shadow-sm border border-transparent hover:border-primary-100 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer`}
    >
      {/* Avatar Container */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-primary-300 to-accent-pink">
          {(!imgError && chat.character.avatar) ? (
            <img
              src={chat.character.avatar}
              alt={chat.character.name}
              onError={() => setImgError(true)}
              className="w-full h-full rounded-full object-cover border-2 border-white"
            />
          ) : (
            <div className="w-full h-full rounded-full border-2 border-white bg-white flex items-center justify-center text-slate-500 font-bold">
              {chat.character.name?.[0] || '?'}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-lg truncate">
              {chat.character.name}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2">
            {formatTime(chat.lastMessage.timestamp)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-slate-500 text-sm truncate pr-4 leading-relaxed">
            {chat.lastMessage.senderId === 'user' && <span className="text-slate-400">你: </span>}
            {chat.lastMessage.text}
          </p>
          
          <div className="flex gap-2 items-center flex-shrink-0">
            {/* Clickable Pin Icon */}
            <button 
                onClick={handlePinClick}
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${chat.character.isPinned ? 'bg-primary-50 text-primary-400' : 'text-slate-200 hover:text-primary-300'}`}
            >
                <Pin 
                    size={14} 
                    className={`transform rotate-45 ${chat.character.isPinned ? 'fill-primary-400' : ''}`} 
                />
            </button>

            {chat.unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-400 text-white text-[10px] font-bold rounded-full">
                {chat.unreadCount}
                </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
