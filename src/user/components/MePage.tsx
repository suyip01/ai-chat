
import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, LogOut, Camera, Edit2, Mail, User as UserIcon, MessageSquare } from 'lucide-react';
import { Character, UserProfile, UserPersona } from '../types';
import { ImageCropper } from './ImageCropper';
import { UserCharacterSettings } from './UserCharacterSettings';
import { UserRoleSelectorSheet } from './UserRoleSelectorSheet';

interface MePageProps {
  userProfile: UserProfile;
  myCharacters: Character[];
  myUserCharacters: Character[];
  myStories: any[]; // Placeholder for stories
  onUpdateProfile: (profile: UserProfile) => void;
  onCharacterClick: (character: Character) => void;
  onLogout: () => void;
}

export const MePage: React.FC<MePageProps> = ({ 
  userProfile, 
  myCharacters, 
  myUserCharacters,
  myStories, 
  onUpdateProfile,
  onCharacterClick,
  onLogout 
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.nickname);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [userPersona, setUserPersona] = useState<UserPersona | undefined>(undefined);
  const [userRoleId, setUserRoleId] = useState<number | undefined>(undefined);
  const [chatCount, setChatCount] = useState<number>(userProfile.usedCount ?? 0);
  
  
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatar(reader.result as string);
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
    setChatCount(userProfile.usedCount ?? 0)
  }, [userProfile.usedCount])

  

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
                    const fname = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.jpg`;
                    fd.append('avatar', blob, 'avatar.jpg');
                    fd.append('filename', fname);
                    avatarUrl = `/uploads/users/avatars/${fname}`;
                    await fetch('/api/uploads/avatar', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd }).catch(() => {});
                  }
                } catch {}
                try { const { authFetch } = await import('../services/http'); await authFetch('/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: avatarUrl }) }) } catch {}
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
        <div className="absolute top-20 left-4 right-4 bg-white rounded-3xl shadow-lg p-4 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
             {/* Avatar - Smaller Size */}
             <div className="relative -mt-12 mb-2 group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100">
                    <img src={userProfile.avatar || '/uploads/avatars/default_avatar.jpg'} alt="Me" className="w-full h-full object-cover" />
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
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 no-scrollbar mt-14">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsRoleSheetOpen(true)}
            className="bg-white rounded-3xl shadow-[0_6px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.08)] active:shadow-[0_12px_28px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all p-5 flex flex-col items-center justify-center gap-2 border border-transparent"
          >
            <div className="w-12 h-12 rounded-full bg-purple-50 text-primary-600 flex items-center justify-center">
              <UserIcon size={22} />
            </div>
            <div className="text-slate-800 font-bold text-sm">我的档案</div>
          </button>
          <div className="bg-white rounded-3xl shadow-[0_6px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.08)] active:shadow-[0_12px_28px_rgba(0,0,0,0.12)] p-5 flex flex-col items-center justify-center gap-2 border border-transparent">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-primary-600 flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
            <div className="text-slate-800 font-bold text-sm">聊天次数：{chatCount}</div>
          </div>
        </div>
         
         {/* My Characters */}
         <div>
            <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-1 h-4 bg-purple-400 rounded-full"></div>
                <h3 className="font-bold text-slate-700">我的角色</h3>
            </div>
            
            {(myUserCharacters.length > 0 ? myUserCharacters : myCharacters).length > 0 ? (
                <div className="flex flex-col gap-3">
                    {(myUserCharacters.length > 0 ? myUserCharacters : myCharacters).map(char => (
                        <div 
                            key={char.id} 
                            onClick={() => onCharacterClick(char)}
                            className="bg白 p-3 rounded-2xl shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-purple-100"
                        >
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-50">
                                <img src={char.avatar} className="w-full h-full object-cover" alt={char.name} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800">{char.name}</h4>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${char.isPublic ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {char.isPublic ? '公开' : '私密'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-1">{char.oneLinePersona || char.bio}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg白 rounded-2xl p-6 text-center shadow-sm border border-slate-50 border-dashed">
                    <p className="text-xs text-slate-400">还没有创建过角色</p>
                </div>
            )}
         </div>

         {/* My Stories */}
         <div>
            <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-1 h-4 bg-pink-400 rounded-full"></div>
                <h3 className="font-bold text-slate-700">我的故事</h3>
            </div>
             <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-50 border-dashed flex flex-col items-center gap-2">
                 {/* Placeholder for no stories */}
                 <p className="text-xs text-slate-400">还没有穿越过故事</p>
            </div>
         </div>

         {/* System Menu - Only Logout */}
         <div className="bg-white rounded-3xl shadow-sm p-2">
            <button 
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-3 p-2 hover:bg-red-50 rounded-2xl transition-colors group"
            >
                 <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                    <LogOut size={16} />
                 </div>
                 <span className="text-center font-bold text-slate-700 text-sm group-hover:text-red-500">退出登录</span>
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

      {isPersonaOpen && (
        <UserCharacterSettings
          currentPersona={userPersona}
          roleId={userRoleId}
          onBack={() => setIsPersonaOpen(false)}
          onSave={(p) => { setUserPersona(p); setIsPersonaOpen(false); }}
          withinContainer
        />
      )}

      <UserRoleSelectorSheet
        isOpen={isRoleSheetOpen}
        currentPersona={userPersona}
        onClose={() => setIsRoleSheetOpen(false)}
        onAdd={() => { setIsRoleSheetOpen(false); setUserRoleId(undefined); setUserPersona(undefined); setIsPersonaOpen(true) }}
        onSelect={(persona, roleId) => { setUserPersona(persona); setUserRoleId(roleId as number); setIsRoleSheetOpen(false); setIsPersonaOpen(true) }}
      />

    </div>
  );
};
