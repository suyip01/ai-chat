
import React, { useState, useRef } from 'react';
import { ChevronLeft, Pencil, User as UserIcon } from 'lucide-react';
import { upsertUserChatRole } from '../services/chatService'
import { UserPersona } from '../types';
import { ImageCropper } from './ImageCropper';
import { AnimatePresence, motion } from 'framer-motion'
import { androidBottomSheet, fade } from '../animations'

interface UserCharacterSettingsProps {
  currentPersona?: UserPersona;
  onBack: () => void;
  onSave: (persona: UserPersona) => void;
  withinContainer?: boolean;
}

export const UserCharacterSettings: React.FC<UserCharacterSettingsProps> = ({ currentPersona, onBack, onSave, withinContainer = false }) => {
  const [gender, setGender] = useState<'male' | 'female' | 'secret'>(currentPersona?.gender || 'female');
  const [name, setName] = useState(currentPersona?.name || '');
  const [age, setAge] = useState(currentPersona?.age || '');
  const [profession, setProfession] = useState(currentPersona?.profession || '');
  const [basicInfo, setBasicInfo] = useState(currentPersona?.basicInfo || '');
  const [personality, setPersonality] = useState(currentPersona?.personality || '');
  const [avatar, setAvatar] = useState<string | undefined>(currentPersona?.avatar);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  
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

  const handleSave = async () => {
    const token = localStorage.getItem('user_access_token');
    let avatarUrl = avatar;
    try {
      if (avatar && avatar.startsWith('data:image')) {
        const blob = dataUrlToBlob(avatar);
        const fd = new FormData();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        fd.append('avatar', blob, 'avatar.jpg');
        fd.append('filename', fname);
        avatarUrl = `/uploads/users/avatars/${fname}`;
        const uploadReq = fetch('/api/uploads/avatar', {
          method: 'POST',
          headers: { Authorization: token ? `Bearer ${token}` : '' },
          body: fd,
        });
        uploadReq.catch(() => {});
      }
      const persona = {
        gender,
        name,
        age,
        profession,
        basicInfo,
        personality,
        avatar: avatarUrl || undefined
      }
      await upsertUserChatRole(persona)
    } catch {}

    onSave({
      gender,
      name,
      age,
      profession,
      basicInfo,
      personality,
      avatar: avatarUrl,
    });
    onBack();
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

  return (
    <div className={`${withinContainer ? 'absolute' : 'fixed'} inset-0 z-[80]`}>
      <motion.div className="absolute inset-0 bg-[#F8F9FA]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={fade} />
      <motion.div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] flex flex-col h-[92vh] w-full overflow-y-auto no-scrollbar" initial={{ y: '100%' }} animate={{ y: 0 }} transition={androidBottomSheet}>
      
      {/* Cropper Modal */}
      {tempAvatar && (
         <ImageCropper 
            imageSrc={tempAvatar}
            onCancel={() => setTempAvatar(null)}
            onCrop={(cropped) => {
                setAvatar(cropped);
                setTempAvatar(null);
            }}
         />
      )}

      {/* Header */}
      <div className="mx-auto w-full max-w-md bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm border-b border-slate-100 rounded-none md:rounded-t-3xl">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
           <ChevronLeft size={24} />
        </button>
        <button 
            onClick={handleSave}
            className="bg-purple-50 text-purple-600 px-4 py-1.5 rounded-lg text-sm font-bold active:scale-95 transition-transform"
        >
           完成
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-md bg-white p-4 space-y-3 pb-10 rounded-none md:rounded-b-3xl md:shadow-2xl">
        
        {/* Avatar Section */}
        <div className="flex justify-center py-6">
           <div 
             onClick={handleAvatarClick}
             className="relative group cursor-pointer active:scale-95 transition-transform"
           >
              <div className="w-24 h-24 rounded-full bg-pink-200 flex items-center justify-center text-white shadow-sm border-4 border-white overflow-hidden">
                 {avatar ? (
                   <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <UserIcon size={48} fill="currentColor" />
                 )}
              </div>
              <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-slate-100">
                 <Pencil size={14} className="text-slate-400" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
           </div>
        </div>

        {/* Gender */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
           <label className="block font-bold text-slate-800 text-sm mb-4">性别</label>
           <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${gender === 'male' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {gender === 'male' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                 </div>
                 <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="hidden" />
                 <span className="text-sm text-slate-700 group-hover:text-slate-900">男性</span>
              </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${gender === 'female' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {gender === 'female' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                 </div>
                 <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="hidden" />
                 <span className="text-sm text-slate-700 group-hover:text-slate-900">女性</span>
              </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${gender === 'secret' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {gender === 'secret' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                 </div>
                 <input type="radio" name="gender" value="secret" checked={gender === 'secret'} onChange={() => setGender('secret')} className="hidden" />
                 <span className="text-sm text-slate-700 group-hover:text-slate-900">未透露</span>
              </label>
           </div>
        </div>

        {/* Name */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
           <label className="block font-bold text-slate-800 text-sm mb-2">名字 (必填)</label>
           <input 
             type="text" 
             placeholder="请输入您的名字" 
             className="w-full text-sm outline-none placeholder:text-slate-300 py-1"
             value={name}
             onChange={e => setName(e.target.value)}
           />
        </div>

        {/* Age */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
           <label className="block font-bold text-slate-800 text-sm mb-2">年龄</label>
           <input 
             type="text" 
             placeholder="请输入角色年龄" 
             className="w-full text-sm outline-none placeholder:text-slate-300 py-1"
             value={age}
             onChange={e => setAge(e.target.value)}
           />
        </div>

        {/* Profession */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
           <label className="block font-bold text-slate-800 text-sm mb-2">职业</label>
           <input 
             type="text" 
             placeholder="请输入角色职业" 
             className="w-full text-sm outline-none placeholder:text-slate-300 py-1"
             value={profession}
             onChange={e => setProfession(e.target.value)}
           />
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
           <label className="block font-bold text-slate-800 text-sm mb-2">基本信息</label>
           <textarea 
             placeholder="角色身份背景和外貌特征..." 
             className="w-full text-sm outline-none placeholder:text-slate-300 py-1 resize-none h-20"
             value={basicInfo}
             onChange={e => setBasicInfo(e.target.value)}
           />
        </div>

        {/* Personality */}
        <div className="bg白 rounded-xl p-5 shadow-sm">
           <label className="block font-bold text-slate-800 text-sm mb-2">性格描述</label>
           <textarea 
             placeholder="请输入性格描述..." 
             className="w-full text-sm outline-none placeholder:text-slate-300 py-1 resize-none h-20"
             value={personality}
             onChange={e => setPersonality(e.target.value)}
           />
        </div>

        </div>

      </motion.div>
    </div>
  );
};
