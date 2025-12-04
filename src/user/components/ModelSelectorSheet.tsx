import React, { useEffect, useState } from 'react'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { androidBottomSheet, fade } from '../animations'
import { listModels } from '../services/chatService'

interface Props {
  isOpen: boolean
  currentModelId?: string
  onClose: () => void
  onSelect: (modelId: string, nickname?: string) => void
  temperature?: number
  onTempChange?: (t: number) => void
}

export const ModelSelectorSheet: React.FC<Props> = ({ isOpen, currentModelId, onClose, onSelect, temperature, onTempChange }) => {
  const [models, setModels] = useState<Array<{ id: string; nickname: string }>>([])
  const [selected, setSelected] = useState<string | undefined>(currentModelId)
  const [temp, setTemp] = useState<number>(typeof temperature === 'number' ? temperature : 0.1)

  useEffect(() => { setSelected(currentModelId) }, [currentModelId])
  useEffect(() => { if (typeof temperature === 'number') setTemp(temperature) }, [temperature])

  useEffect(() => {
    if (!isOpen) return
    const load = async () => { try {
      const items = await listModels();
      const sorted = [...items].sort((a,b) => ((a.nickname || a.id).localeCompare(b.nickname || b.id, 'zh-CN', { sensitivity: 'base' })))
      setModels(sorted)
    } catch {} }
    load()
  }, [isOpen])

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none'}`}>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div key="backdrop" className="absolute inset-0 bg-black/30 will-change-opacity" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} />
            <motion.div key="sheet" className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] will-change-transform transform-gpu" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={androidBottomSheet}>
              <div className="sticky top-0 bg-white/95 backdrop-blur-md p-3 border-b border-slate-100 flex justify-between items-center z-10">
                <button onClick={onClose} className="flex items-center gap-2"><ChevronLeft className="w-6 h-6" /><span className="font-bold text-lg">我的模型</span></button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">温度</span>
                  <input value={temp} onChange={e => { const v = parseFloat(e.target.value || '0'); setTemp(isNaN(v) ? 0 : v); onTempChange?.(isNaN(v) ? 0 : v) }} type="number" step="0.1" min="0" max="2" className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                {models.map(m => (
                  <div
                    key={m.id}
                    onClick={() => { setSelected(m.id); onSelect(m.id, m.nickname); onClose() }}
                    className={`relative p-4 rounded-xl shadow-sm border active:scale-[0.98] transition-transform flex items-center justify-center ${selected === m.id ? 'bg-[#F3E8FF] border-[#A855F7]' : 'bg-white border-slate-100'}`}
                  >
                    <div className="w-full text-center font-bold text-slate-800 truncate">{m.nickname || m.id}</div>
                    {selected === m.id && <CheckCircle className="w-5 h-5 text-[#A855F7] absolute right-4 top-1/2 -translate-y-1/2" />}
                  </div>
                ))}
                {!models.length && (
                  <div className="p-6 text-center text-slate-500">
                    <div className="text-sm">暂无模型</div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ModelSelectorSheet
