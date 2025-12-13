import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Story, Character, StoryRole } from '../types';
import { useToast } from '../components/Toast';
import { identifyUser, setTag } from '../services/analytics';
import { saveDraft, getDraft, clearDraft } from '../services/draftStorage';

export interface UseCreateStoryProps {
  onBack: () => void;
  onPublish: (story: Story) => void;
  onSaveDraft: (story: Story) => void;
  availableCharacters: Character[];
  myUserCharacters?: Character[];
  initialStory?: Story | null;
  importableRoles?: Array<{ id: string; name: string; avatar: string; desc: string; isPrivate: boolean; isMine: boolean }>;
}

export const useCreateStory = ({
  onBack,
  onPublish,
  onSaveDraft,
  availableCharacters,
  myUserCharacters = [],
  initialStory,
  importableRoles = []
}: UseCreateStoryProps) => {
  const { showCenter } = useToast();
  
  const [form, setForm] = useState<{
    title: string;
    description: string;
    image: string;
    content: string;
    tags: string[];
    roles: StoryRole[];
  }>(() => {
    if (initialStory) {
      return {
        title: initialStory.title,
        description: initialStory.description,
        image: initialStory.image,
        content: initialStory.content,
        tags: initialStory.tags,
        roles: initialStory.availableRoles || []
      };
    }
    return {
      title: '',
      description: '',
      image: '',
      content: '',
      tags: [],
      roles: []
    };
  });

  // UI States
  const [showTagModal, setShowTagModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [customTagInput, setCustomTagInput] = useState('');
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [preMountLoading, setPreMountLoading] = useState(false);
  const [showRoleTips, setShowRoleTips] = useState(false);
  const roleTipsRef = useRef<HTMLDivElement | null>(null);
  const [localImportableRoles, setLocalImportableRoles] = useState(importableRoles);
  const [roleOffset, setRoleOffset] = useState(0);
  const [hasMoreRoles, setHasMoreRoles] = useState(true);
  const [isLoadingMoreRoles, setIsLoadingMoreRoles] = useState(false);
  const combineRequestedRef = useRef(false);
  const [submitting, setSubmitting] = useState<'none' | 'publish' | 'draft'>('none');
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageScrollRef = useRef<HTMLDivElement | null>(null);
  const importScrollRef = useRef<HTMLDivElement | null>(null);
  const prefilledRef = useRef(false);
  const autoSaveTimerRef = useRef<any>(null);

  useEffect(() => {
    try {
      const uid = localStorage.getItem('user_id') || '0';
      const uname = localStorage.getItem('user_username') || uid;
      const nickname = localStorage.getItem('user_nickname') || '我';
      identifyUser({ userId: uname, pageId: 'CREATE_STORY', name: nickname });
      setTag('页面', initialStory ? '编辑故事' : '创作故事');
    } catch {}
  }, [initialStory]);

  useEffect(() => {
    if (importableRoles && importableRoles.length) {
       setLocalImportableRoles(importableRoles);
    }
  }, [importableRoles]);

  useEffect(() => {
    if (combineRequestedRef.current) return;
    if (localImportableRoles && localImportableRoles.length) return;
    combineRequestedRef.current = true;
    (async () => {
      try {
        const { authFetch } = await import('../services/http');
        const res = await authFetch(`/stories/combine?limit=10&offset=0`);
        if (res && res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          const mapped = items.map((it: any) => ({ id: String(it.character_id), name: it.character_name, avatar: it.character_avatar || '', desc: it.desc || '', isPrivate: !!it.isPrivate, isMine: !!it.isMine }));
          setLocalImportableRoles(mapped);
          setRoleOffset(mapped.length); // Update offset based on received items (could be > 10 if My Characters are included)
          // Since first page includes My Characters, we need to be careful with offset logic.
          // However, backend logic uses offset=0 for My+Public(0-9), offset=10 for Public(10-19).
          // If we receive X items, and X > 0, we can try fetching next page starting at offset=10 (since we assume My Chars don't count towards public pagination offset in the simplified logic, or rather, the offset param passed to backend strictly controls public chars offset when > 0).
          // Wait, the backend logic is:
          // offset=0: My + Public(0-10)
          // offset=10: Public(10-20)
          // So if we fetched the first page, we should set next offset to 10.
          // But `mapped.length` could be 15 (5 My + 10 Public).
          // If we just set offset = 10, next fetch asks for Public(10-20). That works.
          setRoleOffset(10); 
          if (items.length < 1) setHasMoreRoles(false); // Rough check
        }
      } catch { }
    })();
  }, []);

  const loadMoreRoles = async () => {
    if (!hasMoreRoles || isLoadingMoreRoles) return;
    setIsLoadingMoreRoles(true);
    try {
      const { authFetch } = await import('../services/http');
      let url = `/stories/combine?limit=10&offset=${roleOffset}`;
      if (searchText) url += `&search=${encodeURIComponent(searchText)}`;
      const res = await authFetch(url);
      if (res && res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          setHasMoreRoles(false);
        } else {
          const mapped = items.map((it: any) => ({ id: String(it.character_id), name: it.character_name, avatar: it.character_avatar || '', desc: it.desc || '', isPrivate: !!it.isPrivate, isMine: !!it.isMine }));
          // Filter duplicates just in case
          setLocalImportableRoles(prev => {
             const existingIds = new Set(prev.map(p => p.id));
             const uniqueNew = mapped.filter((m: any) => !existingIds.has(m.id));
             return [...prev, ...uniqueNew];
          });
          setRoleOffset(prev => prev + items.length);
          if (items.length < 10) {
            setHasMoreRoles(false);
          }
        }
      } else {
          setHasMoreRoles(false);
      }
    } catch {
       setHasMoreRoles(false);
    } finally {
      setIsLoadingMoreRoles(false);
    }
  };

  const executeSearch = async (query: string) => {
    setSearchText(query);
    setRoleOffset(0);
    setLocalImportableRoles([]);
    setHasMoreRoles(true);
    setIsLoadingMoreRoles(true);
    
    try {
        const { authFetch } = await import('../services/http');
        const res = await authFetch(`/stories/combine?limit=10&offset=0&search=${encodeURIComponent(query)}`);
        if (res && res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          const mapped = items.map((it: any) => ({ id: String(it.character_id), name: it.character_name, avatar: it.character_avatar || '', desc: it.desc || '', isPrivate: !!it.isPrivate, isMine: !!it.isMine }));
          
          setLocalImportableRoles(mapped);
          setRoleOffset(items.length); 
          if (items.length < 10) setHasMoreRoles(false);
        } else {
            setHasMoreRoles(false);
        }
    } catch {
        setHasMoreRoles(false);
    } finally {
        setIsLoadingMoreRoles(false);
    }
  };

  const myRoles = useMemo(() => {
    const src = Array.isArray(myUserCharacters) ? myUserCharacters : [];
    return src
      .filter(c => (c as any).isPublished === true && (c as any).isPublic === false)
      .map(c => ({ id: String(c.id), name: c.name, avatar: c.avatar, desc: c.oneLinePersona || c.bio || '', isPrivate: true, isMine: true }));
  }, [myUserCharacters]);

  useEffect(() => {
    if (prefilledRef.current) return;
    const ids: Array<string|number> = Array.isArray((initialStory as any)?.characterIds) ? (initialStory as any).characterIds : [];
    if (!ids.length) return;
    if (!localImportableRoles || !localImportableRoles.length) return;
    const idSet = new Set(ids.map(x => String(x)));
    const matched = localImportableRoles
      .filter(r => idSet.has(String(r.id)))
      .map(r => ({ name: r.name, avatar: r.avatar, description: r.desc || '暂无描述' }));
    if (matched.length) {
      prefilledRef.current = true;
      setForm(prev => ({ ...prev, roles: matched }));
    }
  }, [initialStory, localImportableRoles]);

  useEffect(() => {
    if (!initialStory) return;
    const roles = (initialStory.availableRoles || []) as StoryRole[];
    if (roles.length) {
      setForm(prev => ({ ...prev, roles }));
      prefilledRef.current = true;
    }
  }, [initialStory]);

  useEffect(() => {
    if (!initialStory) return;
    setForm(prev => ({
      ...prev,
      title: initialStory.title || prev.title,
      description: initialStory.description || prev.description,
      image: initialStory.image || prev.image,
      content: initialStory.content || prev.content,
      tags: Array.isArray(initialStory.tags) ? initialStory.tags : prev.tags
    }));
  }, [initialStory]);

  // Auto-save draft
  useEffect(() => {
    if (initialStory) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const uid = localStorage.getItem('user_id') || 'guest';
      saveDraft(`create_story_draft_${uid}`, form);
    }, 300);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [form, initialStory]);

  // Load draft
  useEffect(() => {
    if (initialStory) return;
    (async () => {
      const uid = localStorage.getItem('user_id') || 'guest';
      const draft = await getDraft(`create_story_draft_${uid}`);
      if (draft) setForm(prev => ({ ...prev, ...draft }));
    })();
  }, [initialStory]);

  useEffect(() => {
    if (!showRoleTips) return;
    const timer = setTimeout(() => setShowRoleTips(false), 6000);
    return () => clearTimeout(timer);
  }, [showRoleTips]);

  useEffect(() => {
    if (!showRoleTips) return;
    const onDocClick = (e: MouseEvent) => {
      const el = roleTipsRef.current;
      if (!el) { setShowRoleTips(false); return; }
      const target = e.target as Node;
      if (!el.contains(target)) setShowRoleTips(false);
    };
    window.addEventListener('click', onDocClick, true);
    return () => window.removeEventListener('click', onDocClick, true);
  }, [showRoleTips]);

  const dataUrlToBlob = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreMountLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setPreMountLoading(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTag = (tag: string) => {
    if (form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    } else {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const addCustomTag = () => {
    const val = customTagInput.trim();
    if (val && !form.tags.includes(val)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, val] }));
      setCustomTagInput('');
    }
  };

  const handleAddRole = (character: Character) => {
    // Prevent duplicates
    if (form.roles.some(r => r.name === character.name)) return;

    const newRole: StoryRole = {
      name: character.name,
      avatar: character.avatar,
      description: character.oneLinePersona || character.bio || '暂无描述'
    };

    setForm(prev => ({ ...prev, roles: [...prev.roles, newRole] }));
    setShowRoleModal(false);
  };

  const removeRole = (roleName: string) => {
    setForm(prev => ({ ...prev, roles: prev.roles.filter(r => r.name !== roleName) }));
  };

  const resolveCharacterIds = (): Array<number | string> => {
    const names = form.roles.map(r => r.name);
    const m: Record<string, string | number> = {};
    importableRoles.forEach(r => { m[r.name] = r.id; });
    return names.map(n => m[n]).filter(Boolean) as Array<number | string>;
  };

  const saveToServer = async (status: 'published' | 'draft') => {
    try {
      setSubmitting(status === 'published' ? 'publish' : 'draft');
      let imageUrl = form.image || '';
      try {
        const token = localStorage.getItem('user_access_token');
        if (form.image && form.image.startsWith('data:image')) {
          const blob = dataUrlToBlob(form.image);
          const fd = new FormData();
          const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
          imageUrl = `/uploads/covers/${fname}`;
          fd.append('cover', blob, 'cover.jpg');
          fd.append('filename', fname);
          const up = await fetch('/api/uploads/cover', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd });
          if (up && up.ok) {
            const j = await up.json();
            if (j && j.url) imageUrl = j.url;
          }
        }
      } catch { }
      const payload = {
        title: form.title,
        description: form.description,
        image: imageUrl,
        status,
        content: form.content,
        tags: form.tags,
        characterIds: resolveCharacterIds()
      };
      const { authFetch } = await import('../services/http');
      const isEdit = !!initialStory;
      const url = isEdit ? `/user/stories/${initialStory?.id}` : '/user/stories';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res && res.ok) {
        let idOut: number | string | undefined;
        try { const data = await res.json(); idOut = data?.id; } catch { idOut = initialStory?.id; }
        const newStory: Story = {
          id: typeof idOut === 'number' ? idOut : (initialStory ? initialStory.id : Date.now()),
          title: form.title,
          description: form.description,
          image: imageUrl || form.image,
          content: form.content,
          tags: form.tags,
          author: localStorage.getItem('user_nickname') || '我',
          likes: '0',
          availableRoles: form.roles,
          status
        };
        if (status === 'published') onPublish(newStory);
        else onSaveDraft(newStory);
        if (!initialStory) {
          const uid = localStorage.getItem('user_id') || 'guest';
          clearDraft(`create_story_draft_${uid}`);
        }
        return;
      }
      showCenter('保存失败，请重试。', 'error');
    } catch {
      showCenter('保存失败，请重试。', 'error');
    } finally {
      setSubmitting('none');
    }
  };

  const updateDraft = async () => {
    try {
      setSubmitting('draft');
      let imageUrl = form.image || '';
      try {
        const token = localStorage.getItem('user_access_token');
        if (form.image && form.image.startsWith('data:image')) {
          const blob = dataUrlToBlob(form.image);
          const fd = new FormData();
          const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
          imageUrl = `/uploads/covers/${fname}`;
          fd.append('cover', blob, 'cover.jpg');
          fd.append('filename', fname);
          const up = await fetch('/api/uploads/cover', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd });
          if (up && up.ok) {
            const j = await up.json();
            if (j && j.url) imageUrl = j.url;
          }
        }
      } catch { }
      const payload = {
        title: form.title,
        description: form.description,
        image: imageUrl,
        content: form.content,
        tags: form.tags,
        characterIds: resolveCharacterIds()
      };
      const { authFetch } = await import('../services/http');
      const res = await authFetch(`/user/stories/${initialStory?.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res && res.ok) {
        const newStory: Story = {
          id: typeof (initialStory?.id) === 'number' ? (initialStory as Story).id : Date.now(),
          title: form.title,
          description: form.description,
          image: imageUrl || form.image,
          content: form.content,
          tags: form.tags,
          author: localStorage.getItem('user_nickname') || '我',
          likes: '0',
          availableRoles: form.roles,
          status: initialStory?.status
        };
        onSaveDraft(newStory);
        return;
      }
      showCenter('保存失败，请重试。', 'error');
    } catch {
      showCenter('保存失败，请重试。', 'error');
    } finally {
      setSubmitting('none');
    }
  };

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!form.title.trim()) e.title = true;
    if (!form.content.trim()) e.content = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePublish = () => {
    if (!validate()) { setShowErrorModal(true); return; }
    saveToServer('published');
  };

  const handleSaveDraft = () => {
    if (!validate()) { setShowErrorModal(true); return; }
    if (initialStory) { updateDraft(); return; }
    saveToServer('draft');
  };

  return {
    form, setForm,
    showTagModal, setShowTagModal,
    showRoleModal, setShowRoleModal,
    showErrorModal, setShowErrorModal,
    errors, setErrors,
    customTagInput, setCustomTagInput,
    tempImage, setTempImage,
    preMountLoading, setPreMountLoading,
    showRoleTips, setShowRoleTips,
    roleTipsRef,
    localImportableRoles, setLocalImportableRoles,
    submitting,
    fileInputRef,
    pageScrollRef,
    importScrollRef,
    handleImageClick,
    handleFileChange,
    toggleTag,
    addCustomTag,
    handleAddRole,
    removeRole,
    handlePublish,
    handleSaveDraft,
    loadMoreRoles,
    hasMoreRoles,
    isLoadingMoreRoles,
    isSearching, setIsSearching,
    searchText, setSearchText,
    executeSearch
  };
};
