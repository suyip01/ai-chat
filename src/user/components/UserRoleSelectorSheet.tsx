import React, { useEffect, useState, useRef } from 'react'
import { trackEvent, setTag } from '../services/analytics'
import { ChevronLeft, CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react'
import { UserPersona } from '../types'
import { fetchUserChatRoles, deleteUserChatRole } from '../services/chatService'
import { AnimatePresence, motion } from 'framer-motion'
import { androidBottomSheet, fade } from '../animations'

interface Props {
  isOpen: boolean
  currentPersona?: UserPersona
  onClose: () => void
  onAdd: () => void
  onSelect: (persona: UserPersona, roleId?: number) => void
  onEdit?: (persona: UserPersona, roleId: number) => void
  characterId?: number | string
}

const mapGender = (g?: string): 'male' | 'female' | 'secret' => {
  if (g === '男') return 'male'
  if (g === '女') return 'female'
  return 'secret'
}

export const UserRoleSelectorSheet: React.FC<Props> = ({ isOpen, currentPersona, onClose, onAdd, onSelect, onEdit, characterId }) => {
  const [roles, setRoles] = useState<Array<{ id: number; name: string; age: number | null; gender: string; profession: string | null; basic_info: string | null; personality: string | null; avatar: string | null }>>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [offsets, setOffsets] = useState<Record<number, number>>({})
  const startXRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  const activeIdRef = useRef<number | null>(null)
  const initialOffsetRef = useRef<number>(0)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const isTouch = (navigator as any)?.maxTouchPoints > 0
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; id: number | null }>({ visible: false, x: 0, y: 0, id: null })

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        try {
          const list = await fetchUserChatRoles()
          setRoles(list)
        } catch { }
      }
      load()
      setOffsets({})
    }
  }, [isOpen])

  useEffect(() => {
    if (!roles.length) return
    if (currentPersona?.name) {
      const match = roles.find(r => r.name === currentPersona.name)
      if (match) {
        setSelected(match.id)
        return
      }
    }
    setSelected(null)
  }, [roles, currentPersona])

  const handleSelect = (r: any) => {
    setSelected(r.id)
    const persona: UserPersona = {
      name: r.name || '',
      gender: mapGender(r.gender),
      age: r.age ? String(r.age) : '',
      profession: r.profession || '',
      basicInfo: r.basic_info || '',
      personality: r.personality || '',
      avatar: r.avatar || undefined
    }
    try { localStorage.setItem('user_chat_role_id', String(r.id)) } catch { }
    try { trackEvent('角色.选择', { 角色名: persona.name, 角色ID: r.id }); setTag('角色名', persona.name) } catch { }
    onSelect(persona, r.id)
    onClose()
  }

  const handleEdit = (r: any) => {
    closeSwipe(r.id)
    const persona: UserPersona = {
      name: r.name || '',
      gender: mapGender(r.gender),
      age: r.age ? String(r.age) : '',
      profession: r.profession || '',
      basicInfo: r.basic_info || '',
      personality: r.personality || '',
      avatar: r.avatar || undefined
    }
    try { trackEvent('角色.编辑', { 角色ID: r.id, 角色名: persona.name }) } catch { }
    if (onEdit) onEdit(persona, r.id)
    onClose()
  }

  const handleContextMenu = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    if (isTouch) return
    let x = e.clientX
    const menuWidth = 140
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
    setContextMenu({ visible: true, x, y: e.clientY, id })
  }

  const onTouchStart = (e: React.TouchEvent, id: number) => {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    activeIdRef.current = id
    initialOffsetRef.current = offsets[id] || 0
  }
  const onTouchMove = (e: React.TouchEvent, id: number) => {
    if (activeIdRef.current !== id) return
    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current
    if (Math.abs(dy) > Math.abs(dx)) return
    let next = 0
    if (initialOffsetRef.current === 0) {
      next = Math.max(-96, Math.min(96, dx))
    } else if (initialOffsetRef.current > 0) {
      next = Math.max(0, Math.min(96, initialOffsetRef.current + dx))
    } else {
      next = Math.min(0, Math.max(-96, initialOffsetRef.current + dx))
    }
    setOffsets(prev => ({ ...prev, [id]: next }))
  }
  const onTouchEnd = (id: number) => {
    if (activeIdRef.current !== id) return
    const current = offsets[id] || 0
    let final = 0
    if (initialOffsetRef.current === 0) {
      final = current > 60 ? 96 : current < -60 ? -96 : 0
    } else if (initialOffsetRef.current > 0) {
      final = current > 60 ? 96 : 0
    } else {
      final = current < -60 ? -96 : 0
    }
    setOffsets(prev => ({ ...prev, [id]: final }))
    activeIdRef.current = null
  }
  const closeSwipe = (id: number) => setOffsets(prev => ({ ...prev, [id]: 0 }))

  const handleConfirmDelete = async (id: number) => {
    setConfirmId(null)
    try {
      await deleteUserChatRole(id)
      setRoles(prev => prev.filter(r => r.id !== id))
    } catch { }
  }

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none'}`}>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 bg-black/30 will-change-opacity"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            />
            <motion.div
              key="sheet"
              className="absolute bottom-0 left-0 right-0 bg-transparent will-change-transform transform-gpu"
              initial={{ y: isTouch ? '100%' : 0 }}
              animate={{ y: 0 }}
              exit={{ y: isTouch ? '100%' : 0 }}
              transition={{ ...androidBottomSheet, duration: isTouch ? 0.28 : 0 }}
            >
              <div className="mx-auto w-full max-w-md bg-white rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
                <div className="sticky top-0 bg-white/95 backdrop-blur-md p-3 border-b border-slate-100 flex justify-between items-center z-10">
                  <button onClick={onClose} className="flex items-center gap-2"><ChevronLeft className="w-6 h-6" /><span className="font-bold text-lg">我的多重个人资料</span></button>
                  <button onClick={onAdd} className="w-9 h-9 rounded-full bg-purple-50 text-[#A855F7] flex items-center justify-center active:scale-90 transition-transform">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                  {roles.map(r => (
                    <div key={r.id} className="relative overflow-hidden rounded-xl">
                      {(() => {
                        const offset = offsets[r.id] || 0
                        const revealRight = Math.min(96, Math.max(0, -offset))
                        const revealLeft = Math.min(96, Math.max(0, offset))
                        return (
                          <>
                            <div className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center justify-center rounded-r-xl shadow-sm" style={{ width: `${revealRight}px`, transition: 'width 120ms ease' }}>
                              <button onClick={() => setConfirmId(r.id)} className="text-white font-bold drop-shadow-sm">删除</button>
                            </div>
                            <div className="absolute left-0 top-0 bottom-0 bg-indigo-500 flex items-center justify-center rounded-l-xl shadow-sm" style={{ width: `${revealLeft}px`, transition: 'width 120ms ease' }}>
                              <button onClick={() => handleEdit(r)} className="text-white font-bold drop-shadow-sm">编辑</button>
                            </div>
                          </>
                        )
                      })()}
                      <div
                        onClick={() => { if ((offsets[r.id] || 0) === 0) handleSelect(r) }}
                        onTouchStart={(e) => onTouchStart(e, r.id)}
                        onTouchMove={(e) => onTouchMove(e, r.id)}
                        onTouchEnd={() => onTouchEnd(r.id)}
                        onContextMenu={(e) => handleContextMenu(e, r.id)}
                        className={`${(offsets[r.id] || 0) < 0 ? 'rounded-l-xl rounded-r-none' : (offsets[r.id] || 0) > 0 ? 'rounded-l-none rounded-r-xl' : 'rounded-xl'} p-4 bg-white shadow-sm border flex items-center gap-3 active:scale-[0.98] transition-transform ${selected === r.id ? 'border-[#A855F7] shadow-[0_0_0_6px_rgba(168,85,247,0.18)]' : 'border-slate-100'}`}
                        style={{ transform: `translateX(${offsets[r.id] || 0}px)`, transition: 'transform 180ms ease' }}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                          {r.avatar ? <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" /> : (r.name || '我')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 truncate">{r.name}</div>
                          <div className="text-xs text-slate-500 truncate">{r.profession || ''}{r.age ? ` · ${r.age}` : ''}</div>
                        </div>
                        {selected === r.id && <CheckCircle className="w-5 h-5 text-[#A855F7]" />}
                      </div>
                    </div>
                  ))}
                  {!roles.length && (
                    <div className="p-6 text-center text-slate-500">
                      <div className="text-sm">暂无角色</div>
                      <div className="mt-3"><button onClick={onAdd} className="px-3 py-1.5 bg-[#A855F7] text-white rounded-lg text-sm font-bold">添加角色</button></div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {confirmId && (
        <>
          <div className="fixed inset-0 z-[95] bg-black/20"></div>
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm">
              <div className="px-6 py-5 text-center text-slate-800 font-bold">确认删除此角色？</div>
              <div className="h-[1px] bg-slate-100"></div>
              <div className="flex">
                <button className="flex-1 py-4 text-slate-600 active:opacity-70" onClick={() => { if (confirmId != null) closeSwipe(confirmId); setConfirmId(null); }}>取消</button>
                <div className="w-[1px] bg-slate-100"></div>
                <button className="flex-1 py-4 text-red-600 font-bold active:opacity-70" onClick={() => { const id = confirmId as number; handleConfirmDelete(id) }}>确认删除</button>
              </div>
            </div>
          </div>
        </>
      )}
      {contextMenu.visible && (
        <>
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(prev => ({ ...prev, visible: false })); }}
          ></div>
          <div
            className="fixed z-[100] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-w-[120px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                const r = roles.find(x => x.id === contextMenu.id)
                if (r) handleEdit(r)
                setContextMenu(prev => ({ ...prev, visible: false }))
              }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4 text-indigo-500" />
              编辑
            </button>
            <div className="h-[1px] bg-slate-100 w-full"></div>
            <button
              onClick={() => {
                setConfirmId(contextMenu.id)
                setContextMenu(prev => ({ ...prev, visible: false }))
              }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default UserRoleSelectorSheet
