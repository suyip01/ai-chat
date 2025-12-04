import React, { useEffect, useState } from 'react'
import { ChevronLeft, CheckCircle, Plus } from 'lucide-react'
import { UserPersona } from '../types'
import { fetchUserChatRoles } from '../services/chatService'
import { AnimatePresence, motion } from 'framer-motion'
import { androidBottomSheet, fade } from '../animations'

interface Props {
  isOpen: boolean
  currentPersona?: UserPersona
  onClose: () => void
  onAdd: () => void
  onSelect: (persona: UserPersona, roleId?: number) => void
}

const mapGender = (g?: string): 'male' | 'female' | 'secret' => {
  if (g === '男') return 'male'
  if (g === '女') return 'female'
  return 'secret'
}

export const UserRoleSelectorSheet: React.FC<Props> = ({ isOpen, currentPersona, onClose, onAdd, onSelect }) => {
  const [roles, setRoles] = useState<Array<{ id: number; name: string; age: number | null; gender: string; profession: string | null; basic_info: string | null; personality: string | null; avatar: string | null }>>([])
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        try {
          const list = await fetchUserChatRoles()
          setRoles(list)
        } catch { }
      }
      load()
    }
  }, [isOpen])

  useEffect(() => {
    if (currentPersona) {
      const m = roles.find(r => r.name === currentPersona.name)
      if (m) setSelected(m.id)
    }
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
    onSelect(persona, r.id)
    onClose()
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={androidBottomSheet}
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
                    <div key={r.id} onClick={() => handleSelect(r)} className={`p-4 bg白 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-[0.98] transition-transform ${selected === r.id ? 'border-[#A855F7] bg-[#FBF5FF]' : ''}`}>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {r.avatar ? <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" /> : (r.name || '我')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{r.name}</div>
                        <div className="text-xs text-slate-500 truncate">{r.profession || ''}{r.age ? ` · ${r.age}` : ''}</div>
                      </div>
                      {selected === r.id && <CheckCircle className="w-5 h-5 text-[#A855F7]" />}
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
    </div>
  )
}

export default UserRoleSelectorSheet
