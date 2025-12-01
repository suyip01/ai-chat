import React, { useState, useEffect } from 'react';
import { Plus, Info, Edit3, Copy, CheckCircle, Star, Trash2 } from 'lucide-react';
import TemplateCreateView from './TemplateCreateView.jsx';
import { ToastProvider, useToast } from '../Toast.jsx';
import { templatesAPI } from '../api.js';

const TemplatesViewContent = () => {
  const [view, setView] = useState('list');
  const [templates, setTemplates] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [editingTpl, setEditingTpl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showToast } = useToast();

  const reload = async () => {
    try {
      const data = await templatesAPI.list();
      setTemplates(data.items || []);
    } catch {
      showToast('加载失败：请稍后再试', 'error');
    }
  };
  useEffect(() => { reload(); }, []);

  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return at - bt;
  });
  const totalPages = Math.max(1, Math.ceil(sortedTemplates.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageItems = sortedTemplates.slice(startIdx, startIdx + PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [templates]);

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${hh}:${mm}`;
  };

  const handleSetDefault = async (id) => {
    try { await templatesAPI.setDefault(id); showToast('已设为默认'); reload(); } catch { showToast('操作失败', 'error'); }
  };

  const handleEdit = (tpl) => { setEditingTpl(tpl); setView('create'); };
  const handleCopy = (tpl) => {
    const draft = { ...tpl, id: undefined, name: `${tpl.name}_copy` };
    setEditingTpl(draft);
    setView('create');
    showToast('复制成功，已进入编辑');
  };
  const handleDelete = async (id) => {
    try { await templatesAPI.remove(id); } catch { throw new Error('failed'); }
  };
  const openDelete = (tpl) => setDeleteTarget(tpl);
  const closeDelete = () => setDeleteTarget(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await handleDelete(deleteTarget.id); showToast('删除成功'); reload(); } catch { showToast('删除失败', 'error'); } finally { closeDelete(); }
  };
  const handleSave = async (data) => {
    try {
      if (editingTpl && editingTpl.id) { await templatesAPI.update(editingTpl.id, data); showToast('保存成功：模版已更新'); }
      else { await templatesAPI.create(data); showToast('创建成功：模版已保存'); }
      setEditingTpl(null); setView('list'); reload();
    } catch { showToast('保存失败：请稍后重试', 'error'); }
  };

  if (view === 'create') {
    return <TemplateCreateView onCancel={() => { setEditingTpl(null); setView('list'); }} initialData={editingTpl} onSave={handleSave} notify={showToast} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>
            提示词模版库
          </h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">管理用于生成角色的基础 Prompt</p>
        </div>
        <button onClick={() => { setEditingTpl(null); setView('create'); }} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm"><Plus size={16} /> 新建模版</button>
      </div>
      <div className="flex items-center gap-2 bg-purple-50 p-4 rounded-2xl border border-purple-100 text-sm text-purple-700">
        <Info size={18} className="flex-shrink-0 text-purple-500" />
        <span>提示：用户创建角色时，默认使用当前<span className="font-bold">“默认”</span>提示词模板作为参考生成角色提示词。</span>
      </div>
      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left rounded-2xl overflow-hidden border-collapse">
          <thead className="bg-purple-100 text-purple-900 font-cute text-sm">
            <tr>
              <th className="p-3 pl-6 w-16">序号</th>
              <th className="p-3 pl-7">模版名称</th>
              <th className="p-3">类型</th>
              <th className="p-3">标签</th>
              <th className="p-3">创建时间</th>
              <th className="p-3">引用数</th>
              <th className="p-3">状态 / 操作</th>
              <th className="p-3 text-right pr-8">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-purple-100">
            {pageItems.map((tpl, i) => (
              <tr key={tpl.id} className="hover:bg-purple-50/30 transition-colors">
                <td className="p-3 pl-6 text-gray-500 font-mono">{startIdx + i + 1}</td>
                <td className="p-3 pl-8 font-bold text-gray-700">{tpl.name}</td>
                <td className="p-3"><span className="bg-purple-100 text-purple-600 px-2.5 py-1 rounded-lg text-xs font-bold">{tpl.type}</span></td>
                <td className="p-3"><div className="flex gap-1">{tpl.tags?.map((t) => <span key={t} className="text-[10px] bg-white border border-purple-100 text-purple-400 px-1.5 py-0.5 rounded">{t}</span>)}</div></td>
                <td className="p-3 text-gray-500">{formatDate(tpl.createdAt)}</td>
                <td className="p-3 text-gray-500 font-mono">{typeof tpl.refCount === 'number' ? tpl.refCount : 0}</td>
                <td className="p-3">
                  {tpl.isDefault ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                      <CheckCircle size={14} className="text-green-600" />
                      当前默认
                    </span>
                  ) : (
                    <button onClick={() => handleSetDefault(tpl.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 text-xs font-bold hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all group">
                      <Star size={14} className="group-hover:fill-purple-200" />
                      设为默认
                    </button>
                  )}
                </td>
                <td className="p-3 text-right pr-8 space-x-2">
                  <span className="relative inline-flex group">
                    <button onClick={() => handleEdit(tpl)} aria-label="编辑" className="text-purple-400 hover:text-purple-600 p-1"><Edit3 size={16} /></button>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100">编辑</span>
                  </span>
                  <span className="relative inline-flex group">
                    <button onClick={() => handleCopy(tpl)} aria-label="复制" className="text-purple-400 hover:text-purple-600 p-1"><Copy size={16} /></button>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100">复制</span>
                  </span>
                  <span className="relative inline-flex group">
                    <button onClick={() => openDelete(tpl)} aria-label="删除" className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100">删除</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-3 border-t border-purple-100">
          <div className="text-xs text-gray-500">第 {page} / {totalPages} 页</div>
          <div className="flex items-center gap-2">
            <button disabled={page===1} onClick={() => setPage((p)=>Math.max(1,p-1))} className={`px-3 py-1 rounded-lg text-xs font-bold ${page===1 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}>上一页</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i+1)} className={`w-8 h-8 rounded-lg text-xs font-bold ${page===i+1 ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}>{i+1}</button>
            ))}
            <button disabled={page===totalPages} onClick={() => setPage((p)=>Math.min(totalPages,p+1))} className={`px-3 py-1 rounded-lg text-xs font-bold ${page===totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}>下一页</button>
          </div>
        </div>
      </div>
      {deleteTarget && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-64 bg-black/30 z-50" onClick={closeDelete}></div>
          <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-purple-50 p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-cute text-lg text-purple-900 mb-2">删除提示词模版</h3>
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

const TemplatesView = () => (
  <ToastProvider>
    <TemplatesViewContent />
  </ToastProvider>
);

export default TemplatesView;
