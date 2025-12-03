import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Copy, Archive, Send, X } from 'lucide-react';
import CharacterCreateView from './CharacterCreateView.jsx';
import { ToastProvider, useToast } from '../Toast.jsx';
import { charactersAPI } from '../api.js';

const CharacterManagementInner = ({ creatorRole }) => {
  const [view, setView] = useState('list');
  const [editingChar, setEditingChar] = useState(null);
  const [characterList, setCharacterList] = useState([]);
  const [mode, setMode] = useState('new');
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const CARD_HEIGHT = 220;
  const TAG_MAX_W = 300;
  const reload = async () => {
    try {
      const params = creatorRole ? { creator_role: creatorRole } : {};
      const d = await charactersAPI.list(params);
      setCharacterList(d.items || []);
    } catch {
      showToast('加载失败', 'error');
    }
  };
  useEffect(() => { reload(); }, [creatorRole]);
  const handleEdit = (char) => { setEditingChar(char); setMode('edit'); setView('create'); };
  const handleCreateNew = () => { setEditingChar(null); setMode('new'); setView('create'); };
  const handleCopy = (char) => { const copiedChar = { ...char, id: undefined, name: `${char.name}_copy`, status: 'draft' }; setEditingChar(copiedChar); setMode('copy'); setView('create'); showToast('复制成功，已进入编辑'); };
  const handleToggleStatus = async (id, current) => { try { await charactersAPI.setStatus(id, current === 'published' ? 'draft' : 'published'); await reload(); } catch { showToast('操作失败', 'error'); } };
  const openDelete = (char) => setDeleteTarget(char);
  const closeDelete = () => setDeleteTarget(null);
  const confirmDelete = async () => { if (!deleteTarget) return; try { await charactersAPI.remove(deleteTarget.id); showToast('删除成功'); await reload(); } catch { showToast('删除失败', 'error'); } finally { closeDelete(); } };
  if (view === 'create') return <CharacterCreateView initialData={editingChar} onCancel={() => { setView('list'); reload(); }} mode={mode} notify={showToast} />;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-pink-900 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>
            {creatorRole === 'user_role' ? '用户角色' : '官方角色'}
          </h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">
            {creatorRole === 'user_role' ? '查看用户创建的角色' : '管理官方发布的 AI 角色'}
          </p>
        </div>
        {creatorRole !== 'user_role' && (
          <button onClick={handleCreateNew} className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition-all flex items-center gap-2 text-sm">
            <Plus size={16} /> 创建角色
          </button>
        )}
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 360px))' }}>
        {characterList.map((char) => (
          <div key={char.id} className="relative w-full">
            <div className="glass-card p-4 rounded-3xl hover:shadow-xl transition-all group relative overflow-hidden h-[220px] flex flex-col">
              <div className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-md font-bold ${char.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{char.status === 'published' ? '已发布' : '草稿'}</div>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center text-white text-xl font-bold shadow-inner border-2 border-white overflow-hidden flex-shrink-0">
                  {char.avatar ? (
                    <img src={char.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{char.name ? (char.name[0]) : '?'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{char.name}</h3>
                    <div className="text-xs text-gray-400 truncate">
                      {(char.age != null && char.age !== '') ? `${char.age}岁` : ''}
                      {char.occupation ? `${(char.age != null && char.age !== '') ? ' · ' : ''}${char.occupation}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2 flex-nowrap whitespace-nowrap overflow-hidden" style={{ maxWidth: TAG_MAX_W }}>
                    {char.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">#{t}</span>
                    ))}
                  </div>
                  {/* 人设文案移动到头像下方，完整换行显示 */}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-gray-600 text-sm leading-relaxed break-words">
                  {char.tagline || '暂无一句话人设'}
                </p>
              </div>
              <div className="mt-auto flex gap-2 pt-3 border-t border-white/50">
                <button onClick={() => handleEdit(char)} className="flex-1 py-2 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Edit3 size={12} /> 编辑</button>
                <button onClick={() => handleCopy(char)} className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Copy size={12} /> 复制</button>
                {char.status === 'published' ? (
                  <button onClick={() => handleToggleStatus(char.id, char.status)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Archive size={12} /> 回收</button>
                ) : (
                  <button onClick={() => handleToggleStatus(char.id, char.status)} className="flex-1 py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Send size={12} /> 发布</button>
                )}
              </div>
            </div>
            <button onClick={() => openDelete(char)} className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/60 backdrop-blur-md shadow-lg border border-pink-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-64 bg-black/30 z-50" onClick={closeDelete}></div>
          <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-pink-50 p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-cute text-lg text-pink-900 mb-2">删除角色</h3>
              <p className="text-sm text-gray-500 mb-4">确定删除“{deleteTarget.name}”吗？此操作不可撤回。</p>
              <div className="flex justify-end gap-3">
                <button onClick={closeDelete} className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">取消</button>
                <button onClick={confirmDelete} className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-sm shadow-sm hover:bg-red-600">确认删除</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const CharacterManagement = ({ creatorRole }) => (
  <ToastProvider>
    <CharacterManagementInner creatorRole={creatorRole} />
  </ToastProvider>
);

export default CharacterManagement;
