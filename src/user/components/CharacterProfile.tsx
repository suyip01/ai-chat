
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, Heart, MessageCircle } from 'lucide-react';
import { Character } from '../types';
import { useToast } from './Toast';

interface CharacterProfileProps {
  character: Character;
  onBack: () => void;
  onStartChat: () => void;
  isFromChat?: boolean;
  isExistingChat?: boolean;
}

export const CharacterProfile: React.FC<CharacterProfileProps> = ({ character, onBack, onStartChat, isFromChat = false, isExistingChat = false }) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const { showToast, showCenter } = useToast();
  const [imgError, setImgError] = useState(false);

  // Logic: Show first 4 initially. If showAllTags is true, show all.
  const visibleTags = showAllTags ? character.tags : character.tags.slice(0, 4);
  const hasMoreTags = character.tags.length > 4;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-primary-50"
      initial={{ x: (((navigator as any)?.maxTouchPoints > 0) && isFromChat) ? '100%' : 0 }}
      animate={{ x: 0 }}
      exit={{ x: (((navigator as any)?.maxTouchPoints > 0) && isFromChat) ? '100%' : 0 }}
      transition={{ duration: (((navigator as any)?.maxTouchPoints > 0) && isFromChat) ? 0.3 : 0, ease: 'linear' }}
    >
      <div className="mx-auto w-full max-w-md h-full flex flex-col bg-white shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden relative">
        {/* Back Button - Fixed Position */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/30 transition-all"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar relative pb-24">

          {/* Hero Image Section */}
          <div className="relative w-full h-[55vh]">


            {/* Background Image - Use profileImage (original) if available, else avatar */}
            {(!imgError && (character.profileImage || character.avatar)) ? (
              <img
                src={character.profileImage || character.avatar}
                alt={character.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                <span className="text-6xl font-bold text-slate-500">{character.name?.[0] || '?'}</span>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/10"></div>

            {/* Character Info Overlay - Left Aligned */}
            <div className="absolute bottom-12 left-6 right-6 z-10 text-white flex flex-col items-start space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-bold tracking-wide">{character.name}</h1>
                {/* Dynamic Role Type Badge */}
                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] border border-white/30 text-white flex items-center gap-1">
                  <span className="text-green-400">●</span> {character.character_type || character.roleType || '原创角色'}
                </span>
              </div>
              <div className="flex items-center text-white text-sm font-medium pl-1">
                <span>{character.profession}</span>
                <span className="mx-2 bg-white w-1 h-1 rounded-full"></span>
                <span>{character.age}</span>
              </div>
              <div className="text-white text-xs font-medium pl-1">
                by {character.creator}
              </div>
            </div>
          </div>

          <div className="relative -mt-6 bg-white rounded-t-none md:rounded-t-[32px] px-6 py-8 min-h-[50vh] z-10">

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {visibleTags.map((tag, idx) => (
                <span key={idx} className="px-4 py-1.5 rounded-full bg-purple-50 text-purple-600 text-sm font-bold shadow-sm">
                  # {tag}
                </span>
              ))}
            </div>

            {hasMoreTags && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="text-xs text-purple-300 flex items-center gap-1 font-bold hover:text-purple-400 transition-colors"
                >
                  {showAllTags ? '收起' : '展示更多'} {showAllTags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            )}

            {/* One Line Persona */}
            <div className="mb-8">
              <h3 className="text-purple-500 font-bold text-sm mb-3">一句话人设</h3>
              <div className="relative pl-4 py-1">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 rounded-full"></div>
                <div className="bg-purple-50/50 p-4 rounded-r-xl text-slate-700 font-bold text-lg">
                  “{character.oneLinePersona}”
                </div>
              </div>
            </div>

            {/* Personality */}
            <div className="mb-8">
              <h3 className="text-purple-500 font-bold text-sm mb-3">性格</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-slate-600 leading-7 text-justify text-sm">
                {character.personality}
              </div>
            </div>

            {/* Current Relationship */}
            <div className="mb-8">
              <h3 className="text-purple-500 font-bold text-sm mb-3">当前关系</h3>
              <div>
                <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-500 px-3 py-1 rounded-full text-sm font-bold">
                  <Heart size={12} fill="currentColor" /> {character.currentRelationship}
                </span>
              </div>
            </div>

            {/* First Plot */}
            <div className="mb-8">
              <h3 className="text-purple-900 font-extrabold text-lg mb-4">第一情节</h3>

              <div className="flex items-center gap-2 mb-4">
                <span className="bg-pink-400 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">THEME</span>
                <span className="bg-pink-50 text-pink-800 text-sm font-bold px-2 py-0.5 rounded">
                  {character.plotTheme}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-slate-600 leading-7 text-justify text-sm mb-4">
                {character.plotDescription}
              </div>

              {/* Opening Line Section */}
              {character.openingLine && (
                <div className="bg-purple-50/50 rounded-2xl p-4 flex items-center">
                  <span className="text-purple-600 font-bold text-sm whitespace-nowrap mr-3">
                    角色开场白
                  </span>
                  <div className="h-4 w-[1px] bg-purple-200 mr-4"></div>
                  <span className="text-slate-700 font-bold text-sm">
                    {character.openingLine}
                  </span>
                </div>
              )}

            </div>

          </div>
        </div>

        <div className="absolute bottom-3 inset-x-0 z-50">
          <div className="mx-auto w-full max-w-md bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 pb-[env(safe-area-inset-bottom)]">
            <button
              onClick={() => {
                if (isFromChat) {
                  onStartChat();
                  return;
                }
                if (isExistingChat) {
                  showCenter('当前角色已经在会话列表');
                  return;
                }
                onStartChat();
              }}
              className="w-full font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-purple-200 text-purple-900 shadow-purple-100"
            >
              {isFromChat ? (
                <>
                  <MessageCircle size={20} />
                  回到聊天
                </>
              ) : (
                '唤醒角色'
              )}
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
