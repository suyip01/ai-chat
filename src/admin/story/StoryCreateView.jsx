import React, { useEffect, useState } from 'react'
import { ChevronLeft, Save } from 'lucide-react'
import { storiesAPI, charactersAPI } from '../api.js'
import CoverEditor from '../components/CoverEditor.jsx'

const StoryCreateView = ({ initialData, onCancel, notify }) => {
  const [form, setForm] = useState({
    title: '', description: '', image: '', tags: [], author: '', likes: '', content: '', publishDate: ''
  })
  const [selectedChars, setSelectedChars] = useState([])
  const [charOptions, setCharOptions] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const ddRef = React.useRef(null)
  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        image: initialData.image || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags : [],
        author: initialData.author || '',
        likes: initialData.likes || '',
        content: initialData.content || '',
        publishDate: initialData.publish_date || ''
      })
      if (Array.isArray(initialData.character_ids)) setSelectedChars(initialData.character_ids.map(id => Number(id)))
    }
  }, [initialData])
  useEffect(() => {
    (async () => {
      try {
        const res = await charactersAPI.list({ creator_role: 'admin_role' })
        const items = Array.isArray(res?.items) ? res.items : []
        const published = items.filter(it => it.status === 'published')
        setCharOptions(published.map(it => ({ id: Number(it.id), name: it.name })))
      } catch {}
    })()
  }, [])
  useEffect(() => {
    const onDoc = (e) => { if (isDropdownOpen && ddRef.current && !ddRef.current.contains(e.target)) setIsDropdownOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [isDropdownOpen])
  const [tagInput, setTagInput] = useState('')
  const [showCoverEditor, setShowCoverEditor] = useState(false)
  const addTag = () => { const v = tagInput.trim(); if (!v) return; setForm(p => ({ ...p, tags: p.tags.includes(v) ? p.tags : [...p.tags, v] })); setTagInput('') }
  const removeTag = (t) => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) { notify && notify('请输入标题与内容', 'error'); return }
    const payload = {
      title: form.title.trim(), description: form.description || null, image: form.image || null,
      author: form.author || null, likes: form.likes || null, content: form.content,
      tags: form.tags, character_ids: selectedChars
    }
    try {
      if (initialData?.id) { await storiesAPI.update(initialData.id, payload); notify && notify('保存成功：故事已更新') }
      else { await storiesAPI.create(payload); notify && notify('保存成功：故事已创建') }
      onCancel && onCancel()
    } catch { notify && notify('保存失败', 'error') }
  }
  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-pink-600 transition-colors"><ChevronLeft size={20} /></button>
        <div>
          <h2 className="text-2xl font-cute text-pink-900">{initialData ? '编辑故事' : '创建故事'}</h2>
          <p className="text-gray-400 text-xs">填写并保存故事内容</p>
        </div>
      <div className="ml-auto">
        <button onClick={save} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold text-sm shadow-lg shadow-pink-200 flex items-center gap-2"><Save size={16} /> 保存</button>
      </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="solid-card p-8 rounded-3xl space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-pink-800 mb-2">标题</label>
              <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="dream-input w-full px-4 py-3 rounded-xl text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-pink-800 mb-2">描述</label>
              <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows="3" className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-pink-800 mb-2">封面图片</label>
              <div className="space-y-3">
                <div onClick={() => setShowCoverEditor(true)} className="w-full aspect-[2/1] bg-gray-100 rounded-2xl overflow-hidden border-4 border-white shadow-xl cursor-pointer">
                  {form.image ? (
                    <img src={form.image} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">点击上传并裁剪 (800×400)</div>
                  )}
                </div>
                <input value={form.image} onChange={e=>setForm({...form, image:e.target.value})} className="dream-input w-full px-4 py-3 rounded-xl text-sm" placeholder="或直接粘贴图片 URL"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-pink-800 mb-2">作者</label>
                <input value={form.author} onChange={e=>setForm({...form, author:e.target.value})} className="dream-input w-full px-4 py-3 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-pink-800 mb-2">点赞数（文本）</label>
                <input value={form.likes} onChange={e=>setForm({...form, likes:e.target.value})} className="dream-input w-full px-4 py-3 rounded-xl text-sm"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-pink-800 mb-2">标签</label>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag();}}} className="dream-input flex-1 px-4 py-3 rounded-xl text-sm" placeholder="输入标签并回车"/>
                <button onClick={addTag} className="px-4 rounded-xl bg-pink-500 text-white text-sm font-bold">添加</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.tags.map(t=> (
                  <button key={t} onClick={()=>removeTag(t)} className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-pink-100">#{t} ×</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-pink-800 mb-2">正文</label>
              <textarea value={form.content} onChange={e=>setForm({...form, content:e.target.value})} rows="14" className="dream-input w-full px-5 py-4 rounded-xl text-sm leading-relaxed font-mono text-gray-700 bg-white focus:bg-white resize-y shadow-inner"/>
            </div>
            
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-3xl text-sm text-gray-500">在右侧填写故事信息并点击保存。</div>
          <div className="solid-card p-6 rounded-3xl space-y-4">
            <div className="text-xs font-bold text-pink-800">登场角色（管理员且已发布）</div>
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-md" ref={ddRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isDropdownOpen ? 'border-pink-500 ring-4 ring-pink-100/50' : ''}`}>
                  <span className={`text-gray-700`}>选择角色</span>
                  <div className={`text-pink-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</div>
                </button>
                {isDropdownOpen && (
                  <ul className="absolute top-full mt-1 w-full bg-white border border-pink-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                    {charOptions.filter(opt => !selectedChars.includes(opt.id)).length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-400">暂无可选角色</li>
                    ) : (
                      charOptions.filter(opt => !selectedChars.includes(opt.id)).map(opt => (
                        <li key={opt.id} onClick={() => { setSelectedChars(prev => prev.includes(opt.id) ? prev : [...prev, opt.id]); setIsDropdownOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-pink-50 cursor-pointer transition-colors`}>{opt.name}</li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <button className="px-3 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold" onClick={() => setIsDropdownOpen(true)}>添加</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedChars.map(cid => {
                const nm = charOptions.find(o => o.id === cid)?.name || cid
                return (
                  <span key={cid} className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-pink-100">
                    {nm}
                    <button className="ml-2 text-pink-500" onClick={() => setSelectedChars(prev => prev.filter(x => x !== cid))}>×</button>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {showCoverEditor && (
        <CoverEditor
          initialImage={form.image || null}
          onSave={async (url) => { setForm(p => ({ ...p, image: url })); setShowCoverEditor(false); }}
          onCancel={() => setShowCoverEditor(false)}
        />
      )}
    </div>
  )
}

export default StoryCreateView
