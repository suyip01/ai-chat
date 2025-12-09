
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Check, ArrowRight, Info } from 'lucide-react';
import { Story, StoryRole } from '../types';
import { identifyUser, setTag } from '../services/analytics'

interface StoryReaderProps {
  story: Story;
  onBack: () => void;
  onStartRoleplay: (role: StoryRole) => void;
  connectedRoleNames?: string[];
  validRoleNames?: string[];
}

export const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack, onStartRoleplay, connectedRoleNames = [], validRoleNames = [] }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [thumbHeight, setThumbHeight] = useState(20);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Role Selection State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [showAlreadyConnectedModal, setShowAlreadyConnectedModal] = useState(false);
  
  // Drag state refs to avoid closure staleness without re-binding listeners constantly
  const dragStartY = useRef(0);
  const dragStartThumbTop = useRef(0);

  const updateScrollbar = useCallback(() => {
      if (!contentRef.current || !trackRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const trackHeight = trackRef.current.clientHeight;

      // If content fits, no scrollbar needed really, but we can just hide it or show full
      if (scrollHeight <= clientHeight) {
          setThumbHeight(trackHeight);
          setThumbTop(0);
          return;
      }

      // Calculate thumb height
      const visibleRatio = clientHeight / scrollHeight;
      // Proportional size, min height 30px
      const calculatedThumbHeight = Math.max(visibleRatio * trackHeight, 30); 
      setThumbHeight(calculatedThumbHeight);

      // Calculate thumb position
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - calculatedThumbHeight;
      
      const currentScrollRatio = scrollTop / maxScrollTop;
      setThumbTop(currentScrollRatio * maxThumbTop);
  }, []);

  useEffect(() => {
    try {
      const uid = localStorage.getItem('user_id') || '0'
      identifyUser({ userId: uid, pageId: 'READ_STORY', name: '阅读故事' })
      setTag('页面', '阅读故事')
      setTag('故事标题', story?.title || '')
    } catch {}
  }, [story?.title])

  useEffect(() => {
      const observer = new ResizeObserver(() => {
          updateScrollbar();
      });
      if (contentRef.current) observer.observe(contentRef.current);
      if (trackRef.current) observer.observe(trackRef.current);
      
      // Delay initial check slightly to ensure layout is stable
      const timer = setTimeout(updateScrollbar, 100);

      return () => {
          observer.disconnect();
          clearTimeout(timer);
      };
  }, [updateScrollbar]);

  // Handle Dragging
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      
      const clientY = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientY;
      dragStartY.current = clientY;
      dragStartThumbTop.current = thumbTop;
  };

  useEffect(() => {
      const handleDragMove = (e: MouseEvent | TouchEvent) => {
          if (!isDragging || !contentRef.current || !trackRef.current) return;
          e.preventDefault(); // Prevent default browser scrolling/selection

          const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
          const deltaY = clientY - dragStartY.current;
          
          const trackHeight = trackRef.current.clientHeight;
          const maxThumbTop = trackHeight - thumbHeight;
          const maxScrollTop = contentRef.current.scrollHeight - contentRef.current.clientHeight;

          if (maxThumbTop <= 0) return;

          // New thumb Top
          let newThumbTop = dragStartThumbTop.current + deltaY;
          // Clamp
          newThumbTop = Math.max(0, Math.min(newThumbTop, maxThumbTop));

          // Calculate corresponding ScrollTop
          const ratio = newThumbTop / maxThumbTop;
          contentRef.current.scrollTop = ratio * maxScrollTop;
      };

      const handleDragEnd = () => {
          setIsDragging(false);
      };

      if (isDragging) {
          document.addEventListener('mousemove', handleDragMove);
          document.addEventListener('mouseup', handleDragEnd);
          document.addEventListener('touchmove', handleDragMove, { passive: false });
          document.addEventListener('touchend', handleDragEnd);
      }

      return () => {
          document.removeEventListener('mousemove', handleDragMove);
          document.removeEventListener('mouseup', handleDragEnd);
          document.removeEventListener('touchmove', handleDragMove);
          document.removeEventListener('touchend', handleDragEnd);
      };
  }, [isDragging, thumbHeight]);

  const handleConfirmRole = () => {
      if (selectedRoleName) {
          if (connectedRoleNames.includes(selectedRoleName)) {
              setShowAlreadyConnectedModal(true);
              return;
          }
          const role = (story.availableRoles || []).find(r => r.name === selectedRoleName);
          if (role) {
              onStartRoleplay(role);
          }
      }
  };

  const paragraphs = story.content.split('\n').filter(p => p.trim() !== '');
  const displayRoles = (story.availableRoles || []).filter(role => {
    return validRoleNames && validRoleNames.length ? validRoleNames.includes(role.name) : true;
  });

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col h-full w-full animate-in slide-in-from-right duration-300">
      
      {/* Container with max width */}
      <div className="mx-auto w-full max-w-md h-full flex flex-col relative bg-white rounded-none md:rounded-3xl md:overflow-hidden shadow-2xl">
        <button onClick={onBack} className="absolute top-4 left-4 z-[100] w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/30 transition-all">
          <ArrowLeft size={24} />
        </button>
        {/* Scrollable Content */}
        <div 
        className="flex-1 overflow-y-auto no-scrollbar bg-[#FAFAFA]"
        onScroll={updateScrollbar}
        ref={contentRef}
        >
        {/* Cover Image */}
        <div className="w-full h-64 relative">
             <img src={story.image || '/uploads/covers/default_storyimg.jpg'} alt={story.title} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] to-transparent"></div>
        </div>

        <div className="px-6 -mt-12 relative z-10 pb-20">
            
            {/* Title Block */}
            <div className="mb-8">
                {/* Title */}
                <h1 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">
                    {story.title}
                </h1>

                {/* Author Info */}
                <div className="flex items-center mt-2">
                    <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-white shadow-sm mr-3">
                         <img src={story.user_avatar || `https://api.dicebear.com/7.x/miniavs/svg?seed=${story.author}`} alt="author" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{story.author}</span>
                </div>
            </div>

            {/* Content Body */}
            <article className="prose prose-slate max-w-none">
                {paragraphs.map((p, index) => (
                    <p 
                        key={index} 
                        className="mb-6 text-justify tracking-wide text-[16px]"
                        style={{
                            lineHeight: 1.8,
                            color: '#334155'
                        }}
                    >
                        {p}
                    </p>
                ))}
            </article>

            {/* End of Text Marker */}
            <div className="flex items-center justify-center my-10">
                <span className="text-slate-400/80 text-sm font-medium tracking-widest">—— 全文完 ——</span>
            </div>

            {/* Tags at the bottom */}
            <div className="mb-12 flex flex-wrap gap-4 pl-1">
                {story.tags.map(tag => (
                    <span 
                        key={tag} 
                        className="text-sm text-slate-400"
                    >
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Chat with Role Button */}
            {(displayRoles.length > 0) && (
              <div className="flex justify-center mb-8">
                  <button
                      onClick={() => setShowRoleModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-100 rounded-full shadow-lg shadow-purple-200/50 hover:bg-purple-200 transition-all active:scale-95 cursor-pointer"
                  >
                      <span 
                          className="text-lg font-bold text-purple-600 tracking-widest"
                      >
                          与角色开聊
                      </span>
                      <ArrowRight size={18} className="text-purple-600" />
                  </button>
              </div>
            )}

        </div>
        </div>

      {/* Custom Scrollbar - Right Side Slider */}
      <div 
         ref={trackRef}
         className="absolute right-1 top-4 bottom-4 w-1.5 z-[70]"
      >
          {/* Thumb */}
          <div 
             className="w-full rounded-full cursor-pointer transition-colors duration-200 bg-slate-400/40 hover:bg-slate-400/60"
             style={{ 
                 height: `${thumbHeight}px`, 
                 transform: `translateY(${thumbTop}px)`,
                 touchAction: 'none'
             }}
             onMouseDown={handleDragStart}
             onTouchStart={handleDragStart}
          />
      </div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-[85%] max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="p-6 pb-2">
                       <h3 className="text-xl font-bold text-slate-900 text-center mb-6 font-kosugi">请选择聊天角色</h3>
                       
                       <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar py-2 px-1">
                           {displayRoles.length > 0 ? (
                               displayRoles.map(role => {
                                   const isSelected = selectedRoleName === role.name;
                                   const isConnected = connectedRoleNames.includes(role.name);
                                   return (
                                     <div 
                                        key={role.name}
                                        onClick={() => setSelectedRoleName(role.name)}
                                        className={`
                                            relative p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border-2
                                            ${isSelected 
                                                ? 'bg-purple-50 border-purple-500 shadow-md scale-[1.02]' 
                                                : 'bg-slate-50 border-transparent hover:bg-slate-100'
                                            }
                                        `}
                                     >
                                         <div className="flex flex-col">
                                           <span className={`font-bold text-base ${isSelected ? 'text-purple-700' : 'text-slate-800'}`}>
                                               {role.name}
                                           </span>
                                           {isConnected && (
                                             <span className="text-[10px] text-green-500 font-bold mt-1">● 已建联</span>
                                           )}
                                         </div>
                                         
                                         {isSelected && (
                                             <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-sm">
                                                 <Check size={12} strokeWidth={3} />
                                             </div>
                                         )}
                                     </div>
                                   );
                               })
                           ) : (
                               <p className="text-center text-slate-400 py-4 text-sm">暂无识别到的角色</p>
                           )}
                       </div>
                  </div>
                  
                  <div className="p-6 pt-2 bg-gradient-to-t from-white via-white to-transparent">
                       <div className="flex gap-3">
                           <button 
                               onClick={() => setShowRoleModal(false)}
                               className="flex-1 py-3.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 text-sm"
                           >
                               取消
                           </button>
                           <button 
                               onClick={handleConfirmRole}
                               disabled={!selectedRoleName}
                               className={`
                                   flex-1 py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg transition-all flex items-center justify-center gap-2
                                   ${selectedRoleName 
                                       ? 'bg-purple-600 shadow-purple-200 hover:bg-purple-700 active:scale-95' 
                                       : 'bg-slate-300 shadow-none cursor-not-allowed'
                                   }
                               `}
                           >
                               查看角色卡
                           </button>
                       </div>
                  </div>
              </div>
          </div>
  )}

      {showAlreadyConnectedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-[80%] max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-4">
                    <Info size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 font-kosugi">你已经与该角色建联了</h3>
                <p className="text-xs text-slate-400 mb-6 font-kosugi">请在聊天列表查看与该角色的聊天记录</p>
                <button 
                    onClick={() => setShowAlreadyConnectedModal(false)}
                    className="w-full py-3 rounded-2xl bg-purple-600 text-white font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors text-sm font-kosugi"
                >
                    我知道了
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
    
