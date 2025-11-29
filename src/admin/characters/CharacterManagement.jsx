import React, { useState } from 'react';
import { Plus, Edit3, Copy, Archive, Send, X } from 'lucide-react';
import CharacterCreateView from './CharacterCreateView.jsx';
import { MOCK_CHARACTERS_INITIAL } from '../data/mock.js';
import { ToastProvider, useToast } from '../Toast.jsx';

const CharacterManagementInner = () => {
  const [view, setView] = useState('list');
  const [editingChar, setEditingChar] = useState(null);
  const [characterList, setCharacterList] = useState(MOCK_CHARACTERS_INITIAL);
  const [mode, setMode] = useState('new');
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const handleEdit = (char) => { setEditingChar(char); setMode('edit'); setView('create'); };
  const handleCreateNew = () => { setEditingChar(null); setMode('new'); setView('create'); };
  const handleCopy = (char) => { const copiedChar = { ...char, id: Date.now(), name: `${char.name}_copy`, status: 'draft' }; setEditingChar(copiedChar); setMode('copy'); setView('create'); showToast('复制成功，已进入编辑'); };
  const handleToggleStatus = (id) => { setCharacterList((prev) => prev.map((char) => (char.id === id ? { ...char, status: char.status === 'published' ? 'draft' : 'published' } : char))); };
  const openDelete = (char) => setDeleteTarget(char);
  const closeDelete = () => setDeleteTarget(null);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const exists = characterList.some((c) => c.id === deleteTarget.id);
    if (exists) {
      setCharacterList((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast('删除成功');
    } else {
      showToast('删除失败：未找到角色', 'error');
    }
    closeDelete();
  };
  if (view === 'create') return <CharacterCreateView initialData={editingChar} onCancel={() => setView('list')} mode={mode} notify={showToast} />;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span> 角色管理</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">管理所有 AI 角色及配置</p>
        </div>
        <button onClick={handleCreateNew} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:opacity-90 transition-all flex items-center gap-2 text-sm"><Plus size={16} /> 创建角色</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characterList.map((char) => (
          <div key={char.id} className="relative">
            <div className="glass-card p-5 rounded-3xl hover:shadow-xl transition-all group relative overflow-hidden">
              <div className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-md font-bold ${char.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{char.status === 'published' ? '已发布' : '草稿'}</div>
              <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center text-white text-xl font-bold shadow-inner border-2 border-white">{char.avatar}</div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">{char.name}</h3>
                <div className="flex gap-1 mt-1">{char.tags.map((t) => <span key={t} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">#{t}</span>)}</div>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-4 line-clamp-2 h-8 leading-relaxed">{char.intro}</p>
            <div className="bg-white/50 rounded-xl p-3 mb-4 text-xs text-gray-500 flex justify-between items-center"><span>引用模版:</span><span className="font-bold text-purple-600">{char.template}</span></div>
            <div className="flex gap-2 pt-2 border-t border-white/50">
              <button onClick={() => handleEdit(char)} className="flex-1 py-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Edit3 size={12} /> 编辑</button>
              <button onClick={() => handleCopy(char)} className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Copy size={12} /> 复制</button>
              {char.status === 'published' ? (
                <button onClick={() => handleToggleStatus(char.id)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Archive size={12} /> 回收</button>
              ) : (
                <button onClick={() => handleToggleStatus(char.id)} className="flex-1 py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-1 mx-1"><Send size={12} /> 发布</button>
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

const CharacterManagement = () => (
  <ToastProvider>
    <CharacterManagementInner />
  </ToastProvider>
);

export default CharacterManagement;
