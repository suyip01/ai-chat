import React, { useEffect, useState } from 'react'
import { Plus, Edit3, X, Archive, Send } from 'lucide-react'
import { ToastProvider, useToast } from '../Toast.jsx'
import { storiesAPI } from '../api.js'
import StoryCreateView from './StoryCreateView.jsx'

const StoryManagementInner = () => {
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const { showToast } = useToast()
  const [list, setList] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const reload = async () => { try { const d = await storiesAPI.list(); setList(d.items || []) } catch { showToast('加载失败', 'error') } }
  useEffect(() => { reload() }, [])
  const onCreate = () => { setEditing(null); setView('create') }
  const onEdit = (item) => { setEditing(item); setView('create') }
  const onDelete = async (id) => { try { await storiesAPI.remove(id); showToast('删除成功'); reload() } catch { showToast('删除失败', 'error') } }
  const handleToggleStatus = async (id, current) => {
    try {
      await storiesAPI.setStatus(id, current === 'published' ? 'draft' : 'published')
      showToast(current === 'published' ? '已回收为草稿' : '已发布')
      reload()
    } catch { showToast('操作失败', 'error') }
  }
  if (view === 'create') return <StoryCreateView initialData={editing} onCancel={() => { setView('list'); reload() }} notify={showToast} />
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-pink-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span> 故事管理</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">查看与编辑故事内容</p>
        </div>
        <button onClick={onCreate} className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition-all flex items-center gap-2 text-sm"><Plus size={16}/> 创建故事</button>
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 360px))' }}>
        {list.map(st => (
          <div key={st.id} className="relative w-full">
            <div className="glass-card p-4 rounded-3xl hover:shadow-xl transition-all group relative overflow-hidden h-[220px] flex flex-col">
              <div className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-md font-bold ${st.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{st.status === 'published' ? '已发布' : '草稿'}</div>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center text-white text-xl font-bold shadow-inner border-2 border-white overflow-hidden flex-shrink-0">
                  {st.image ? (<img src={st.image} alt="cover" className="w-full h-full object-cover" />) : (<span>{st.title ? st.title[0] : '?'}</span>)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{st.title}</h3>
                    <div className="text-xs text-gray-400 truncate">{st.author || ''}</div>
                  </div>
                  <div className="flex gap-1 mt-2 flex-nowrap whitespace-nowrap overflow-hidden" style={{ maxWidth: 300 }}>
                    {(st.tags || []).map(t => (<span key={t} className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">#{t}</span>))}
                  </div>
                </div>
              </div>
              <div className="mt-3"><p className="text-gray-600 text-sm leading-relaxed break-words">{st.description || '暂无描述'}</p></div>
              <div className="mt-auto flex gap-2 pt-3 border-t border-white/50">
                <button onClick={() => onEdit(st)} className="flex-1 py-2 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Edit3 size={12}/> 编辑</button>
                {st.status === 'published' ? (
                  <button onClick={() => handleToggleStatus(st.id, st.status)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Archive size={12}/> 回收</button>
                ) : (
                  <button onClick={() => handleToggleStatus(st.id, st.status)} className="flex-1 py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Send size={12}/> 发布</button>
                )}
              </div>
            </div>
            <button onClick={() => setDeleteTarget(st)} className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/60 backdrop-blur-md shadow-lg border border-pink-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition"><X size={12}/></button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-64 bg-black/30 z-50" onClick={() => setDeleteTarget(null)}></div>
          <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-pink-50 p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-cute text-lg text-pink-900 mb-2">删除故事</h3>
              <p className="text-sm text-gray-500 mb-4">确定删除“{deleteTarget.title}”吗？此操作不可撤回。</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)} className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">取消</button>
                <button onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null) }} className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-sm shadow-sm hover:bg-red-600">确认删除</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const StoryManagement = () => (
  <ToastProvider>
    <StoryManagementInner />
  </ToastProvider>
)

export default StoryManagement
