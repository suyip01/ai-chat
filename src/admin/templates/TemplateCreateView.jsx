import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, X, Sparkles } from 'lucide-react';

const TemplateCreateView = ({ onCancel, initialData, onSave, notify }) => {
  const [formData, setFormData] = useState({ name: '', type: '恋爱', customType: '', tags: [], content: '' });
  const [tagInput, setTagInput] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const PRESET_TYPES = ['恋爱', '玄幻', '悬疑', '职场', '科幻', '同人'];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || '恋爱',
        customType: '',
        tags: initialData.tags || [],
        content: initialData.content || '',
      });
      setIsCustomType(false);
    }
  }, [initialData]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (index) => {
    const newTags = [...formData.tags];
    newTags.splice(index, 1);
    setFormData((prev) => ({ ...prev, tags: newTags }));
  };

  const handleTypeSelect = (type) => {
    setIsCustomType(false);
    setFormData((prev) => ({ ...prev, type }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      if (typeof notify === 'function') notify('保存失败：请输入模版名称', 'error');
      return;
    }
    const payload = {
      id: initialData?.id,
      name: formData.name.trim(),
      type: isCustomType ? (formData.customType.trim() || formData.type) : formData.type,
      tags: formData.tags,
      content: formData.content,
      refCount: initialData?.refCount ?? 0,
      creator: initialData?.creator ?? 'Admin',
    };
    try {
      onSave && onSave(payload);
    } catch (e) {
      if (typeof notify === 'function') notify('保存失败：请稍后重试', 'error');
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-purple-600 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-cute text-purple-900">{initialData ? '编辑提示词模版' : '新建提示词模版'}</h2>
          <p className="text-gray-400 text-xs">定义基础 Prompt 框架</p>
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-white text-gray-500 font-bold text-sm shadow-sm hover:bg-gray-50">取消</button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center gap-2">
            <Save size={16} /> 保存模版
          </button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="solid-card p-8 rounded-3xl space-y-6">
            <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 模版基础信息
            </h3>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">模版名称</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="dream-input w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-700 bg-gray-50/50 focus:bg-white" placeholder="例如：病娇反派通用模版" />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">模版类型</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_TYPES.map((type) => (
                  <button key={type} onClick={() => handleTypeSelect(type)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cute-font tracking-wide border ${!isCustomType && formData.type === type ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-200' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}>{type}</button>
                ))}
                <button onClick={() => setIsCustomType(true)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cute-font tracking-wide border ${isCustomType ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-200' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}>自定义...</button>
              </div>
              {isCustomType && (
                <div className="animate-fade-in mt-2">
                  <input type="text" value={formData.customType} onChange={(e) => setFormData({ ...formData, customType: e.target.value })} placeholder="请输入自定义类型名称" className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">模版标签 (回车生成)</label>
              <div className="dream-input w-full px-4 py-3 rounded-xl min-h-[50px] flex flex-wrap gap-2 items-center bg-gray-50/50 focus-within:bg-white">
                {formData.tags.map((tag, i) => (
                  <span key={i} className="tag-pill px-3 py-1 flex items-center shadow-sm gap-1">
                    #{tag} <button onClick={() => handleRemoveTag(i)} className="hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity"><X size={12} /></button>
                  </span>
                ))}
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} type="text" className="bg-transparent outline-none text-sm w-40 placeholder-gray-400 h-8" placeholder="输入标签按回车..." />
              </div>
            </div>
          </div>
          <div className="solid-card p-8 rounded-3xl space-y-4">
            <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> Prompt 内容配置
            </h3>
            <div className="relative">
              <textarea rows="15" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="dream-input w-full px-5 py-4 rounded-xl text-sm leading-relaxed font-mono text-gray-600 bg-gray-50/50 focus:bg-white resize-y" placeholder="在此输入系统提示词框架（System Instruction）...&#10;可以使用 {'{{user}}'} 和 {'{{name}}'} 作为占位符。" />
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="solid-card p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-200/50">
            <h4 className="font-bold mb-3 flex items-center gap-2 text-lg font-cute"><Sparkles size={18} className="text-yellow-300" /> 编写指南</h4>
            <ul className="space-y-3 text-sm opacity-90 leading-relaxed list-disc list-inside">
              <li>使用 <b>{'{{name}}'}</b> 代表角色姓名。</li>
              <li>使用 <b>{'{{user}}'}</b> 代表用户昵称。</li>
              <li>建议明确规定角色的<b>说话风格</b>、<b>禁忌事项</b>以及<b>背景设定</b>。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateCreateView;
