import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ChevronUp, Heart, MessageCircle, Edit2, Trash2 } from 'lucide-react'
import { Character } from '../types'
import { getUserCharacter, deleteUserCharacter } from '../services/userCharactersService'

interface Props {
  character: Character
  createdId: number | string
  onBack: () => void
  onStartChat: (character: Character) => void
  onEdit?: (character: Character) => void
  onDeleted?: () => void
}

export const CharacterProfileAwait: React.FC<Props> = ({ character, createdId, onBack, onStartChat, onEdit, onDeleted }) => {
  const [showAllTags, setShowAllTags] = useState(false)
  const [ready, setReady] = useState(true)
  const [latest, setLatest] = useState<Character>(character)
  const [deleting, setDeleting] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  useEffect(() => {
    let mounted = true
    let iv: any
    const tick = async () => {
      try {
        const data = await getUserCharacter(createdId)
        if (!mounted) return
        const statusStr = typeof data?.status === 'string' ? data.status.trim() : ''
        const hasSP = !!data?.hasSystemPrompt
        if (statusStr === 'draft') {
          setIsDraft(true)
          setReady(false)
          if (iv) clearInterval(iv)
          return
        }
        if (statusStr === 'publishing' || !hasSP) {
          setIsDraft(false)
          setReady(false)
          return
        }
        if (data && (statusStr === 'published' || hasSP)) {
          setReady(true)
          setIsDraft(false)
          setLatest(prev => ({
            ...prev,
            id: String(data.id || prev.id),
            name: data.name || prev.name,
            avatar: data.avatar || prev.avatar,
            profileImage: prev.profileImage,
            oneLinePersona: data.tagline || prev.oneLinePersona,
            personality: data.personality || prev.personality,
            profession: String(data.occupation || prev.profession || ''),
            age: String(data.age || prev.age || ''),
            currentRelationship: String(data.relationship || prev.currentRelationship || ''),
            plotTheme: String(data.plot_theme || prev.plotTheme || ''),
            plotDescription: String(data.plot_summary || prev.plotDescription || ''),
            openingLine: String(data.opening_line || prev.openingLine || ''),
          }))
          if (iv) clearInterval(iv)
          return
        }
      } catch {}
    }
    const init = async () => {
      try {
        const data = await getUserCharacter(createdId)
        if (!mounted) return
        if (data) {
          setLatest(prev => ({
            ...prev,
            id: String(data.id || prev.id),
            name: data.name || prev.name,
            avatar: data.avatar || prev.avatar,
            oneLinePersona: data.tagline || prev.oneLinePersona,
            personality: data.personality || prev.personality,
            profession: String(data.occupation || prev.profession || ''),
            age: String(data.age || prev.age || ''),
            currentRelationship: String(data.relationship || prev.currentRelationship || ''),
            plotTheme: String(data.plot_theme || prev.plotTheme || ''),
            plotDescription: String(data.plot_summary || prev.plotDescription || ''),
            openingLine: String(data.opening_line || prev.openingLine || ''),
          }))
          const hasSP = !!data.hasSystemPrompt
          const statusStr = typeof data.status === 'string' ? data.status.trim() : ''
          if (statusStr === 'draft') {
            setIsDraft(true)
            setReady(false)
            return
          }
          if (statusStr === 'publishing') {
            setIsDraft(false)
            setReady(false)
            iv = setInterval(tick, 3000)
            tick()
            return
          }
          if (!hasSP) {
            setIsDraft(false)
            setReady(false)
            iv = setInterval(tick, 3000)
            tick()
            return
          }
          setIsDraft(false)
          setReady(true)
          return
        }
        setIsDraft(false)
        setReady(true)
        
      } catch {
        setIsDraft(false)
        setReady(true)
        
      }
    }
    init()
    return () => { mounted = false; clearInterval(iv) }
  }, [createdId])

  const visibleTags = showAllTags ? latest.tags : latest.tags.slice(0, 4)
  const hasMoreTags = latest.tags.length > 4

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-primary-50"
      initial={{ x: ((navigator as any)?.maxTouchPoints > 0) ? '100%' : 0 }}
      animate={{ x: 0 }}
      exit={{ x: ((navigator as any)?.maxTouchPoints > 0) ? '100%' : 0 }}
      transition={{ duration: ((navigator as any)?.maxTouchPoints > 0) ? 0.3 : 0, ease: 'linear' }}
    >
      <div className="mx-auto w-full max-w-md h-full flex flex-col bg白 shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden relative">
        <button onClick={onBack} className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/30 transition-all"><ArrowLeft size={24} /></button>
        <button onClick={() => onEdit?.(latest)} className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all border border-white/30"><Edit2 size={20} /></button>
        <button disabled={deleting} onClick={() => setConfirmOpen(true)} className={`absolute top-16 right-4 z-50 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all border border-white/30 ${deleting ? 'opacity-60 cursor-not-allowed' : ''}`}><Trash2 size={18} className="text-red-500" /></button>
        <div className="flex-1 overflow-y-auto no-scrollbar relative pb-24">
          <div className="relative w-full h-[55vh]">
            <img src={latest.profileImage || latest.avatar} alt={latest.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/10"></div>
            <div className="absolute bottom-12 left-6 right-6 z-10 text-white flex flex-col items-start space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-bold tracking-wide">{latest.name}</h1>
                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] border border-white/30 text-white flex items-center gap-1"><span className="text-green-400">●</span> {latest.roleType || '原创角色'}</span>
              </div>
              <div className="flex items-center text-white text-sm font-medium pl-1"><span>{latest.profession}</span><span className="mx-2 bg-white w-1 h-1 rounded-full"></span><span>{latest.age}</span></div>
              <div className="text-white text-xs font-medium pl-1">by {latest.creator}</div>
            </div>
          </div>
          <div className="relative -mt-6 bg-white rounded-t-none md:rounded-t-[32px] px-6 py-8 min-h-[50vh] z-10">
            <div className="flex flex-wrap gap-2 mb-3">
              {visibleTags.map((tag, idx) => (<span key={idx} className="px-4 py-1.5 rounded-full bg-purple-50 text-purple-600 text-sm font-bold shadow-sm"># {tag}</span>))}
            </div>
            {hasMoreTags && (
              <div className="flex justify-center mb-8"><button onClick={() => setShowAllTags(!showAllTags)} className="text-xs text-purple-300 flex items-center gap-1 font-bold hover:text-purple-400 transition-colors">{showAllTags ? '收起' : '展示更多'} {showAllTags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>
            )}
            <div className="mb-8">
              <h3 className="text-purple-500 font-bold text-sm mb-3">一句话人设</h3>
              <div className="relative pl-4 py-1"><div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 rounded-full"></div><div className="bg-purple-50/50 p-4 rounded-r-xl text-slate-700 font-bold text-lg">“{latest.oneLinePersona}”</div></div>
            </div>
            <div className="mb-8"><h3 className="text-purple-500 font-bold text-sm mb-3">性格</h3><div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-slate-600 leading-7 text-justify text-sm">{latest.personality}</div></div>
            <div className="mb-8"><h3 className="text-purple-500 font-bold text-sm mb-3">当前关系</h3><div><span className="inline-flex items-center gap-1 bg-pink-100 text-pink-500 px-3 py-1 rounded-full text-sm font-bold"><Heart size={12} fill="currentColor" /> {latest.currentRelationship}</span></div></div>
            <div className="mb-8">
              <h3 className="text-purple-900 font-extrabold text-lg mb-4">第一情节</h3>
              <div className="flex items-center gap-2 mb-4"><span className="bg-pink-400 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">THEME</span><span className="bg-pink-50 text-pink-800 text-sm font-bold px-2 py-0.5 rounded">{latest.plotTheme}</span></div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-slate-600 leading-7 text-justify text-sm mb-4">{latest.plotDescription}</div>
              {latest.openingLine && (<div className="bg-purple-50/50 rounded-2xl p-4 flex items-center"><span className="text-purple-600 font-bold text-sm whitespace-nowrap mr-3">角色开场白</span><div className="h-4 w-[1px] bg-purple-200 mr-4"></div><span className="text-slate-700 font-bold text-sm">{latest.openingLine}</span></div>)}
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 inset-x-0 z-50">
          <div className="mx-auto w-full max-w-md bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 pb-[env(safe-area-inset-bottom)]">
            <button disabled={!ready || isDraft} onClick={() => onStartChat(latest)} className={`w-full font-bold text-lg py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${(ready && !isDraft) ? 'bg-purple-200 text-purple-900 shadow-purple-100 active:scale-[0.98]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>{(ready && !isDraft) ? (<><MessageCircle size={20} />唤醒角色</>) : (isDraft ? '请编辑角色和生成角色卡' : '角色创建中，请稍等。')}</button>
          </div>
        </div>
      </div>
      {confirmOpen && (
        <>
          <div className="fixed inset-0 z-[80] bg黑/20 animate-[fadeBg_200ms_ease]"></div>
          <div className="fixed inset-0 z-[90] flex items-center justify-center" onClick={() => !deleting && setConfirmOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm animate-[fadeCard_200ms_ease]" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 text-center text-slate-800 font-bold">确认删除此角色？</div>
              <div className="h-[1px] bg-slate-100"></div>
              <div className="flex">
                <button disabled={deleting} className="flex-1 py-4 text-slate-600 active:opacity-70" onClick={() => { if (deleting) return; setConfirmOpen(false); }}>取消</button>
                <div className="w-[1px] bg-slate-100"></div>
                <button disabled={deleting} className="flex-1 py-4 text-red-600 font-bold active:opacity-70" onClick={async () => { if (deleting) return; try { setDeleting(true); await deleteUserCharacter(createdId); setConfirmOpen(false); if (onDeleted) onDeleted(); else onBack(); } catch { setDeleting(false) } }}>确认删除</button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes fadeCard { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes fadeBg { from { opacity: 0 } to { opacity: 1 } }
          `}</style>
        </>
      )}
    </motion.div>
  )
}

export default CharacterProfileAwait
