
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Plus, ChevronRight, X, ChevronDown, Save, Send, Trash2, AlertCircle } from 'lucide-react';
import { Story, Character, StoryRole } from '../types';
import { ImageCropper } from '../components/ImageCropper';
import { useToast } from '../components/Toast';
import { LazyImage } from '../components/LazyImage'
import { identifyUser, setTag } from '../services/analytics'

interface CreateStoryProps {
  onBack: () => void;
  onPublish: (story: Story) => void;
  onSaveDraft: (story: Story) => void;
  availableCharacters: Character[]; // Pool of characters to import
  myUserCharacters?: Character[];
  initialStory?: Story | null;
  importableRoles?: Array<{ id: string; name: string; avatar: string; desc: string; isPrivate: boolean; isMine: boolean }>;
}

export const CreateStory: React.FC<CreateStoryProps> = ({
  onBack,
  onPublish,
  onSaveDraft,
  availableCharacters,
  myUserCharacters = [],
  initialStory,
  importableRoles = []
}) => {
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
  const combineRequestedRef = useRef(false)
  useEffect(() => {
    try {
      const uid = localStorage.getItem('user_id') || '0'
      identifyUser({ userId: uid, pageId: 'CREATE_STORY', name: initialStory ? '编辑故事' : '创作故事' })
      setTag('页面', initialStory ? '编辑故事' : '创作故事')
    } catch {}
  }, [initialStory])
  useEffect(() => {
    setLocalImportableRoles(importableRoles || []);
  }, [importableRoles]);
  useEffect(() => {
    if (combineRequestedRef.current) return
    if (localImportableRoles && localImportableRoles.length) return
    combineRequestedRef.current = true
    ;(async () => {
      try {
        const { authFetch } = await import('../services/http')
        const res = await authFetch('/stories/combine')
        if (res && res.ok) {
          const data = await res.json()
          const items = Array.isArray(data?.items) ? data.items : []
          setLocalImportableRoles(items.map((it: any) => ({ id: String(it.character_id), name: it.character_name, avatar: it.character_avatar || '', desc: it.desc || '', isPrivate: !!it.isPrivate, isMine: !!it.isMine })))
        }
      } catch { }
    })()
  }, [])
  const myRoles = React.useMemo(() => {
    const src = Array.isArray(myUserCharacters) ? myUserCharacters : []
    return src
      .filter(c => (c as any).isPublished === true && (c as any).isPublic === false)
      .map(c => ({ id: String(c.id), name: c.name, avatar: c.avatar, desc: c.oneLinePersona || c.bio || '', isPrivate: true, isMine: true }))
  }, [myUserCharacters])
  
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (prefilledRef.current) return
    const ids: Array<string|number> = Array.isArray((initialStory as any)?.characterIds) ? (initialStory as any).characterIds : []
    if (!ids.length) return
    if (!localImportableRoles || !localImportableRoles.length) return
    const idSet = new Set(ids.map(x => String(x)))
    const matched = localImportableRoles
      .filter(r => idSet.has(String(r.id)))
      .map(r => ({ name: r.name, avatar: r.avatar, description: r.desc || '暂无描述' }))
    if (matched.length) {
      prefilledRef.current = true
      setForm(prev => ({ ...prev, roles: matched }))
    }
  }, [initialStory, localImportableRoles])

  useEffect(() => {
    if (!initialStory) return
    const roles = (initialStory.availableRoles || []) as StoryRole[]
    if (roles.length) {
      setForm(prev => ({ ...prev, roles }))
      prefilledRef.current = true
    }
  }, [initialStory])

  useEffect(() => {
    if (!initialStory) return
    setForm(prev => ({
      ...prev,
      title: initialStory.title || prev.title,
      description: initialStory.description || prev.description,
      image: initialStory.image || prev.image,
      content: initialStory.content || prev.content,
      tags: Array.isArray(initialStory.tags) ? initialStory.tags : prev.tags
    }))
  }, [initialStory])

  useEffect(() => {
    if (!showRoleTips) return
    const timer = setTimeout(() => setShowRoleTips(false), 6000)
    return () => clearTimeout(timer)
  }, [showRoleTips])

  useEffect(() => {
    if (!showRoleTips) return
    const onDocClick = (e: MouseEvent) => {
      const el = roleTipsRef.current
      if (!el) { setShowRoleTips(false); return }
      const target = e.target as Node
      if (!el.contains(target)) setShowRoleTips(false)
    }
    window.addEventListener('click', onDocClick, true)
    return () => window.removeEventListener('click', onDocClick, true)
  }, [showRoleTips])

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageScrollRef = useRef<HTMLDivElement | null>(null);
  const importScrollRef = useRef<HTMLDivElement | null>(null);

  const dataUrlToBlob = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  };

  const availableTags = [
    'BG', 'BL', 'GL', '暗恋', '校园',
    '职场', '悬疑', '科幻', '古风', '穿越',
    '重生', '甜宠', '虐恋', 'HE', 'BE',
    '爽文', '娱乐圈', '青梅竹马', '强强', '同人'
  ];

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

  const createStoryObject = (status: 'published' | 'draft'): Story => {
    return {
      id: initialStory ? initialStory.id : Date.now(),
      title: form.title || '未命名故事',
      description: form.description || '暂无简介',
      image: form.image || 'https://image.pollinations.ai/prompt/abstract%20book%20cover%20pastel?width=600&height=300&nologo=true',
      content: form.content,
      tags: form.tags,
      author: '我',
      likes: '0',
      availableRoles: form.roles,
      status: status,
      isUserCreated: true,
      publishDate: new Date().toISOString()
    };
  };

  const resolveCharacterIds = (): Array<number | string> => {
    const names = form.roles.map(r => r.name)
    const m: Record<string, string | number> = {}
    importableRoles.forEach(r => { m[r.name] = r.id })
    return names.map(n => m[n]).filter(Boolean) as Array<number | string>
  }

  const [submitting, setSubmitting] = useState<'none' | 'publish' | 'draft'>('none')

  const saveToServer = async (status: 'published' | 'draft') => {
    try {
      setSubmitting(status === 'published' ? 'publish' : 'draft')
      let imageUrl = form.image || ''
      try {
        const token = localStorage.getItem('user_access_token')
        if (form.image && form.image.startsWith('data:image')) {
          const blob = dataUrlToBlob(form.image)
          const fd = new FormData()
          const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
          imageUrl = `/uploads/covers/${fname}`
          fd.append('cover', blob, 'cover.jpg')
          fd.append('filename', fname)
          const up = await fetch('/api/uploads/cover', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd })
          if (up && up.ok) {
            const j = await up.json()
            if (j && j.url) imageUrl = j.url
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
      }
      const { authFetch } = await import('../services/http')
      const isEdit = !!initialStory
      const url = isEdit ? `/user/stories/${initialStory?.id}` : '/user/stories'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res && res.ok) {
        let idOut: number | string | undefined
        try { const data = await res.json(); idOut = data?.id } catch { idOut = initialStory?.id }
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
        }
        if (status === 'published') onPublish(newStory)
        else onSaveDraft(newStory)
        return
      }
      showCenter('保存失败，请重试。', 'error')
    } catch {
      showCenter('保存失败，请重试。', 'error')
    } finally {
      setSubmitting('none')
    }
  }

  const updateDraft = async () => {
    try {
      setSubmitting('draft')
      let imageUrl = form.image || ''
      try {
        const token = localStorage.getItem('user_access_token')
        if (form.image && form.image.startsWith('data:image')) {
          const blob = dataUrlToBlob(form.image)
          const fd = new FormData()
          const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
          imageUrl = `/uploads/covers/${fname}`
          fd.append('cover', blob, 'cover.jpg')
          fd.append('filename', fname)
          const up = await fetch('/api/uploads/cover', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd })
          if (up && up.ok) {
            const j = await up.json()
            if (j && j.url) imageUrl = j.url
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
      }
      const { authFetch } = await import('../services/http')
      const res = await authFetch(`/user/stories/${initialStory?.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
        }
        onSaveDraft(newStory)
        return
      }
      showCenter('保存失败，请重试。', 'error')
    } catch {
      showCenter('保存失败，请重试。', 'error')
    } finally {
      setSubmitting('none')
    }
  }

  const validate = () => {
    const e: Record<string, boolean> = {}
    if (!form.title.trim()) e.title = true
    if (!form.content.trim()) e.content = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePublish = () => {
    if (!validate()) { setShowErrorModal(true); return }
    saveToServer('published')
  };

  const handleSaveDraft = () => {
    if (!validate()) { setShowErrorModal(true); return }
    if (initialStory) { updateDraft(); return }
    saveToServer('draft')
  };

  const labelClass = "field-label font-kosugi mb-3 text-slate-700 font-bold text-sm block";

  return (
    <div className="fixed inset-0 bg-white z-[60]">
      <div className="mx-auto w-full max-w-md h-full relative flex flex-col overflow-hidden rounded-none md:rounded-3xl shadow-2xl bg白 font-kosugi">

        {/* Cropper */}
        {tempImage && (
          <ImageCropper
            imageSrc={tempImage}
            aspectRatio={2}
            outputWidth={800}
            outputHeight={400}
            onCancel={() => {
              setTempImage(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            onCrop={(croppedImage) => {
              setForm(prev => ({ ...prev, image: croppedImage }));
              setTempImage(null);
            }}
          />
        )}

        {/* Background */}
        <div className="ambient-bg hidden"></div>

        {/* Header */}
        <div className="sticky top-0 z-50 bg-white px-4 py-3 flex items-center border-b border-slate-100 rounded-t-none md:rounded-t-3xl relative">
          {initialStory && (
            <button onClick={handleSaveDraft} disabled={submitting !== 'none'} className={`absolute right-4 text-sm font-bold font-kosugi ${submitting !== 'none' ? 'text-slate-400 cursor-not-allowed' : 'text-purple-600'}`}>更新草稿</button>
          )}
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-purple-800 hover:bg-purple-100 rounded-full transition">
            <ChevronLeft size={20} />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-purple-900 font-kosugi">
            {initialStory ? '编辑故事' : '创作故事'}
          </h1>
          {!initialStory && (
            <button onClick={handleSaveDraft} disabled={submitting !== 'none'} className={`ml-auto text-sm font-bold font-kosugi ${submitting !== 'none' ? 'text-slate-400 cursor-not-allowed' : 'text-purple-600'}`}>存草稿</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-28 px-4 space-y-6" ref={pageScrollRef}>

        {/* 1. Cover Image */}
          <section className="flex flex-col items-center py-2">
            <div
              onClick={handleImageClick}
              className="relative group cursor-pointer active:scale-95 transition-transform w-full h-40 rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-white/50"
            >
              {form.image ? (
                <img src={form.image} className="w-full h-full object-cover" alt="cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-purple-300">
                  <Camera size={32} />
                  <span className="text-xs font-bold mt-2">上传封面</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                <Plus size={14} />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </section>

          {preMountLoading && (
            <div className="fixed inset-0 z-[90] bg-black flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-white">
                <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                <div className="text-sm tracking-wide">正在读取封面...</div>
              </div>
            </div>
          )}

          {/* 2. Basic Info */}
          <section className="glass-card p-6 space-y-4">
            <div className="section-title !font-kosugi !text-purple-900 mb-2">基础信息</div>

            {/* Title */}
            <div>
              <label className={`${labelClass} flex items-center gap-1`}>故事标题{errors.title && <span className="text-red-500 text-[10px] font-normal ml-1">必填</span>}</label>
              <input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                type="text"
                placeholder="请输入引人入胜的标题"
                className={`dream-input w-full px-4 py-3 text-sm font-bold ${errors.title ? 'border-red-300 bg-red-50' : ''}`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>一句话简介</label>
              <input
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                type="text"
                placeholder="展现在列表卡片上的简介"
                className="dream-input w-full px-4 py-3 text-sm"
              />
            </div>

            {/* Tags */}
            <div>
              <label className={labelClass}>故事标签</label>
              <div onClick={() => setShowTagModal(true)} className="dream-input w-full px-3 py-2 min-h-[46px] flex flex-wrap gap-2 items-center bg-white/60 cursor-pointer hover:bg-white/80 transition">
                {form.tags.length === 0 && (
                  <span className="text-xs text-[#B3A4C8] ml-1">点击添加标签</span>
                )}
                {form.tags.map(tag => (
                  <span key={tag} className="tag-pill px-2 py-1 flex items-center shadow-sm">
                    #{tag}
                    <X size={12} className="ml-1 opacity-60 hover:opacity-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTag(tag); }} />
                  </span>
                ))}
                <ChevronRight className="ml-auto text-purple-300" size={16} />
              </div>
            </div>
          </section>

          {/* 3. Characters */}
          <section className="glass-card p-6 space-y-4">
            <div className="flex justify-between items-center mb-2 relative">
              <div className="flex items-center gap-2">
                <div className="section-title !font-kosugi !text-purple-900 mb-0">登场角色</div>
                <button
                  onClick={() => setShowRoleTips(true)}
                  className="w-5 h-5 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100"
                >
                  <AlertCircle size={12} />
                </button>
              </div>
              <button
                onClick={() => setShowRoleModal(true)}
                className="text-xs bg-purple-100 text-purple-600 px-3 py-1.5 rounded-full font-bold hover:bg-purple-200 transition"
              >
                + 导入角色
              </button>
              {showRoleTips && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowRoleTips(false)}></div>
                  <div ref={roleTipsRef} className="absolute left-0 top-8 z-[61] bg-white rounded-2xl shadow-xl border border-slate-100 p-3 w-[88%]">
                    <div className="text-xs text-slate-700 font-kosugi">当故事角色来自于“角色广场”或“你已创建的角色”时，请在下方添加所有出场角色，便于读者一键与角色聊天哦～</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-kosugi">若角色不来自上述来源，可不添加。</div>
                  </div>
                </>
              )}
            </div>

            {form.roles.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-purple-200 rounded-xl">
                暂无角色，请点击上方按钮添加
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-200">
                {form.roles.map((role) => (
                  <div key={role.name} className="flex items-center gap-3 bg白/60 py-3">
                    <LazyImage src={role.avatar} alt={role.name} root={pageScrollRef.current} placeholderChar={(role.name || '?')[0]} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 text-sm">{role.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{role.description}</div>
                    </div>
                    <button onClick={() => removeRole(role.name)} className="text-slate-400 hover:text-red-400 p-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. Story Content */}
          <section className="glass-card p-6 h-auto min-h-[300px] flex flex-col">
            <div className="section-title !font-kosugi !text-purple-900 mb-4 flex items-center gap-1">故事正文{errors.content && <span className="text-red-500 text-[10px] font-normal">必填</span>}</div>
            <textarea
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="在此输入精彩的故事内容..."
              className={`flex-1 w-full bg-transparent border-none outline-none resize-none text-slate-700 leading-relaxed text-base min-h-[200px] placeholder:text-slate-300 ${errors.content ? 'border-red-300 bg-red-50' : ''}`}
            ></textarea>
          </section>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 inset-x-0 mx-auto w-full max-w-md bg-white/90 backdrop-blur-md p-4 z-50 border-t border-purple-50 rounded-none md:rounded-b-3xl shadow-2xl">
          <button
            onClick={handlePublish}
            disabled={submitting !== 'none'}
            className={`w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-purple-300 active:scale-95 transition flex items-center justify-center gap-2 ${submitting !== 'none' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Send size={18} /> {submitting === 'publish' ? '发布中...' : '发布故事'}
          </button>
        </div>

        {/* Tag Modal */}
        {showTagModal && (
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[61]" onClick={() => setShowTagModal(false)}></div>
            <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white rounded-t-[30px] z-[62] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[70vh] animate-in slide-in-from-bottom duration-300">
              <div className="px-5 py-4 flex justify-between items-center border-b border-purple-50 bg-white rounded-t-[30px]">
                <button onClick={() => setShowTagModal(false)} className="w-8 h-8 rounded-full bg-purple-50 text-purple-800 flex items-center justify-center">
                  <ChevronDown size={20} />
                </button>
                <h3 className="text-lg font-bold text-purple-900 font-kosugi">添加故事标签</h3>
                <button onClick={() => setShowTagModal(false)} className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full font-kosugi">完成</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 pb-10">
                <div className="mb-4">
                  <div className="text-xs font-bold text-slate-400 mb-2 ml-1">选定的标签</div>
                  <div className="flex flex-wrap gap-2 min-h-[46px] bg-purple-50/50 p-3 rounded-xl border border-purple-100 border-dashed">
                    {form.tags.length === 0 && <span className="text-xs text-slate-400 self-center">暂无标签</span>}
                    {form.tags.map(tag => (
                      <button key={tag} onClick={() => toggleTag(tag)} className="bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1">
                        #{tag} <X size={10} className="opacity-80" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs font-bold text-slate-400 mb-2 ml-1">自定义标签</div>
                  <div className="flex gap-2">
                    <input
                      value={customTagInput}
                      onChange={e => setCustomTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                      type="text"
                      placeholder="输入标签"
                      className="dream-input flex-1 px-4 py-2 text-sm bg-white"
                    />
                    <button onClick={addCustomTag} className="bg-purple-500 text-white px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition">
                      添加
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-400 mb-2 ml-1">热门标签</div>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`
                                            rounded-2xl font-bold text-[0.85rem] px-2 py-2 transition-all whitespace-nowrap overflow-hidden text-ellipsis
                                            ${form.tags.includes(tag) ? 'bg-[#8B5CF6] text-white shadow-md' : 'bg-[#F3E8FF] text-[#6B21A8]'}
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

        {/* Character/Role Selection Modal */}
        {showRoleModal && (
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[61]" onClick={() => setShowRoleModal(false)}></div>
            <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white rounded-t-[30px] overflow-hidden z-[62] flex flex-col h-[70vh] animate-in slide-in-from-bottom duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
              <div className="px-5 py-4 flex justify-between items-center border-b border-purple-50">
                <h3 className="text-lg font-bold text-purple-900 font-kosugi">选择角色导入</h3>
                <button onClick={() => setShowRoleModal(false)} className="p-2 bg-slate-100 rounded-full"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={importScrollRef}>
                {(localImportableRoles || [])
                  .filter(item => !form.roles.some(r => r.name === item.name))
                  .sort((a, b) => {
                    const rank = (x: any) => (x.isPrivate && x.isMine ? 0 : (!x.isPrivate && x.isMine ? 1 : 2))
                    const ra = rank(a), rb = rank(b)
                    return ra === rb ? 0 : (ra < rb ? -1 : 1)
                  })
                  .map(item => (
                    <div
                      key={`imp_${item.id || item.name}`}
                      onClick={() => handleAddRole({ name: item.name, avatar: item.avatar, oneLinePersona: item.desc, bio: item.desc } as any)}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm active:scale-[0.98] transition cursor-pointer hover:border-purple-200"
                    >
                      <LazyImage src={item.avatar} alt={item.name} root={importScrollRef.current} placeholderChar={(item.name || '?')[0]} className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-400 truncate w-48">{item.desc}</div>
                      </div>
                      {item.isMine && item.isPrivate && (
                        <span className="text-pink-500 text-[10px] font-bold mr-2">私密</span>
                      )}
                      <div className="ml-auto bg-purple-50 text-purple-600 p-2 rounded-full">
                        <Plus size={16} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

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
