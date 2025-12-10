
import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, LogOut, Camera, Edit2, Mail, PenTool, Trash2, Plus } from 'lucide-react';
import { Character, UserProfile, Story } from '../types';
import { deleteUserStory } from '../services/userStoriesService';
import { deleteUserCharacter } from '../services/userCharactersService';
import { ImageCropper } from '../components/ImageCropper';

const MyCharacterAvatar: React.FC<{ avatar?: string; name: string }> = ({ avatar, name }) => {
  const [err, setErr] = useState(false)
  return (
    <div className="w-14 h-14 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-50 flex items-center justify-center">
      {(!err && avatar) ? (
        <img src={avatar} className="w-full h-full object-cover" alt={name} onError={() => setErr(true)} />
      ) : (
        <span className="text-base font-bold text-slate-500">{name?.[0] || '?'}</span>
      )}
    </div>
  )
}

interface MePageProps {
  userProfile: UserProfile;
  myCharacters: Character[];
  myUserCharacters: Character[];
  myStories: Story[];
  onUpdateProfile: (profile: UserProfile) => void;
  onCharacterClick: (character: Character) => void;
  onLogout: () => void;
  onEditStory?: (story: Story) => void;
  onDeleteStory?: (story: Story) => void;
  onEditCharacter?: (character: Character) => void;
  onDeleteCharacter?: (character: Character) => void;
  onReadStory?: (story: Story) => void;
  onAddStory?: () => void;
  onAddCharacter?: () => void;
}

