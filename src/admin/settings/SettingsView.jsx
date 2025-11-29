import React, { useState, useRef, useEffect } from 'react';
import { Save } from 'lucide-react';
import { ToastProvider, useToast } from '../Toast.jsx';

const SettingsContent = () => {
  const MODEL_OPTIONS = [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'claude-3-5', label: 'Claude 3.5' },
    { id: 'qwen-turbo', label: 'Qwen Turbo' },
    { id: 'llama-3-70b', label: 'Llama 3 70B' },
  ];

  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const ddRef = useRef(null);
  const [selectedChatModel, setSelectedChatModel] = useState(MODEL_OPTIONS[0].id);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatRef = useRef(null);
  const [selectedStoryModel, setSelectedStoryModel] = useState(MODEL_OPTIONS[0].id);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const storyRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (isDropdownOpen && ddRef.current && !ddRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (isChatOpen && chatRef.current && !chatRef.current.contains(e.target)) setIsChatOpen(false);
      if (isStoryOpen && storyRef.current && !storyRef.current.contains(e.target)) setIsStoryOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isDropdownOpen, isChatOpen, isStoryOpen]);

  const labelText = MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || '-- 请选择 --';
  const chatLabelText = MODEL_OPTIONS.find(m => m.id === selectedChatModel)?.label || '-- 请选择 --';
  const storyLabelText = MODEL_OPTIONS.find(m => m.id === selectedStoryModel)?.label || '-- 请选择 --';

  const { showToast } = useToast();
  const handleConfirm = () => { showToast(`角色提示词模型已保存：${labelText}`); };
  const handleConfirmChat = () => { showToast(`角色聊天模型已保存：${chatLabelText}`); };
  const handleConfirmStory = () => { showToast(`故事生成模型已保存：${storyLabelText}`); };

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
                    {MODEL_OPTIONS.map(opt => (
                      <li key={opt.id} onClick={() => { setSelectedModel(opt.id); setIsDropdownOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedModel === opt.id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{opt.label}</li>
                    ))}
                  </ul>
                )}
              </div>
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
                    {MODEL_OPTIONS.map(opt => (
                      <li key={opt.id} onClick={() => { setSelectedChatModel(opt.id); setIsChatOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedChatModel === opt.id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{opt.label}</li>
                    ))}
                  </ul>
                )}
              </div>
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
                    {MODEL_OPTIONS.map(opt => (
                      <li key={opt.id} onClick={() => { setSelectedStoryModel(opt.id); setIsStoryOpen(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedStoryModel === opt.id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{opt.label}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={handleConfirmStory} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2">
                <Save size={16} /> 确认
              </button>
              </div>
            </div>
        </div>
      </div>
      
    </div>
  );
};

const SettingsView = () => (
  <ToastProvider>
    <SettingsContent />
  </ToastProvider>
);

export default SettingsView;
