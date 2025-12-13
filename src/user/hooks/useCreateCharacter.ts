import React, { useState, useRef, useEffect } from 'react';
import { Character, CharacterStatus } from '../types';
import { createCharacter, createUserCharacterDraft, updateUserCharacter, updateUserCharacterDraft, getUserCharacter } from '../services/userCharactersService';
import { identifyUser, setTag } from '../services/analytics';
import { saveDraft, getDraft, clearDraft } from '../services/draftStorage';

export interface UseCreateCharacterProps {
  onBack: () => void;
  onCreate: (character: Character) => void;
  isEdit?: boolean;
  characterId?: number | string;
  initial?: Partial<Character>;
  onUpdated?: (character: Character) => void;
  onSaveDraft?: (character: Character) => void;
}

export const useCreateCharacter = ({ onBack, onCreate, isEdit = false, characterId, initial, onUpdated, onSaveDraft }: UseCreateCharacterProps) => {
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
    try {
      const uid = localStorage.getItem('user_id') || '0'
      const uname = localStorage.getItem('user_username') || uid
      const nickname = localStorage.getItem('user_nickname') || '我'
      identifyUser({ userId: uname, pageId: 'CREATE_CHAR', name: nickname })
      setTag('页面', isEdit ? '编辑角色' : '创建角色')
      if (characterId !== undefined && characterId !== null) setTag('角色ID', String(characterId))
    } catch {}
  }, [isEdit, characterId])

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
        styleExamples: Array.isArray(initial.styleExamples) && initial.styleExamples.length 
          ? [initial.styleExamples[0] || '', initial.styleExamples[1] || '', initial.styleExamples[2] || '']
          : prev.styleExamples,
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

  // Auto-save draft
  const autoSaveTimerRef = useRef<any>(null);
  useEffect(() => {
    if (isEdit) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      const uid = localStorage.getItem('user_id') || 'guest'
      saveDraft(`create_character_draft_${uid}`, form)
    }, 300)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  }, [form, isEdit])

  // Load draft
  useEffect(() => {
    if (isEdit) return
    ;(async () => {
      const uid = localStorage.getItem('user_id') || 'guest'
      const draft = await getDraft(`create_character_draft_${uid}`)
      if (draft) setForm(prev => ({ ...prev, ...draft }))
    })()
  }, [isEdit])

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
          try { 
            const uid = localStorage.getItem('user_id') || 'guest'
            localStorage.removeItem('create_character_draft'); 
            clearDraft(`create_character_draft_${uid}`); 
          } catch {}
      } else {
          const uid = localStorage.getItem('user_id') || 'guest'
          localStorage.removeItem('create_character_draft');
          clearDraft(`create_character_draft_${uid}`);
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
    if (!isEdit) {
      const uid = localStorage.getItem('user_id') || 'guest'
      clearDraft(`create_character_draft_${uid}`);
    }

    if (isEdit) {
      onUpdated ? onUpdated(newCharacter) : onCreate(newCharacter)
    } else {
      onCreate(newCharacter);
    }
  };

  return {
    form, setForm,
    isCustomRel, setIsCustomRel,
    showAdvanced, setShowAdvanced,
    showTagModal, setShowTagModal,
    customTagInput, setCustomTagInput,
    showDraftModal, setShowDraftModal,
    errors, setErrors,
    showErrorModal, setShowErrorModal,
    tempAvatar, setTempAvatar,
    preMountLoading, setPreMountLoading,
    fileInputRef,
    handleAvatarClick,
    handleFileChange,
    toggleTag,
    addCustomTag,
    handleDraftAction,
    handleSubmit
  };
};