export const MePage: React.FC<MePageProps> = ({
  userProfile,
  myCharacters,
  myUserCharacters,
  myStories,
  onUpdateProfile,
  onCharacterClick,
  onLogout,
  onEditStory,
  onDeleteStory,
  onEditCharacter,
  onDeleteCharacter,
  onReadStory,
  onAddStory,
  onAddCharacter
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.nickname);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [preMountLoading, setPreMountLoading] = useState(false);
  const [userImgError, setUserImgError] = useState(false);
  const isTouch = (navigator as any)?.maxTouchPoints > 0;

  // Story State
  const [localStories, setLocalStories] = useState<Story[]>(myStories || []);
  const [storyOffsets, setStoryOffsets] = useState<Record<string | number, number>>({});
  const [confirmStoryId, setConfirmStoryId] = useState<string | number | null>(null);
  const storyStartXRef = useRef<number>(0);
  const storyStartYRef = useRef<number>(0);
  const storyActiveIdRef = useRef<string | number | null>(null);
  const storyInitialOffsetRef = useRef<number>(0);

  // Character State
  const [localCharacters, setLocalCharacters] = useState<Character[]>(myUserCharacters || []);
  const [charOffsets, setCharOffsets] = useState<Record<string | number, number>>({});
  const [confirmCharId, setConfirmCharId] = useState<string | number | null>(null);
  const charStartXRef = useRef<number>(0);
  const charStartYRef = useRef<number>(0);
  const charActiveIdRef = useRef<string | number | null>(null);
  const charInitialOffsetRef = useRef<number>(0);

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; id: string | number | null; type: 'story' | 'character' | null }>({ visible: false, x: 0, y: 0, id: null, type: null });

  const handleContextMenu = (e: React.MouseEvent, id: string | number, type: 'story' | 'character') => {
    e.preventDefault();
    if (isTouch) return; // Don't show on touch devices, they use swipe

    let x = e.clientX;
    const menuWidth = 140; // Approx width
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    setContextMenu({
      visible: true,
      x,
      y: e.clientY,
      id,
      type
    });
  };


  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataUrlToBlob = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreMountLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatar(reader.result as string);
        setPreMountLoading(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveName = async () => {
    const nm = tempName.trim();
    if (!nm) {
      setTempName(userProfile.nickname);
      setIsEditingName(false);
      return;
    }
    try {
      const { authFetch } = await import('../services/http')
      await authFetch('/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: nm }) })
      onUpdateProfile({ ...userProfile, nickname: nm })
    } catch {
      setTempName(userProfile.nickname)
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    setLocalStories(myStories || []);
  }, [userProfile.usedCount])

  useEffect(() => {
    setLocalStories(myStories || []);
  }, [myStories])

  useEffect(() => {
    setLocalCharacters(myUserCharacters || []);
  }, [myUserCharacters])

  // Story Swipe Handlers
  const onStoryTouchStart = (e: React.TouchEvent, id: string | number) => {
    storyStartXRef.current = e.touches[0].clientX;
    storyStartYRef.current = e.touches[0].clientY;
    storyActiveIdRef.current = id;
    storyInitialOffsetRef.current = storyOffsets[id] || 0;
  };
  const onStoryTouchMove = (e: React.TouchEvent, id: string | number) => {
    if (storyActiveIdRef.current !== id) return;
    const dx = e.touches[0].clientX - storyStartXRef.current;
    const dy = e.touches[0].clientY - storyStartYRef.current;
    if (Math.abs(dy) > Math.abs(dx)) return; // Vertical scroll, ignore swipe

    let next = 0;
    if (storyInitialOffsetRef.current === 0) {
      next = Math.max(-96, Math.min(96, dx));
    } else if (storyInitialOffsetRef.current > 0) {
      next = Math.max(0, Math.min(96, storyInitialOffsetRef.current + dx));
    } else {
      next = Math.min(0, Math.max(-96, storyInitialOffsetRef.current + dx));
    }
    setStoryOffsets(prev => ({ ...prev, [id]: next }));
  };
  const onStoryTouchEnd = (id: string | number) => {
    if (storyActiveIdRef.current !== id) return;
    const current = storyOffsets[id] || 0;
    let final = 0;
    if (storyInitialOffsetRef.current === 0) {
      final = current > 60 ? 96 : current < -60 ? -96 : 0;
    } else if (storyInitialOffsetRef.current > 0) {
      final = current > 60 ? 96 : 0;
    } else {
      final = current < -60 ? -96 : 0;
    }
    setStoryOffsets(prev => ({ ...prev, [id]: final }));
    storyActiveIdRef.current = null;
  };
  const closeStorySwipe = (id: string | number) => setStoryOffsets(prev => ({ ...prev, [id]: 0 }));

  // Character Swipe Handlers
  const onCharTouchStart = (e: React.TouchEvent, id: string | number) => {
    charStartXRef.current = e.touches[0].clientX;
    charStartYRef.current = e.touches[0].clientY;
    charActiveIdRef.current = id;
    charInitialOffsetRef.current = charOffsets[id] || 0;
  };
  const onCharTouchMove = (e: React.TouchEvent, id: string | number) => {
    if (charActiveIdRef.current !== id) return;
    const dx = e.touches[0].clientX - charStartXRef.current;
    const dy = e.touches[0].clientY - charStartYRef.current;
    if (Math.abs(dy) > Math.abs(dx)) return; // Vertical scroll, ignore swipe

    let next = 0;
    if (charInitialOffsetRef.current === 0) {
      next = Math.max(-96, Math.min(96, dx));
    } else if (charInitialOffsetRef.current > 0) {
      next = Math.max(0, Math.min(96, charInitialOffsetRef.current + dx));
    } else {
      next = Math.min(0, Math.max(-96, charInitialOffsetRef.current + dx));
    }
    setCharOffsets(prev => ({ ...prev, [id]: next }));
  };
  const onCharTouchEnd = (id: string | number) => {
    if (charActiveIdRef.current !== id) return;
    const current = charOffsets[id] || 0;
    let final = 0;
    if (charInitialOffsetRef.current === 0) {
      final = current > 60 ? 96 : current < -60 ? -96 : 0;
    } else if (charInitialOffsetRef.current > 0) {
      final = current > 60 ? 96 : 0;
    } else {
      final = current < -60 ? -96 : 0;
    }
    setCharOffsets(prev => ({ ...prev, [id]: final }));
    charActiveIdRef.current = null;
  };
  const closeCharSwipe = (id: string | number) => setCharOffsets(prev => ({ ...prev, [id]: 0 }));

  const handleEditStory = (story: Story) => {
    closeStorySwipe(story.id as any);
    if (onEditStory) onEditStory(story);
  };
  const handleConfirmDelete = async (id: string | number) => {
    const story = localStories.find(s => s.id === id);
    setConfirmStoryId(null);
    if (onDeleteStory && story) {
      onDeleteStory(story);
      return;
    }
    try {
      await deleteUserStory(id);
      setLocalStories(prev => prev.filter(s => s.id !== id));
    } catch { }
  };

  const handleEditCharacter = (char: Character) => {
    closeCharSwipe(char.id);
    if (onEditCharacter) onEditCharacter(char);
  };

  const handleConfirmDeleteChar = async (id: string | number) => {
    const char = localCharacters.find(c => c.id === id);
    setConfirmCharId(null);
    if (onDeleteCharacter && char) {
      onDeleteCharacter(char);
      // We assume parent updates the list, but we can also update local state optimistically
      // setLocalCharacters(prev => prev.filter(c => c.id !== id)); 
      // Actually if onDeleteCharacter is provided, we rely on it. But for consistency with story:
    }

    // If we want to handle it internally like story:
    try {
      await deleteUserCharacter(id);
      setLocalCharacters(prev => prev.filter(c => c.id !== id));
      if (onDeleteCharacter && char) onDeleteCharacter(char);
    } catch { }
  };


  return (
    <div className="h-full w-full bg-[#F8F9FB] flex flex-col font-kosugi relative">

      {/* Cropper Modal */}
      {tempAvatar && (
        <ImageCropper
          imageSrc={tempAvatar}
          onCancel={() => setTempAvatar(null)}
          onCrop={async (cropped) => {
            const token = localStorage.getItem('user_access_token');
            let avatarUrl: string | undefined = cropped;
            try {
              if (cropped && cropped.startsWith('data:image')) {
                const blob = dataUrlToBlob(cropped);
                const fd = new FormData();
                const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
                fd.append('avatar', blob, 'avatar.jpg');
                fd.append('filename', fname);
                avatarUrl = `/uploads/users/avatars/${fname}`;
                await fetch('/api/uploads/avatar', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd }).catch(() => { });
              }
            } catch { }
            try { const { authFetch } = await import('../services/http'); await authFetch('/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: avatarUrl }) }) } catch { }
            onUpdateProfile({ ...userProfile, avatar: avatarUrl || userProfile.avatar });
            setTempAvatar(null);
          }}
        />
      )}

      {/* 1. Header Area with Gradient */}
      <div className="relative pb-4">
        <div className="h-40 bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 rounded-b-[40px] relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-20px] left-[-20px] w-40 h-40 bg-white/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-[-10px] right-[-10px] w-32 h-32 bg-purple-400/20 rounded-full blur-xl"></div>
        </div>

        {/* Profile Card - Compacted */}
        <div className="absolute top-16 left-4 right-4 bg-white rounded-3xl shadow-lg p-4 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
          {/* Avatar - Smaller Size */}
          <div className="relative -mt-12 mb-2 group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
              {(!userImgError && (userProfile.avatar || '/uploads/avatars/default_avatar.jpg')) ? (
                <img src={userProfile.avatar || '/uploads/avatars/default_avatar.jpg'} alt="Me" className="w-full h-full object-cover" onError={() => setUserImgError(true)} />
              ) : (
                <span className="text-xl font-bold text-slate-500">{userProfile.nickname?.[0] || '?'}</span>
              )}
            </div>
          <div className="absolute bottom-0 right-0 bg-primary-500 p-1.5 rounded-full text-white border-2 border-white shadow-sm">
            <Camera size={10} />
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>

          {/* Name & Edit */}
          <div className="flex items-center gap-2 mb-1">
            {isEditingName ? (
              <input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                autoFocus
                className="text-lg font-bold text-center text-slate-800 border-b-2 border-primary-300 outline-none bg-transparent min-w-[100px]"
              />
            ) : (
              <h2 className="text-lg font-bold text-slate-800">{userProfile.nickname}</h2>
            )}
            {!isEditingName && (
              <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-primary-500">
                <Edit2 size={12} />
              </button>
            )}
          </div>

          {/* Email Only */}
          <div className="flex flex-col items-center gap-1 mb-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold bg-slate-50 px-3 py-0.5 rounded-full">
              <Mail size={10} />
              <span className="tracking-wide">{userProfile.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Content - Added margin top to clear the card */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 no-scrollbar mt-8">
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-400 rounded-full"></div>
              <h3 className="font-bold text-slate-700">我的故事</h3>
            </div>
            <button
              onClick={onAddStory}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-purple-500 border border-purple-100 shadow-sm hover:bg-purple-50 active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>
          {localStories && localStories.length > 0 ? (
            <div className="flex flex-col gap-3">
              {localStories.map(story => (
                <div key={story.id} className="relative overflow-hidden rounded-2xl">
                  {(() => {
                    const offset = storyOffsets[story.id] || 0;
                    const revealRight = Math.min(96, Math.max(0, -offset));
                    const revealLeft = Math.min(96, Math.max(0, offset));
                    return (
                      <>
                        <div className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center justify-center rounded-r-2xl shadow-sm" style={{ width: `${revealRight}px`, transition: 'width 120ms ease' }}>
                          <button onClick={() => setConfirmStoryId(story.id)} className="text-white font-bold drop-shadow-sm">删除</button>
                        </div>
                        <div className="absolute left-0 top-0 bottom-0 bg-indigo-500 flex items-center justify-center rounded-l-2xl shadow-sm" style={{ width: `${revealLeft}px`, transition: 'width 120ms ease' }}>
                          <button onClick={() => handleEditStory(story)} className="text-white font-bold drop-shadow-sm">编辑</button>
                        </div>
                      </>
                    )
                  })()}
                  <div
                    onTouchStart={(e) => onStoryTouchStart(e, story.id)}
                    onTouchMove={(e) => onStoryTouchMove(e, story.id)}
                    onTouchEnd={() => onStoryTouchEnd(story.id)}
                    onContextMenu={(e) => handleContextMenu(e, story.id, 'story')}
                    onClick={() => { if ((storyOffsets[story.id] || 0) === 0) { onReadStory && onReadStory(story); } }}
                    style={{ transform: `translateX(${storyOffsets[story.id] || 0}px)`, transition: 'transform 180ms ease' }}
                    className={`${(storyOffsets[story.id] || 0) < 0 ? 'rounded-l-2xl rounded-r-none' : (storyOffsets[story.id] || 0) > 0 ? 'rounded-l-none rounded-r-2xl' : 'rounded-2xl'} bg-white p-3 shadow-sm flex gap-4 border border-transparent hover:border-indigo-100 group relative overflow-hidden`}
                  >
                    <div className="w-16 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative">
                      <img src={story.image || '/uploads/covers/default_storyimg.jpg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={story.title} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 text-base">{story.title}</h4>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${story.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            {story.status === 'published' ? '公开' : '草稿'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{story.description}</p>
                      <div className="flex gap-2 mt-2">
                        {(story.tags || []).slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="self-center">
                      <PenTool size={16} className="text-slate-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-50 border-dashed">
              <p className="text-xs text-slate-400">还没有创作过故事</p>
            </div>
          )}
        </div>

        {/* My Characters */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-400 rounded-full"></div>
              <h3 className="font-bold text-slate-700">我的角色</h3>
            </div>
            <button
              onClick={onAddCharacter}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-purple-500 border border-purple-100 shadow-sm hover:bg-purple-50 active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>

          {localCharacters.length > 0 ? (
            <div className="flex flex-col gap-3">
              {localCharacters.map(char => (
                <div key={char.id} className="relative overflow-hidden rounded-2xl">
                  {(() => {
                    const offset = charOffsets[char.id] || 0;
                    const revealRight = Math.min(96, Math.max(0, -offset));
                    const revealLeft = Math.min(96, Math.max(0, offset));
                    return (
                      <>
                        <div className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center justify-center rounded-r-2xl shadow-sm" style={{ width: `${revealRight}px`, transition: 'width 120ms ease' }}>
                          <button onClick={() => setConfirmCharId(char.id)} className="text-white font-bold drop-shadow-sm">删除</button>
                        </div>
                        <div className="absolute left-0 top-0 bottom-0 bg-indigo-500 flex items-center justify-center rounded-l-2xl shadow-sm" style={{ width: `${revealLeft}px`, transition: 'width 120ms ease' }}>
                          <button onClick={() => handleEditCharacter(char)} className="text-white font-bold drop-shadow-sm">编辑</button>
                        </div>
                      </>
                    )
                  })()}
                  <div
                    onClick={() => onCharacterClick(char)}
                    onTouchStart={(e) => onCharTouchStart(e, char.id)}
                    onTouchMove={(e) => onCharTouchMove(e, char.id)}
                    onTouchEnd={() => onCharTouchEnd(char.id)}
                    onContextMenu={(e) => handleContextMenu(e, char.id, 'character')}
                    style={{ transform: `translateX(${charOffsets[char.id] || 0}px)`, transition: 'transform 180ms ease' }}
                    className={`${(charOffsets[char.id] || 0) < 0 ? 'rounded-l-2xl rounded-r-none' : (charOffsets[char.id] || 0) > 0 ? 'rounded-l-none rounded-r-2xl' : 'rounded-2xl'} bg-white p-3 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-purple-100 group relative overflow-hidden`}
                  >
                    <MyCharacterAvatar avatar={char.avatar} name={char.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800">{char.name}</h4>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${((char as any).isPublished ? (char.isPublic ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600') : 'bg-slate-100 text-slate-400')}`}>
                            {((char as any).isPublished ? (char.isPublic ? '公开' : '私密') : '草稿')}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">{char.oneLinePersona || char.bio}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-50 border-dashed">
              <p className="text-xs text-slate-400">还没有创建过角色</p>
            </div>
          )}
        </div>



        {/* Survey Link */}
        <div className="bg-indigo-50 rounded-3xl shadow-sm p-2">
          <button
            onClick={() => { try { window.open('https://demo.linksurge.ai', '_blank', 'noopener,noreferrer') } catch {} }}
            className="w-full flex items-center justify-center p-2 rounded-2xl"
          >
            <span className="text-center font-bold text-indigo-600 text-base">调查问卷</span>
          </button>
        </div>

        {/* System Menu - Only Logout */}
        <div className="bg-white rounded-3xl shadow-sm p-2">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-3 p-2 hover:bg-red-50 active:bg-red-100 active:scale-95 rounded-2xl transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </div>
            <span className="text-center font-bold text-slate-700 text-sm group-hover:text-red-500">退出登录</span>
            <div className="w-8 h-8 opacity-0"></div>
          </button>
        </div>

      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-6 w-[80%] max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">你确定要退出吗？</h3>
            <p className="text-xs text-slate-400 mb-6 px-4 leading-relaxed">
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-colors text-sm"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStoryId && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/20 animate-[fadeBg_200ms_ease]"></div>
          <div className="fixed inset-0 z-[90] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm animate-[fadeCard_200ms_ease]">
              <div className="px-6 py-5 text-center text-slate-800 font-bold">确认删除此故事？</div>
              <div className="h-[1px] bg-slate-100"></div>
              <div className="flex">
                <button className="flex-1 py-4 text-slate-600 active:opacity-70" onClick={() => { if (confirmStoryId != null) closeStorySwipe(confirmStoryId); setConfirmStoryId(null); }}>取消</button>
                <div className="w-[1px] bg-slate-100"></div>
                <button className="flex-1 py-4 text-red-600 font-bold active:opacity-70" onClick={() => { const id = confirmStoryId as any; handleConfirmDelete(id); }}>确认删除</button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes fadeCard { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes fadeBg { from { opacity: 0 } to { opacity: 1 } }
          `}</style>
        </>
      )}

      {confirmCharId && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/20 animate-[fadeBg_200ms_ease]"></div>
          <div className="fixed inset-0 z-[90] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm animate-[fadeCard_200ms_ease]">
              <div className="px-6 py-5 text-center text-slate-800 font-bold">确认删除此角色？</div>
              <div className="h-[1px] bg-slate-100"></div>
              <div className="flex">
                <button className="flex-1 py-4 text-slate-600 active:opacity-70" onClick={() => { if (confirmCharId != null) closeCharSwipe(confirmCharId); setConfirmCharId(null); }}>取消</button>
                <div className="w-[1px] bg-slate-100"></div>
                <button className="flex-1 py-4 text-red-600 font-bold active:opacity-70" onClick={() => { const id = confirmCharId as any; handleConfirmDeleteChar(id); }}>确认删除</button>
              </div>
            </div>
          </div>
        </>
      )}

      {preMountLoading && (
        <div className="fixed inset-0 z-[90] bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            <div className="text-sm tracking-wide">正在读取头像...</div>
          </div>
        </div>
      )}

      {/* Context Menu */}
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
              onClick={() => {
                if (contextMenu.type === 'story') {
                  const story = localStories.find(s => s.id === contextMenu.id);
                  if (story) handleEditStory(story);
                } else if (contextMenu.type === 'character') {
                  const char = localCharacters.find(c => c.id === contextMenu.id);
                  if (char) handleEditCharacter(char);
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
            >
              <Edit2 size={16} className="text-indigo-500" />
              编辑
            </button>
            <div className="h-[1px] bg-slate-100 w-full"></div>
            <button
              onClick={() => {
                if (contextMenu.type === 'story') {
                  setConfirmStoryId(contextMenu.id);
                } else if (contextMenu.type === 'character') {
                  setConfirmCharId(contextMenu.id);
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} />
              删除
            </button>
          </div>
        </>
      )}

    </div>
  );
};
