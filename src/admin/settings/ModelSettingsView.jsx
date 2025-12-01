import React, { useState, useRef, useEffect } from 'react';
import { Save, HelpCircle } from 'lucide-react';
import { ToastProvider, useToast } from '../Toast.jsx';
import { modelsAPI, settingsAPI } from '../api.js';

const TemperatureInput = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input type="number" min="0" max="2" step="0.05" value={value} onChange={(e) => onChange(e.target.value)} className="dream-input w-24 px-2 py-3 rounded-xl text-sm font-bold text-center" />
    <div className="relative group">
      <HelpCircle size={18} className="text-purple-400 cursor-help" />
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-white/90 backdrop-blur-sm border border-purple-100 text-purple-900 text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">温度：高数值输出随机，低数值输出集中。</div>
    </div>
  </div>
);

const Content = () => {
  const [modelList, setModelList] = useState([]);
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
  const { showToast } = useToast();

  const getModelLabel = (id) => {
    const m = modelList.find((x) => x.model_id === id);
    return m ? (m.model_name || m.model_id) : '-- 请选择 --';
  };

  const fetchModels = async () => {
    try { const data = await modelsAPI.list(); setModelList(data.items || []); }
    catch { showToast('模型列表加载失败', 'error'); }
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
      } catch { showToast('加载设置失败', 'error'); }
    })();
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (isDropdownOpen && ddRef.current && !ddRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (isChatOpen && chatRef.current && !chatRef.current.contains(e.target)) setIsChatOpen(false);
      if (isStoryOpen && storyRef.current && !storyRef.current.contains(e.target)) setIsStoryOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isDropdownOpen, isChatOpen, isStoryOpen]);

  const sortedByName = [...modelList].sort((a,b) => (a.model_name || a.model_id).localeCompare(b.model_name || b.model_id));
  const labelText = getModelLabel(selectedModel);
  const chatLabelText = getModelLabel(selectedChatModel);
  const storyLabelText = getModelLabel(selectedStoryModel);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>模型设置</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">配置全局模型与温度参数</p>
        </div>
      </div>

      <div className="solid-card p-8 rounded-3xl">
        <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-4"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span>模型配置</h3>
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
              <button onClick={saveAll} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2"><Save size={16} /> 确认</button>
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
              <button onClick={saveAll} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2"><Save size={16} /> 确认</button>
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
              <button onClick={saveAll} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2"><Save size={16} /> 确认</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModelSettingsView = () => (
  <ToastProvider>
    <Content />
  </ToastProvider>
);

export default ModelSettingsView;
