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
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>
            {creatorRole === 'user_role' ? '用户角色' : '官方角色'}
          </h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">
            {creatorRole === 'user_role' ? '查看用户创建的角色' : '管理官方发布的 AI 角色'}
          </p>
        </div>
        {creatorRole !== 'user_role' && (
          <button onClick={handleCreateNew} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:opacity-90 transition-all flex items-center gap-2 text-sm">
            <Plus size={16} /> 创建角色
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characterList.map((char) => (
          <div key={char.id} className="relative">
            <div className="glass-card p-4 rounded-3xl hover:shadow-xl transition-all group relative overflow-hidden h-[260px] flex flex-col">
              <div className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-md font-bold ${char.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{char.status === 'published' ? '已发布' : '草稿'}</div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center text-white text-xl font-bold shadow-inner border-2 border-white overflow-hidden">
                  {char.avatar ? (
                    <img src={char.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{char.name ? (char.name[0]) : '?'}</span>
                  )}
                </div>
                 <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-800">{char.name}</h3>
                  <div className="flex gap-1 mt-1 flex-nowrap overflow-hidden whitespace-nowrap">
                    {char.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-xs mb-3 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-line' }}>{(char.intro && char.intro.trim()) ? char.intro : '暂无简介\n暂无简介'}</p>
              <div className="bg-white/50 rounded-xl p-2 mb-3 text-xs text-gray-500">
                <div className="flex items-start gap-3">
                  <div className="text-gray-500">
                    <div>引用</div>
                    <div>模版</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-purple-600 truncate">标准：{char.templateName || '-'}</div>
                    <div className="font-bold text-purple-600 truncate">场景：{char.sceneTemplateName || '-'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex gap-2 pt-2 border-t border-white/50">
                <button onClick={() => handleEdit(char)} className="flex-1 py-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Edit3 size={12} /> 编辑</button>
                <button onClick={() => handleCopy(char)} className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Copy size={12} /> 复制</button>
                {char.status === 'published' ? (
                  <button onClick={() => handleToggleStatus(char.id, char.status)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Archive size={12} /> 回收</button>
                ) : (
                  <button onClick={() => handleToggleStatus(char.id, char.status)} className="flex-1 py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Send size={12} /> 发布</button>
                )}
              </div>
            </div>
            <button onClick={() => openDelete(char)} className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/60 backdrop-blur-md shadow-lg border border-purple-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-64 bg-black/30 z-50" onClick={closeDelete}></div>
          <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-purple-50 p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-cute text-lg text-purple-900 mb-2">删除角色</h3>
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
