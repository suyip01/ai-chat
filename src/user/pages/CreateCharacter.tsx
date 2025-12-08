
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Plus, ChevronRight, X, ChevronDown, ChevronUp, Globe, Lock, Info, AlertCircle } from 'lucide-react';
import { Character, CharacterStatus } from '../types';
import { ImageCropper } from '../components/ImageCropper';
import { createCharacter, createUserCharacterDraft, updateUserCharacter, updateUserCharacterDraft, getUserCharacter } from '../services/userCharactersService'

interface CreateCharacterProps {
  onBack: () => void;
  onCreate: (character: Character) => void;
  isEdit?: boolean;
  characterId?: number | string;
  initial?: Partial<Character>;
  onUpdated?: (character: Character) => void;
  onSaveDraft?: (character: Character) => void;
}

export const CreateCharacter: React.FC<CreateCharacterProps> = ({ onBack, onCreate, isEdit = false, characterId, initial, onUpdated, onSaveDraft }) => {
  const [form, setForm] = useState({
    type: '原创角色',
    avatar: '',
    profileImage: '', // Store original image here
    name: '',
    gender: '男',
    age: '',
    profession: '',
    tagline: '',
    personality: '',
    searchTags: [] as string[],
    relationship: '陌生人',
    plotTheme: '',
    plotSummary: '',
    openingLine: '',
    styleExamples: ['', '', ''],
    hobbies: '',
    experiences: '',
    isPublic: true
  });

  const [isCustomRel, setIsCustomRel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Cropping State
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [preMountLoading, setPreMountLoading] = useState(false);
  
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

  useEffect(() => {
    if (initial) {
      setForm(prev => ({
        ...prev,
        type: initial.roleType || prev.type,
        avatar: initial.avatar || prev.avatar,
        profileImage: initial.profileImage || prev.profileImage,
        name: initial.name || prev.name,
        gender: (initial.gender as any) || prev.gender,
        age: (initial.age as any) || prev.age,
        profession: initial.profession || prev.profession,
        tagline: initial.oneLinePersona || prev.tagline,
        personality: initial.personality || prev.personality,
        relationship: initial.currentRelationship || prev.relationship,
        plotTheme: initial.plotTheme || prev.plotTheme,
        plotSummary: initial.plotDescription || prev.plotSummary,
        openingLine: initial.openingLine || prev.openingLine,
        styleExamples: Array.isArray(initial.styleExamples) && initial.styleExamples.length ? initial.styleExamples : prev.styleExamples,
        hobbies: initial.hobbies || prev.hobbies,
        experiences: initial.experiences || prev.experiences,
        searchTags: Array.isArray(initial.tags) ? initial.tags : prev.searchTags,
        isPublic: typeof initial.isPublic === 'boolean' ? initial.isPublic : prev.isPublic
      }))
    }
  }, [initial, isEdit]);

  useEffect(() => {
    if (!isEdit || !characterId) return;
    const needTags = !(initial && Array.isArray(initial.tags) && initial.tags.length);
    const needStyles = !(initial && Array.isArray(initial.styleExamples) && initial.styleExamples.length);
    if (!needTags && !needStyles) return;
    (async () => {
      try {
        const data: any = await getUserCharacter(characterId);
        const se: string[] = Array.isArray(data?.styleExamples) ? data.styleExamples.slice(0, 3) : [];
        while (se.length < 3) se.push('');
        setForm(prev => ({
          ...prev,
          name: data?.name ?? prev.name,
          gender: data?.gender ?? prev.gender,
          avatar: data?.avatar ?? prev.avatar,
          tagline: data?.tagline ?? prev.tagline,
          personality: data?.personality ?? prev.personality,
          relationship: data?.relationship ?? prev.relationship,
          plotTheme: data?.plot_theme ?? prev.plotTheme,
          plotSummary: data?.plot_summary ?? prev.plotSummary,
          openingLine: data?.opening_line ?? prev.openingLine,
          hobbies: data?.hobbies ?? prev.hobbies,
          experiences: data?.experiences ?? prev.experiences,
          age: (data?.age != null ? String(data.age) : prev.age),
          profession: data?.occupation ?? prev.profession,
          searchTags: Array.isArray(data?.tags) ? data.tags : prev.searchTags,
          styleExamples: se,
          isPublic: data?.visibility ? data.visibility === 'public' : prev.isPublic
        }))
      } catch {}
    })();
  }, [isEdit, characterId, initial]);

  const roleTypes = ['原创角色', '二次创作', '其他'];
  const relationships = ['陌生人', '暧昧', '恋爱中', '冷战', '分手'];
  const availableTags = [
    'M/M', 'M/F', 'BL', 'BG', '耽美',
    '百合', '责任感', '偶像', '占有欲', '霸道',
    '调戏', '腹黑', '温柔', '年下', '年上',
    '感性', '体贴', '理性', '反差', '激情',
    '校园', '贴心', '偏执', '疯批', '傲娇',
    '职场', '冷漠', '忧郁', '人夫', '养胃',
    '控制欲', '黏人', '可爱', '成熟', '性感', '四爱'
  ];

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreMountLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        // Set tempAvatar to trigger Cropper
        setTempAvatar(reader.result as string);
        setPreMountLoading(false);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTag = (tag: string) => {
    if (form.searchTags.includes(tag)) {
      setForm(prev => ({ ...prev, searchTags: prev.searchTags.filter(t => t !== tag) }));
    } else {
      setForm(prev => ({ ...prev, searchTags: [...prev.searchTags, tag] }));
    }
  };

  const addCustomTag = () => {
    const val = customTagInput.trim();
    if (val && !form.searchTags.includes(val)) {
      setForm(prev => ({ ...prev, searchTags: [...prev.searchTags, val] }));
      setCustomTagInput('');
    }
  };

  const handleDraftAction = async (save: boolean) => {
      if (save) {
          try {
            const token = localStorage.getItem('user_access_token');
            let avatarUrl = form.avatar || null as string | null;
            if (avatarUrl && avatarUrl.startsWith('data:image')) {
              const blob = dataUrlToBlob(avatarUrl);
              const fd = new FormData();
              const fname = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.jpg`;
              fd.append('avatar', blob, 'avatar.jpg');
              fd.append('filename', fname);
              avatarUrl = `/uploads/users/avatars/${fname}`;
              try { await fetch('/api/uploads/avatar', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd }); } catch {}
            }
            const payload: any = {
              name: form.name || '未命名',
              gender: form.gender,
              avatar: avatarUrl,
              identity: null,
              tagline: form.tagline,
              personality: form.personality,
              relationship: form.relationship,
              plotTheme: form.plotTheme,
              plotSummary: form.plotSummary,
              openingLine: form.openingLine,
              hobbies: form.hobbies,
              experiences: form.experiences,
              age: form.age ? parseInt(form.age, 10) || null : null,
              occupation: form.profession,
              character_type: form.type,
              visibility: form.isPublic ? 'public' : 'private',
              tags: form.searchTags,
              styleExamples: form.styleExamples.filter(Boolean)
            }
            let savedId: number | null = null;
            if (isEdit && characterId) {
              await updateUserCharacterDraft(characterId, payload)
              savedId = typeof characterId === 'number' ? characterId : (parseInt(String(characterId)) || null)
            } else {
              savedId = await createUserCharacterDraft(payload)
            }
            const draftCharacter: Character = {
              id: savedId ? String(savedId) : (characterId ? String(characterId) : `c_${Date.now()}`),
              name: form.name || '未命名',
              avatar: form.avatar || '',
              profileImage: form.profileImage || form.avatar || '',
              status: CharacterStatus.ONLINE,
              bio: form.tagline || '',
              tags: form.searchTags,
              creator: '我',
              oneLinePersona: form.tagline,
              personality: form.personality,
              profession: form.profession,
              age: form.age,
              roleType: form.type,
              currentRelationship: form.relationship,
              plotTheme: form.plotTheme,
              plotDescription: form.plotSummary,
              openingLine: form.openingLine,
              styleExamples: form.styleExamples.filter(Boolean),
              hobbies: form.hobbies,
              experiences: form.experiences,
              isPublic: form.isPublic
            } as any
            if (onSaveDraft) onSaveDraft(draftCharacter)
          } catch {}
          try { localStorage.removeItem('create_character_draft') } catch {}
      } else {
          localStorage.removeItem('create_character_draft');
          setForm({
            type: '原创角色',
            avatar: '',
            profileImage: '',
            name: '',
            gender: '男',
            age: '',
            profession: '',
            tagline: '',
            personality: '',
            searchTags: [],
            relationship: '陌生人',
            plotTheme: '',
            plotSummary: '',
            openingLine: '',
            styleExamples: ['', '', ''],
            hobbies: '',
            experiences: '',
            isPublic: true
          });
      }
      setShowDraftModal(false);
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.age.trim()) newErrors.age = true;
    if (!form.profession.trim()) newErrors.profession = true;
    if (!form.tagline.trim()) newErrors.tagline = true;
    if (!form.personality.trim()) newErrors.personality = true;
    if (form.searchTags.length === 0) newErrors.searchTags = true;
    if (!form.relationship.trim()) newErrors.relationship = true;
    if (!form.plotTheme.trim()) newErrors.plotTheme = true;
    if (!form.plotSummary.trim()) newErrors.plotSummary = true;
    if (!form.openingLine.trim()) newErrors.openingLine = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
        setShowErrorModal(true);
        return;
    }

    // Create on server
    let backendId: number | null = null
    try {
      const token = localStorage.getItem('user_access_token');
      let avatarUrl = form.avatar || null as string | null;
      if (avatarUrl && avatarUrl.startsWith('data:image')) {
        const blob = dataUrlToBlob(avatarUrl);
        const fd = new FormData();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.jpg`;
        fd.append('avatar', blob, 'avatar.jpg');
        fd.append('filename', fname);
        avatarUrl = `/uploads/users/avatars/${fname}`;
        try { await fetch('/api/uploads/avatar', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd }); } catch {}
      }
      const payload: any = {
        name: form.name,
        gender: form.gender,
        avatar: avatarUrl,
        identity: null,
        tagline: form.tagline,
        personality: form.personality,
        relationship: form.relationship,
        plotTheme: form.plotTheme,
        plotSummary: form.plotSummary,
        openingLine: form.openingLine,
        hobbies: form.hobbies,
        experiences: form.experiences,
        age: form.age ? parseInt(form.age, 10) || null : null,
        occupation: form.profession,
        character_type: form.type,
        visibility: form.isPublic ? 'public' : 'private',
        tags: form.searchTags,
        styleExamples: form.styleExamples.filter(Boolean)
      }
      if (isEdit && characterId) {
        await updateUserCharacter(characterId, payload)
        backendId = typeof characterId === 'number' ? characterId : parseInt(String(characterId)) || null
      } else {
        backendId = await createCharacter(payload)
      }
    } catch {}

    // Create new Character Object (for local UI)
    const newCharacter: Character = {
        id: backendId ? String(backendId) : `c_${Date.now()}`,
        name: form.name,
        // Use cropped avatar for thumbnail
        avatar: form.avatar || 'https://image.pollinations.ai/prompt/anime%20silhouette%20purple?width=400&height=400&nologo=true', 
        // Use original image for profile background (fallback to avatar if missing)
        profileImage: form.profileImage || form.avatar,
        status: CharacterStatus.ONLINE,
        bio: `${form.age} ${form.profession}`,
        tags: form.searchTags,
        isPinned: false,
        relationshipLevel: 0,
        creator: '我',
        playCount: '0',
        
        // Detailed fields
        age: form.age || '未知', 
        profession: form.profession || '未知', 
        gender: form.gender,
        roleType: form.type,
        isOriginal: form.type === '原创角色',
        oneLinePersona: form.tagline,
        personality: form.personality,
        currentRelationship: form.relationship,
        plotTheme: form.plotTheme,
        plotDescription: form.plotSummary,
        openingLine: form.openingLine,
        
        styleExamples: form.styleExamples.filter(s => s),
        hobbies: form.hobbies,
        experiences: form.experiences,
        isPublic: form.isPublic
    };

    // Remove draft on successful creation
    localStorage.removeItem('create_character_draft');
    if (isEdit) {
      onUpdated ? onUpdated(newCharacter) : onCreate(newCharacter)
    } else {
      onCreate(newCharacter);
    }
  };

  const getStylePlaceholder = (idx: number) => {
      const arr = [
          "例：哼，别以为我会感谢你。",
          "例：今晚月色真美，不一起走走吗？",
          "例：再靠近一步，我就不客气了。"
      ];
      return arr[idx];
  };

  const labelClass = "field-label font-kosugi mb-3 text-slate-700 font-bold text-sm block";

  return (
    <div className="fixed inset-0 bg-white z-[60]">
      <div className="mx-auto w-full max-w-md h-full relative flex flex-col overflow-hidden rounded-3xl shadow-2xl bg白 font-kosugi">
        
        {/* Render Cropper if tempAvatar is present */}
        {tempAvatar && (
            <ImageCropper 
                imageSrc={tempAvatar}
                aspectRatio={1}
                outputWidth={800}
                outputHeight={800}
                onCancel={() => {
                    setTempAvatar(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                onCrop={(croppedImage) => {
                    setForm(prev => ({ 
                        ...prev, 
                        avatar: croppedImage,
                        // SAVE THE ORIGINAL IMAGE HERE for the profile background
                        profileImage: tempAvatar 
                    }));
                    setTempAvatar(null);
                }}
            />
        )}

        {/* Background Elements */}
        <div className="ambient-bg hidden"></div>
        <div className="hidden">
            <div className="star" style={{left: '10%', width: '4px', height: '4px'}}></div>
            <div className="star" style={{left: '80%', animationDelay: '2s', width: '6px', height: '6px'}}></div>
        </div>

        {/* Header */}
        <div className="sticky top-0 z-50 bg-white px-4 py-3 flex items-center border-b border-slate-100 rounded-t-3xl relative">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-purple-800 hover:bg-purple-100 rounded-full transition">
                <ChevronLeft size={20} />
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-purple-900 font-kosugi">{isEdit ? '编辑角色' : '创建角色'}</h1>
            {!isEdit && (
              <button onClick={() => setShowDraftModal(true)} className="ml-auto text-sm font-bold text-purple-600 font-kosugi">存草稿</button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-28 px-4 space-y-6">
            
            {/* 1. Role Type */}
            <section className="mt-4">
                <div className="text-[#2E1065] font-bold text-[0.9rem] mb-2 ml-1 font-kosugi">角色类型设置</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-2">
                    {roleTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setForm(prev => ({ ...prev, type }))}
                            className={`
                                flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap tracking-wide font-kosugi
                                ${form.type === type ? 'bg-purple-500 text-white shadow-purple-200 shadow-md' : 'bg-white/70 text-slate-500 border-transparent'}
                            `}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </section>

            {/* 2. Avatar */}
            <section className="flex flex-col items-center py-2">
                <div 
                    onClick={handleAvatarClick}
                    className="relative group cursor-pointer active:scale-95 transition-transform"
                >
                    <div className="w-24 h-24 rounded-full bg-white border-[3px] border-white shadow-xl flex items-center justify-center overflow-hidden relative">
                        {form.avatar ? (
                            <img src={form.avatar} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                            <div className="text-purple-200 text-3xl">
                                <Camera size={32} />
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-[3px] border-white shadow-md">
                        <Plus size={14} />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <p className="mt-2 text-xs text-purple-400 font-bold tracking-wide font-kosugi">上传头像</p>
            </section>

            {preMountLoading && (
              <div className="fixed inset-0 z-[90] bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-white">
                  <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                  <div className="text-sm tracking-wide">正在读取头像...</div>
                </div>
              </div>
            )}

            {/* 3. Basic Settings */}
            <section className="glass-card p-6 space-y-6">
                <div className="section-title !font-kosugi !text-purple-900 mb-2">基础设定</div>

                {/* Name */}
                <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                        姓名
                        {errors.name && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                    </label>
                    <div className="relative">
                        <input 
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            type="text" 
                            placeholder="例：祁云" 
                            className={`dream-input w-full px-4 py-3 text-sm font-bold ${errors.name ? 'border-red-300 bg-red-50' : ''}`}
                        />
                    </div>
                </div>

                {/* Gender */}
                <div>
                    <label className={labelClass}>性别</label>
                    <div className="flex gap-3">
                        {['男', '女', '其他'].map(g => (
                            <button 
                                key={g}
                                onClick={() => setForm(prev => ({ ...prev, gender: g }))}
                                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition font-kosugi ${
                                    form.gender === g 
                                    ? (g === '男' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200' : g === '女' ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-200' : 'bg-purple-100 text-purple-600 ring-2 ring-purple-200')
                                    : 'bg-white/50 text-slate-400'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Age & Profession Bubble Inputs - Vertical Stack */}
                <div className="space-y-4">
                    <div className="w-full">
                        <label className={`${labelClass} flex items-center gap-1`}>
                            年龄
                            {errors.age && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                        </label>
                        <input 
                            value={form.age}
                            onChange={e => setForm(prev => ({ ...prev, age: e.target.value }))}
                            type="text" 
                            placeholder="例：28岁" 
                            className={`dream-input w-full px-4 py-3 text-sm font-bold rounded-2xl ${errors.age ? 'border-red-300 bg-red-50' : ''}`}
                        />
                    </div>
                    <div className="w-full">
                        <label className={`${labelClass} flex items-center gap-1`}>
                            职业
                            {errors.profession && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                        </label>
                         <input 
                            value={form.profession}
                            onChange={e => setForm(prev => ({ ...prev, profession: e.target.value }))}
                            type="text" 
                            placeholder="例：骨科医生" 
                            className={`dream-input w-full px-4 py-3 text-sm font-bold rounded-2xl ${errors.profession ? 'border-red-300 bg-red-50' : ''}`}
                        />
                    </div>
                </div>

                {/* Tagline */}
                <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                        一句话人设
                        {errors.tagline && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                    </label>
                    <input 
                        value={form.tagline}
                        onChange={e => setForm(prev => ({ ...prev, tagline: e.target.value }))}
                        type="text" 
                        placeholder="例：表面温柔克己实则腹黑" 
                        className={`dream-input w-full px-4 py-3 text-sm ${errors.tagline ? 'border-red-300 bg-red-50' : ''}`}
                    />
                </div>

                {/* Personality */}
                <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                        性格
                        {errors.personality && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                    </label>
                    <textarea 
                        value={form.personality}
                        onChange={e => setForm(prev => ({ ...prev, personality: e.target.value }))}
                        rows={3} 
                        placeholder="例：占有欲强，容易吃醋..." 
                        className={`dream-input w-full px-4 py-3 text-sm resize-none ${errors.personality ? 'border-red-300 bg-red-50' : ''}`}
                    ></textarea>
                </div>

                {/* Tags */}
                <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                        角色标签
                        {errors.searchTags && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                    </label>
                    <div onClick={() => setShowTagModal(true)} className={`dream-input w-full px-3 py-2 min-h-[46px] flex flex-wrap gap-2 items-center bg-white/60 cursor-pointer hover:bg-white/80 transition ${errors.searchTags ? 'border-red-300 bg-red-50' : ''}`}>
                        {form.searchTags.length === 0 && (
                            <span className="text-xs text-[#B3A4C8] ml-1">
                                点击添加标签 (#傲娇 #高冷...)
                            </span>
                        )}
                        {form.searchTags.map(tag => (
                            <span key={tag} className="tag-pill px-2 py-1 flex items-center shadow-sm">
                                #{tag}
                                <X size={12} className="ml-1 opacity-60 hover:opacity-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTag(tag); }} />
                            </span>
                        ))}
                        <ChevronRight className="ml-auto text-purple-300" size={16} />
                    </div>
                </div>

                {/* Relationship */}
                <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                        当下的关系
                        {errors.relationship && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button 
                            onClick={() => { setIsCustomRel(true); setForm(prev => ({...prev, relationship: ''})); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all font-kosugi ${isCustomRel ? 'bg-purple-500 text-white shadow-md' : 'bg-white text-slate-500 border border-purple-100'}`}
                        >
                            自定义
                        </button>
                        {relationships.map(rel => (
                            <button 
                                key={rel}
                                onClick={() => { setIsCustomRel(false); setForm(prev => ({...prev, relationship: rel})); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all font-kosugi ${form.relationship === rel && !isCustomRel ? 'bg-purple-500 text-white shadow-md' : 'bg-white text-slate-500 border border-purple-100'}`}
                            >
                                {rel}
                            </button>
                        ))}
                    </div>
                    {isCustomRel && (
                        <div className="relative animate-in fade-in">
                            <input 
                                value={form.relationship}
                                onChange={e => setForm(prev => ({ ...prev, relationship: e.target.value }))}
                                type="text" 
                                placeholder="请输入自定义关系" 
                                className={`dream-input w-full px-4 py-2 text-sm ${errors.relationship ? 'border-red-300 bg-red-50' : ''}`}
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* 4. Plot */}
            <section className="glass-card p-6 space-y-5">
                <div className="section-title !font-kosugi !text-purple-900 mb-4">第一情节</div>
                <p className="text-xs text-slate-500 leading-relaxed bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex gap-1">
                    <Info size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>第一情节的内容将被应用于和角色的第一次聊天。此外，设定第一情节并选择公开角色后，情节内容将显示在角色资料页上。</span>
                </p>
                <div className="bg-white/40 p-4 rounded-3xl border border-purple-100/50 space-y-4">
                    <div className="relative group/input">
                        <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1 font-kosugi">
                            主题
                            {errors.plotTheme && <span className="text-red-500 text-[10px] font-normal">必填</span>}
                        </label>
                        <input 
                            value={form.plotTheme}
                            onChange={e => setForm(prev => ({ ...prev, plotTheme: e.target.value }))}
                            type="text" 
                            placeholder="例：当温柔人夫终于爆发腹黑属性" 
                            className={`dream-input w-full px-3 py-2.5 rounded-xl text-sm bg-white/80 ${errors.plotTheme ? 'border-red-300 bg-red-50' : ''}`}
                        />
                    </div>
                    <div className="relative group/input">
                        <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1 font-kosugi">
                            情节梗概
                            {errors.plotSummary && <span className="text-red-500 text-[10px] font-normal">必填</span>}
                        </label>
                        <textarea 
                            value={form.plotSummary}
                            onChange={e => setForm(prev => ({ ...prev, plotSummary: e.target.value }))}
                            rows={5} 
                            placeholder="例：在一起这么久了，他还是一如既往的温柔体贴，从来不干涉你的个人生活。今天晚上你去酒吧玩，故意装作喝醉和他打电话，却在他应了一声后开始软声叫着别人的名字......" 
                            className={`dream-input w-full px-3 py-2.5 rounded-xl text-sm bg-white/80 resize-none leading-relaxed ${errors.plotSummary ? 'border-red-300 bg-red-50' : ''}`}
                        ></textarea>
                    </div>
                    <div className="relative group/input">
                        <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1 font-kosugi">
                            开场白
                            {errors.openingLine && <span className="text-red-500 text-[10px] font-normal">必填</span>}
                        </label>
                        <textarea 
                            value={form.openingLine}
                            onChange={e => setForm(prev => ({ ...prev, openingLine: e.target.value }))}
                            rows={2} 
                            placeholder="例：“出来，我在酒吧门口”" 
                            className={`dream-input w-full px-3 py-2.5 rounded-xl text-sm bg-white/80 resize-none ${errors.openingLine ? 'border-red-300 bg-red-50' : ''}`}
                        ></textarea>
                    </div>
                </div>
            </section>

            {/* 5. Advanced */}
            <section className="glass-card p-0 overflow-hidden transition-all">
                 <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between p-6 bg-transparent transition">
                    <div className="flex items-center gap-2">
                        <div className="section-title !font-kosugi !text-purple-900 mb-0">进阶设定</div>
                        <span className="text-[10px] bg-purple-100 text-purple-500 px-1.5 py-0.5 rounded font-bold border border-purple-200 self-center font-kosugi">可选</span>
                    </div>
                    {showAdvanced ? <ChevronUp className="text-purple-400" /> : <ChevronDown className="text-purple-400" />}
                </button>

                {showAdvanced && (
                    <div className="p-6 pt-0 space-y-5 animate-in slide-in-from-top-2">
                        {/* Style Examples */}
                        <div>
                            <label className={labelClass}>说话风格示例</label>
                            <div className="space-y-3">
                                {[0, 1, 2].map(idx => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-purple-300 w-4 font-mono">0{idx+1}</span>
                                        <input 
                                            value={form.styleExamples[idx]}
                                            onChange={e => {
                                                const newEx = [...form.styleExamples];
                                                newEx[idx] = e.target.value;
                                                setForm(prev => ({...prev, styleExamples: newEx}));
                                            }}
                                            type="text" 
                                            placeholder={getStylePlaceholder(idx)} 
                                            className="dream-input flex-1 px-3 py-2.5 rounded-xl text-sm" 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hobbies */}
                        <div>
                            <label className={labelClass}>爱好</label>
                            <textarea 
                                value={form.hobbies}
                                onChange={e => setForm(prev => ({ ...prev, hobbies: e.target.value }))}
                                rows={2} 
                                placeholder="例：喜欢看书、收集古董怀表..." 
                                className="dream-input w-full px-4 py-3 text-sm resize-none"
                            ></textarea>
                        </div>

                        {/* Experiences */}
                         <div>
                            <label className={labelClass}>经历</label>
                            <textarea 
                                value={form.experiences}
                                onChange={e => setForm(prev => ({ ...prev, experiences: e.target.value }))}
                                rows={2} 
                                placeholder="请填写角色个人经历或你们的共同经历" 
                                className="dream-input w-full px-4 py-3 text-sm resize-none"
                            ></textarea>
                        </div>

                        {/* Public Toggle */}
                        <div className="pt-2 border-t border-purple-100">
                             <label className={`${labelClass} mb-1`}>是否公开</label>
                             <p className="text-[10px] text-slate-500 leading-tight mb-3">
                                选择公开，角色将被发布到广场供其他用户选择和使用。不公开角色则仅供个人使用。
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setForm(prev => ({...prev, isPublic: true}))}
                                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-1 font-kosugi ${form.isPublic ? 'bg-purple-500 text-white shadow-md' : 'bg-white text-slate-500 border border-purple-100'}`}
                                >
                                    <Globe size={14} /> 公开
                                </button>
                                <button 
                                    onClick={() => setForm(prev => ({...prev, isPublic: false}))}
                                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-1 font-kosugi ${!form.isPublic ? 'bg-purple-500 text-white shadow-md' : 'bg-white text-slate-500 border border-purple-100'}`}
                                >
                                    <Lock size={14} /> 不公开
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>

        {/* Footer Button */}
        <div className="absolute bottom-0 inset-x-0 mx-auto w-full max-w-md bg-white/90 backdrop-blur-md p-4 z-50 border-t border-purple-50 rounded-b-3xl shadow-2xl">
            <button 
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-purple-300 active:scale-95 transition-transform flex items-center justify-center tracking-widest text-lg font-kosugi"
            >
                {isEdit ? '更新角色卡' : '生成角色卡'}
            </button>
        </div>

        {/* Tag Modal */}
        {showTagModal && (
            <>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[61]" onClick={() => setShowTagModal(false)}></div>
                <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-[30px] z-[62] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[80vh] animate-in slide-in-from-bottom duration-300">
                     <div className="px-5 py-4 flex justify-between items-center border-b border-purple-50 bg-white rounded-t-[30px]">
                        <button onClick={() => setShowTagModal(false)} className="w-8 h-8 rounded-full bg-purple-50 text-purple-800 flex items-center justify-center">
                            <ChevronDown size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-purple-900 font-kosugi">添加 #标签</h3>
                        <button onClick={() => setShowTagModal(false)} className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full font-kosugi">完成</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 pb-10">
                        <div className="mb-4">
                            <div className="text-xs font-bold text-slate-400 mb-2 ml-1 font-kosugi">选定的标签</div>
                            <div className="flex flex-wrap gap-2 min-h-[46px] bg-purple-50/50 p-3 rounded-xl border border-purple-100 border-dashed">
                                {form.searchTags.length === 0 && <span className="text-xs text-slate-400 self-center">暂无标签</span>}
                                {form.searchTags.map(tag => (
                                    <button key={tag} onClick={() => toggleTag(tag)} className="bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 font-kosugi">
                                        #{tag} <X size={10} className="opacity-80" />
                                    </button>
                                ))}
                            </div>
                        </div>

                         <div className="mb-6">
                            <div className="text-xs font-bold text-slate-400 mb-2 ml-1 font-kosugi">直接添加 (自定义)</div>
                            <div className="flex gap-2">
                                <input 
                                    value={customTagInput}
                                    onChange={e => setCustomTagInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                                    type="text" 
                                    placeholder="输入标签，不用加#" 
                                    className="dream-input flex-1 px-4 py-2 text-sm bg-white" 
                                />
                                <button onClick={addCustomTag} className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition font-kosugi">
                                    添加
                                </button>
                            </div>
                        </div>

                         <div>
                            <div className="text-xs font-bold text-slate-400 mb-2 ml-1 font-kosugi">标签选择</div>
                            <div className="grid grid-cols-4 gap-2">
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => toggleTag(tag)}
                                        className={`
                                            rounded-2xl font-bold text-[0.85rem] px-2 py-2 transition-all whitespace-nowrap overflow-hidden text-ellipsis font-kosugi
                                            ${form.searchTags.includes(tag) 
                                                ? 'bg-[#8B5CF6] text-white shadow-md' 
                                                : 'bg-[#F3E8FF] text-[#6B21A8]'
                                            }
                                        `}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* Draft Confirmation Modal */}
        {showDraftModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 w-[80%] max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-slate-800 text-center mb-4 font-kosugi">{isEdit ? '是否只更新内容？' : '是否保存草稿？'}</h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => handleDraftAction(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors font-kosugi"
                        >
                            {isEdit ? '取消' : '否'}
                        </button>
                        <button 
                            onClick={() => handleDraftAction(true)}
                            className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white font-bold shadow-lg shadow-purple-200 hover:bg-purple-600 transition-colors font-kosugi"
                        >
                            {isEdit ? '确认更新' : '是'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Error / Incomplete Content Modal */}
        {showErrorModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 w-[80%] max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-3">
                        <AlertCircle size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 text-center mb-1 font-kosugi">有内容没填写完哦～</h3>
                    <p className="text-xs text-slate-400 text-center mb-5 font-kosugi">请完善所有必填项后继续</p>
                    <button 
                        onClick={() => setShowErrorModal(false)}
                        className="w-full py-2.5 rounded-xl bg-purple-500 text-white font-bold shadow-lg shadow-purple-200 hover:bg-purple-600 transition-colors font-kosugi"
                    >
                        我知道了
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
