import React from 'react';
import { ChatPreview } from '../types';
import { ChatItem } from './ChatItem';

interface ChatListProps {
  chats: ChatPreview[];
  onChatClick: (chat: ChatPreview) => void;
  onTogglePin: (characterId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, onChatClick, onTogglePin }) => {
  const pinnedChats = chats.filter(c => c.character.isPinned);
  const otherChats = chats.filter(c => !c.character.isPinned);

  return (
    <div className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {pinnedChats.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">置顶</h2>
          {pinnedChats.map(chat => (
            <ChatItem 
                key={chat.characterId} 
                chat={chat} 
                onClick={() => onChatClick(chat)} 
                onTogglePin={() => onTogglePin(chat.characterId)}
            />
          ))}
        </div>
      )}

      {otherChats.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">消息</h2>
          {otherChats.map(chat => (
            <ChatItem 
                key={chat.characterId} 
                chat={chat} 
                onClick={() => onChatClick(chat)} 
                onTogglePin={() => onTogglePin(chat.characterId)}
            />
          ))}
        </div>
      )}

      {chats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4 text-4xl">
                🌸
            </div>
            <p className="text-slate-500 font-medium">暂无消息</p>
            <p className="text-slate-400 text-sm mt-1">快去和角色聊天吧！</p>
        </div>
      )}
    </div>
  );
};