import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { ToastProvider, useToast } from '../Toast.jsx';
import { modelsAPI } from '../api.js';

const Content = () => {
  const { showToast } = useToast();
  const [modelList, setModelList] = useState([]);
  const [modelPage, setModelPage] = useState(1);
  const MODEL_PAGE_SIZE = 6;
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [newModel, setNewModel] = useState({ model_id: '', model_name: '', model_nickname: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchModels = async () => {
    try { const data = await modelsAPI.list(); setModelList(data.items || []); }
    catch { showToast('模型列表加载失败', 'error'); }
  };

  useEffect(() => { fetchModels(); }, []);

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

  const totalModelPages = Math.max(1, Math.ceil(modelList.length / MODEL_PAGE_SIZE));
  const modelStartIdx = (modelPage - 1) * MODEL_PAGE_SIZE;
  const modelPageItems = modelList.slice(modelStartIdx, modelStartIdx + MODEL_PAGE_SIZE);
  useEffect(() => { if (modelPage > totalModelPages) setModelPage(totalModelPages); }, [modelList]);

  const handleSaveModel = async () => {
    if (!newModel.model_id || !newModel.model_name) { showToast('请填写完整信息', 'error'); return; }
    try {
      await modelsAPI.create(newModel);
      showToast('模型添加成功');
      setIsModelModalOpen(false);
      setNewModel({ model_id: '', model_name: '', model_nickname: '' });
      fetchModels();
    } catch { showToast('添加失败', 'error'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>模型管理</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">维护可用的模型列表</p>
        </div>
        <button onClick={() => setIsModelModalOpen(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-600 transition-colors flex items-center gap-2 text-xs"><Plus size={14} /> 添加模型</button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-purple-100">
        <table className="w-full text-left border-collapse">
          <thead className="bg-purple-100 text-purple-900 font-cute text-sm">
            <tr>
              <th className="p-3 pl-6 w-16">序号</th>
              <th className="p-3">模型名称</th>
              <th className="p-3">模型ID</th>
              <th className="p-3">盲测模型昵称</th>
              <th className="p-3">添加时间</th>
              <th className="p-3 text-right pr-6">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-purple-100">
            {modelPageItems.map((model, index) => (
              <tr key={model.id} className="hover:bg-purple-50/30 transition-colors">
                <td className="p-3 pl-6 text-gray-500 font-mono">{modelStartIdx + index + 1}</td>
                <td className="p-3 font-bold text-purple-700">{model.model_name}</td>
                <td className="p-3 font-mono text-gray-600">{model.model_id}</td>
                <td className="p-3 text-gray-600">{model.model_nickname || '-'}</td>
                <td className="p-3 text-gray-500">{formatDate(model.created_at)}</td>
                <td className="p-3 text-right pr-6">
                  <button onClick={() => setDeleteTarget(model)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {modelList.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">暂无模型数据</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-3">
          <div className="text-xs text-gray-500">第 {modelPage} / {totalModelPages} 页</div>
          <div className="flex items-center gap-2">
            <button disabled={modelPage===1} onClick={() => setModelPage((p)=>Math.max(1,p-1))} className={`px-3 py-1 rounded-lg text-xs font-bold ${modelPage===1 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}>上一页</button>
            {Array.from({ length: totalModelPages }).map((_, i) => (
              <button key={i} onClick={() => setModelPage(i+1)} className={`w-8 h-8 rounded-lg text-xs font-bold ${modelPage===i+1 ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}>{i+1}</button>
            ))}
            <button disabled={modelPage===totalModelPages} onClick={() => setModelPage((p)=>Math.min(totalModelPages,p+1))} className={`px-3 py-1 rounded-lg text-xs font-bold ${modelPage===totalModelPages ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}>下一页</button>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setDeleteTarget(null)}></div>
          <div className="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-purple-100 p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-cute text-lg text-purple-900 mb-2">删除模型</h3>
              <p className="text-sm text-gray-500 mb-4">确定删除“{deleteTarget.model_name}”吗？此操作不可撤回。</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)} className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">取消</button>
                <button onClick={async () => { try { await modelsAPI.remove(deleteTarget.id); showToast('删除成功'); setDeleteTarget(null); fetchModels(); } catch { showToast('删除失败', 'error'); } }} className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-sm shadow-sm hover:bg-red-600">确认删除</button>
              </div>
            </div>
          </div>
        </>
      )}

      {isModelModalOpen && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-64 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setIsModelModalOpen(false)}></div>
          <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-purple-100 shadow-2xl p-6 animate-fade-in w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-cute text-xl text-purple-900">添加新模型</h3>
                <button onClick={() => setIsModelModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1.5">模型ID <span className="text-red-400">*</span></label>
                  <input type="text" value={newModel.model_id} onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })} placeholder="例如: gpt-4-turbo" className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1.5">模型名称 <span className="text-red-400">*</span></label>
                  <input type="text" value={newModel.model_name} onChange={(e) => setNewModel({ ...newModel, model_name: e.target.value })} placeholder="例如: GPT-4 Turbo" className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1.5">盲测模型昵称</label>
                  <input type="text" value={newModel.model_nickname} onChange={(e) => setNewModel({ ...newModel, model_nickname: e.target.value })} placeholder="例如: 智慧之星" className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setIsModelModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors">取消</button>
                <button onClick={handleSaveModel} className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-600 transition-all">保存模型</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ModelManageView = () => (
  <ToastProvider>
    <Content />
  </ToastProvider>
);

export default ModelManageView;
