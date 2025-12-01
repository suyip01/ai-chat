import React, { useState, useRef, useEffect } from 'react';
import { Save, HelpCircle, Plus, X, Trash2 } from 'lucide-react';
import { ToastProvider, useToast } from '../Toast.jsx';
import { modelsAPI, settingsAPI } from '../api.js';

const TemperatureInput = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      min="0"
      max="2"
      step="0.05"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="dream-input w-24 px-2 py-3 rounded-xl text-sm font-bold text-center"
    />
    <div className="relative group">
      <HelpCircle size={18} className="text-purple-400 cursor-help" />
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-white/90 backdrop-blur-sm border border-purple-100 text-purple-900 text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
        温度：高数值输出随机，低数值输出集中。
      </div>
    </div>
  </div>
);

const SettingsContent = () => {
  const getModelLabel = (id) => {
    const m = modelList.find((x) => x.model_id === id);
    return m ? (m.model_name || m.model_id) : '-- 请选择 --';
  };

  const [selectedModel, setSelectedModel] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const ddRef = useRef(null);
  const [selectedChatModel, setSelectedChatModel] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatRef = useRef(null);
  const [selectedStoryModel, setSelectedStoryModel] = useState('');
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const storyRef = useRef(null);

  const [temperature, setTemperature] = useState(0.1);
  const [chatTemperature, setChatTemperature] = useState(0.1);
  const [storyTemperature, setStoryTemperature] = useState(0.1);
  const [defaultTemplateId, setDefaultTemplateId] = useState(null);

  // Dummy data for model management
  const [modelList, setModelList] = useState([]);
  const [modelPage, setModelPage] = useState(1);
  const MODEL_PAGE_SIZE = 6;
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [newModel, setNewModel] = useState({ model_id: '', model_name: '', model_nickname: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchModels = async () => {
    try {
      const data = await modelsAPI.list();
      setModelList(data.items || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      showToast('模型列表加载失败', 'error');
    }
  };

  useEffect(() => {
    fetchModels();
    (async () => {
      try {
        const s = await settingsAPI.get();
        setSelectedModel(s.selected_model);
        setSelectedChatModel(s.selected_chat_model);
        setSelectedStoryModel(s.selected_story_model);
        setTemperature(Number(s.model_temperature || 0.1));
        setChatTemperature(Number(s.chat_temperature || 0.1));
        setStoryTemperature(Number(s.story_temperature || 0.1));
        setDefaultTemplateId(s.default_template_id || null);
      } catch {
        showToast('加载设置失败', 'error');
      }
    })();
  }, []);

  const handleSaveModel = async () => {
    if (!newModel.model_id || !newModel.model_name) {
      showToast('请填写完整信息', 'error');
      return;
    }
    try {
      await modelsAPI.create(newModel);
      showToast('模型添加成功');
      setIsModelModalOpen(false);
      setNewModel({ model_id: '', model_name: '', model_nickname: '' });
      fetchModels();
    } catch (error) {
      showToast('添加失败', 'error');
    }
  };

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

  useEffect(() => {
    const onDoc = (e) => {
      if (isDropdownOpen && ddRef.current && !ddRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (isChatOpen && chatRef.current && !chatRef.current.contains(e.target)) setIsChatOpen(false);
      if (isStoryOpen && storyRef.current && !storyRef.current.contains(e.target)) setIsStoryOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isDropdownOpen, isChatOpen, isStoryOpen]);

  const labelText = getModelLabel(selectedModel);
  const chatLabelText = getModelLabel(selectedChatModel);
  const storyLabelText = getModelLabel(selectedStoryModel);

  const sortedByName = [...modelList].sort((a,b) => (a.model_name || a.model_id).localeCompare(b.model_name || b.model_id));
  const totalModelPages = Math.max(1, Math.ceil(modelList.length / MODEL_PAGE_SIZE));
  const modelStartIdx = (modelPage - 1) * MODEL_PAGE_SIZE;
  const modelPageItems = modelList.slice(modelStartIdx, modelStartIdx + MODEL_PAGE_SIZE);
  useEffect(() => { if (modelPage > totalModelPages) setModelPage(totalModelPages); }, [modelList]);

  const { showToast } = useToast();
  const saveAll = async () => {
    try {
      await settingsAPI.save({
        selected_model: selectedModel,
        selected_chat_model: selectedChatModel,
        selected_story_model: selectedStoryModel,
        model_temperature: Number(temperature),
        chat_temperature: Number(chatTemperature),
        story_temperature: Number(storyTemperature),
        default_template_id: defaultTemplateId,
      });
      showToast('设置已保存');
    } catch { showToast('保存失败', 'error'); }
  };
  const handleConfirm = saveAll;
  const handleConfirmChat = saveAll;
  const handleConfirmStory = saveAll;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>
            系统设置
          </h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">配置全局参数与模型</p>
        </div>
      </div>

      <div className="solid-card p-8 rounded-3xl">
        <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span>
          模型配置
        </h3>
        <div className="space-y-5">

          <div>
            <label className="block text-xs font-bold text-purple-800 mb-2">角色提示词AI模型</label>
            <div className="flex items-center gap-4">
              <div className="relative w-full max-w-md" ref={ddRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isDropdownOpen ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                  <span className={`${selectedModel ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{labelText}</span>
                  <div className={`text-purple-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</div>
                </button>
                {isDropdownOpen && (
                  <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                    {(sortedByName.length === 0) ? (
                      <li className="px-4 py-3 text-sm text-gray-400">暂无模型，请先添加</li>
                    ) : (
                      sortedByName.map(opt => (
                        <li key={opt.id} onClick={() => { setSelectedModel(opt.model_id); setIsDropdownOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedModel === opt.model_id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{opt.model_name || opt.model_id}</li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <TemperatureInput value={temperature} onChange={setTemperature} />
              <button onClick={handleConfirm} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2">
                <Save size={16} /> 确认
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-purple-800 mb-2">角色聊天AI模型</label>
            <div className="flex items-center gap-4">
              <div className="relative w-full max-w-md" ref={chatRef}>
                <button onClick={() => setIsChatOpen(!isChatOpen)} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isChatOpen ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                  <span className={`${selectedChatModel ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{chatLabelText}</span>
                  <div className={`text-purple-400 transition-transform ${isChatOpen ? 'rotate-180' : ''}`}>▼</div>
                </button>
                {isChatOpen && (
                  <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                    {(sortedByName.length === 0) ? (
                      <li className="px-4 py-3 text-sm text-gray-400">暂无模型，请先添加</li>
                    ) : (
                      sortedByName.map(opt => (
                        <li key={opt.id} onClick={() => { setSelectedChatModel(opt.model_id); setIsChatOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedChatModel === opt.model_id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{opt.model_name || opt.model_id}</li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <TemperatureInput value={chatTemperature} onChange={setChatTemperature} />
              <button onClick={handleConfirmChat} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2">
                <Save size={16} /> 确认
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-purple-800 mb-2">故事生成AI模型</label>
            <div className="flex items-center gap-4">
              <div className="relative w-full max-w-md" ref={storyRef}>
                <button onClick={() => setIsStoryOpen(!isStoryOpen)} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isStoryOpen ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                  <span className={`${selectedStoryModel ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{storyLabelText}</span>
                  <div className={`text-purple-400 transition-transform ${isStoryOpen ? 'rotate-180' : ''}`}>▼</div>
                </button>
                {isStoryOpen && (
                  <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                    {(sortedByName.length === 0) ? (
                      <li className="px-4 py-3 text-sm text-gray-400">暂无模型，请先添加</li>
                    ) : (
                      sortedByName.map(opt => (
                        <li key={opt.id} onClick={() => { setSelectedStoryModel(opt.model_id); setIsStoryOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedStoryModel === opt.model_id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{opt.model_name || opt.model_id}</li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <TemperatureInput value={storyTemperature} onChange={setStoryTemperature} />
              <button onClick={handleConfirmStory} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2">
                <Save size={16} /> 确认
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="solid-card p-8 rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span>
            模型管理
          </h3>
          <button onClick={() => setIsModelModalOpen(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-600 transition-colors flex items-center gap-2 text-xs">
            <Plus size={14} /> 添加模型
          </button>
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
                    <button onClick={() => setDeleteTarget(model)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16} />
                    </button>
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
                <button onClick={() => setIsModelModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1.5">模型ID <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newModel.model_id}
                    onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })}
                    placeholder="例如: gpt-4-turbo"
                    className="dream-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1.5">模型名称 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newModel.model_name}
                    onChange={(e) => setNewModel({ ...newModel, model_name: e.target.value })}
                    placeholder="例如: GPT-4 Turbo"
                    className="dream-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1.5">盲测模型昵称</label>
                  <input
                    type="text"
                    value={newModel.model_nickname}
                    onChange={(e) => setNewModel({ ...newModel, model_nickname: e.target.value })}
                    placeholder="例如: 智慧之星"
                    className="dream-input w-full px-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setIsModelModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors">
                  取消
                </button>
                <button onClick={handleSaveModel} className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-600 transition-all">
                  保存模型
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

const SettingsView = () => (
  <ToastProvider>
    <SettingsContent />
  </ToastProvider>
);

export default SettingsView;
