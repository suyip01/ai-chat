import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Save, Info, X, ChevronDown, RefreshCw, Wand2, FileText, HelpCircle } from 'lucide-react';
import { MOCK_TEMPLATES } from '../data/mock.js';
import { charactersAPI, templatesAPI, modelsAPI, syspromptAPI, uploadAPI } from '../api.js';
import AvatarEditor from '../components/AvatarEditor.jsx';

const CharacterCreateView = ({ initialData, onCancel, mode = 'new', notify }) => {
  const [formData, setFormData] = useState({
    name: '', gender: '男', identity: '', tagline: '', tags: [], templateId: '',
    plotTheme: '', plotSummary: '', openingLine: '', styleExamples: ['', '', ''],
    hobbies: '', experiences: '', published: false, generatedPrompt: '', personality: '',
    relationship: '陌生人', customRelationship: '', intro: '', sceneDescription: '',
    sceneGeneratedPrompt: '', avatar: '',
  });
  const RELATIONSHIP_PRESETS = ['陌生人', '暧昧', '恋爱中', '冷战', '分手'];
  const [isCustomRel, setIsCustomRel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  useEffect(() => {
    if (initialData) {
      const isPresetRel = RELATIONSHIP_PRESETS.includes(initialData.relationship);
      setFormData({
        name: initialData.name || '', gender: initialData.gender || '男', identity: initialData.identity || '',
        tagline: initialData.tagline || '', tags: initialData.tags || [], templateId: initialData.templateId ? String(initialData.templateId) : '',
        plotTheme: initialData.plotTheme || '', plotSummary: initialData.plotSummary || '',
        openingLine: initialData.openingLine || initialData.opening || '',
        styleExamples: initialData.styleExamples || ['', '', ''], hobbies: initialData.hobbies || '',
        experiences: initialData.experiences || '', published: initialData.status === 'published',
        generatedPrompt: initialData.systemPrompt || '', personality: initialData.personality || '',
        relationship: isPresetRel ? (initialData.relationship || '陌生人') : '',
        customRelationship: !isPresetRel ? (initialData.relationship || '') : '',
        intro: initialData.intro || '',
        avatar: initialData.avatar || '',
        sceneDescription: initialData.sceneDescription || '',
        sceneGeneratedPrompt: initialData.systemPromptScene || '',
        templateIdScene: initialData.sceneTemplateId ? String(initialData.sceneTemplateId) : '',
      });
      setIsCustomRel(!isPresetRel && !!initialData.relationship);
      setSelectedPromptModel(initialData.promptModelId || '');
      setPromptTemperature(typeof initialData.promptTemperature === 'number' ? initialData.promptTemperature : (initialData.promptTemperature || 0.1));
      setSelectedSceneModel(initialData.sceneModelId || '');
      setSceneTemperature(typeof initialData.sceneTemperature === 'number' ? initialData.sceneTemperature : (initialData.sceneTemperature || 0.1));
    }
  }, [initialData]);
  const [isGeneratingMain, setIsGeneratingMain] = useState(false);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isDropdownOpenMain, setIsDropdownOpenMain] = useState(false);
  const [isDropdownOpenScene, setIsDropdownOpenScene] = useState(false);
  const dropdownRefMain = useRef(null);
  const dropdownRefScene = useRef(null);
  const [isModelOpenMain, setIsModelOpenMain] = useState(false);
  const [isModelOpenScene, setIsModelOpenScene] = useState(false);
  const modelRefMain = useRef(null);
  const modelRefScene = useRef(null);
  const [selectedPromptModel, setSelectedPromptModel] = useState('');
  const [selectedSceneModel, setSelectedSceneModel] = useState('');
  const [promptTemperature, setPromptTemperature] = useState(0.1);
  const [sceneTemperature, setSceneTemperature] = useState(0.1);
  const [modelList, setModelList] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [tplList, setTplList] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);

  const availableTags = [
    'M/M', 'M/F', 'BL', 'BG', '耽美', '百合', '责任感', '偶像', '占有欲', '霸道', '调戏', '腹黑', '温柔', '年下', '年上', '感性', '体贴', '理性', '反差', '激情', '校园', '贴心', '偏执', '疯批', '傲娇', '职场', '冷漠', '忧郁', '人夫', '养胃', '控制欲', '黏人', '可爱', '成熟', '性感'
  ];
  useEffect(() => {
    const onDocClick = (e) => {
      if (isDropdownOpenMain && dropdownRefMain.current && !dropdownRefMain.current.contains(e.target)) setIsDropdownOpenMain(false);
      if (isDropdownOpenScene && dropdownRefScene.current && !dropdownRefScene.current.contains(e.target)) setIsDropdownOpenScene(false);
      if (isModelOpenMain && modelRefMain.current && !modelRefMain.current.contains(e.target)) setIsModelOpenMain(false);
      if (isModelOpenScene && modelRefScene.current && !modelRefScene.current.contains(e.target)) setIsModelOpenScene(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setIsDropdownOpenMain(false); setIsDropdownOpenScene(false); setIsModelOpenMain(false); setIsModelOpenScene(false); }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isDropdownOpenMain, isDropdownOpenScene, isModelOpenMain, isModelOpenScene]);

  useEffect(() => {
    (async () => {
      try {
        const data = await modelsAPI.list();
        const sortKey = (m) => {
          const nick = m.model_nickname || '';
          const mt = nick.match(/^模型-([A-Z])$/i);
          if (mt) return mt[1].toUpperCase();
          return m.model_name || m.model_id || '';
        };
        setModelList((data.items || []).sort((a, b) => sortKey(a).localeCompare(sortKey(b))));
      } catch { }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setTplLoading(true);
        const data = await templatesAPI.list();
        setTplList(data.items || []);
      } catch { }
      finally { setTplLoading(false); }
    })();
  }, []);

  const getModelDisplay = (id) => {
    const m = modelList.find(x => x.model_id === id);
    return m ? (m.model_nickname || m.model_name || m.model_id) : '-- 请选择 --';
  };
  const selectedTemplateNameMain = formData.templateId ? tplList.find((t) => t.id === parseInt(formData.templateId))?.name : '-- 请选择 --';
  const selectedTemplateNameScene = formData.templateIdScene ? tplList.find((t) => t.id === parseInt(formData.templateIdScene))?.name : '-- 请选择 --';
  const openTplDropdownMain = async () => {
    const open = !isDropdownOpenMain;
    setIsDropdownOpenMain(open);
  };
  const openTplDropdownScene = async () => {
    const open = !isDropdownOpenScene;
    setIsDropdownOpenScene(open);
  };
  const handleGeneratePrompt = async () => {
    if (!formData.templateId) return alert('请先选择一个提示词模版');
    setIsGeneratingMain(true);
    setFormData((prev) => ({ ...prev, generatedPrompt: '' }));
    try {
      const selectedTemplate = tplList.find((t) => t.id === parseInt(formData.templateId));
      const payload = {
        templateContent: selectedTemplate?.content || '',
        model: selectedPromptModel || undefined,
        temperature: promptTemperature === '' ? undefined : parseFloat(promptTemperature),
        name: formData.name,
        gender: formData.gender,
        identity: formData.identity,
        tagline: formData.tagline,
        tags: formData.tags,
        intro: formData.intro,
        personality: formData.personality,
        relationship: isCustomRel ? formData.customRelationship : formData.relationship,
        styleExamples: formData.styleExamples,
        hobbies: formData.hobbies,
        experiences: formData.experiences,
      };
      const resp = await syspromptAPI.generate(payload);
      setFormData((prev) => ({ ...prev, generatedPrompt: resp.prompt || '' }));
    } catch {
    } finally {
      setIsGeneratingMain(false);
    }
  };
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData((p) => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };
  const handleTemplateSelectMain = (id) => { setFormData((prev) => ({ ...prev, templateId: id })); setIsDropdownOpenMain(false); };
  const handleTemplateSelectScene = (id) => { setFormData((prev) => ({ ...prev, templateIdScene: id })); setIsDropdownOpenScene(false); };
  const handleRelSelect = (rel) => { setIsCustomRel(false); setFormData((prev) => ({ ...prev, relationship: rel, customRelationship: '' })); };
  const handleCustomRelSelect = () => { setIsCustomRel(true); setFormData((prev) => ({ ...prev, relationship: '' })); };
  const handleStyleExampleChange = (index, value) => { const newExamples = [...formData.styleExamples]; newExamples[index] = value; setFormData((prev) => ({ ...prev, styleExamples: newExamples })); };
  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-purple-600 transition-colors"><ChevronLeft size={20} /></button>
        <div>
          <h2 className="text-2xl font-cute text-purple-900">{initialData ? '编辑角色' : '创建新角色'}</h2>
          <p className="text-gray-400 text-xs">{initialData ? '修改角色设定与提示词' : '填写设定并生成专属提示词'}</p>
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-white text-gray-500 font-bold text-sm shadow-sm hover:bg-gray-50">取消</button>
          <button
            onClick={async () => {
              if (!formData.name || !formData.name.trim()) {
                notify && notify('保存失败：请输入角色名称', 'error');
                return;
              }
              const payload = {
                name: formData.name.trim(),
                gender: formData.gender,
                templateId: formData.templateId ? parseInt(formData.templateId) : (initialData?.templateId ?? null),
                sceneTemplateId: formData.templateIdScene ? parseInt(formData.templateIdScene) : (initialData?.sceneTemplateId ?? null),
                identity: formData.identity || null,
                tagline: formData.tagline || null,
                personality: formData.personality || null,
                relationship: isCustomRel ? (formData.customRelationship || null) : (formData.relationship || null),
                plotTheme: formData.plotTheme || null,
                plotSummary: formData.plotSummary || null,
                openingLine: formData.openingLine || null,
                systemPrompt: formData.generatedPrompt || null,
                systemPromptScene: formData.sceneGeneratedPrompt || null,
                promptModelId: selectedPromptModel || null,
                promptTemperature: promptTemperature === '' ? null : parseFloat(promptTemperature),
                sceneModelId: selectedSceneModel || null,
                sceneTemperature: sceneTemperature === '' ? null : parseFloat(sceneTemperature),
                hobbies: formData.hobbies || null,
                experiences: formData.experiences || null,
                status: formData.published ? 'published' : 'draft',
                tags: formData.tags || [],
                styleExamples: formData.styleExamples || [],
                intro: formData.intro || null,
                avatar: formData.avatar || null,
              };
              try {
                if (mode === 'edit' && initialData?.id) {
                  await charactersAPI.update(initialData.id, payload);
                  notify && notify('保存成功：角色已更新');
                } else {
                  await charactersAPI.create(payload);
                  notify && notify('保存成功：角色已保存');
                }
                onCancel();
              } catch (e) {
                console.error('[characters.save] failed', { mode, payload, error: e });
                notify && notify('保存失败：请稍后重试', 'error');
              }
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center gap-2"
          >
            <Save size={16} /> 保存角色
          </button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="solid-card p-8 rounded-3xl space-y-4">
            <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 角色封面简介</h3>
            <textarea rows="2" value={formData.intro} onChange={(e) => setFormData({ ...formData, intro: e.target.value })} className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none" placeholder="简要描述角色，用于封面展示"></textarea>
          </div>
          <div className="solid-card p-8 rounded-3xl space-y-6">
            <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 基础设定</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-purple-800 mb-2">角色名称</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} type="text" className="dream-input w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-700" placeholder="角色姓名" />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-800 mb-2">性别</label>
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                  {['男', '女', '其他'].map((g) => (
                    <button key={g} onClick={() => setFormData({ ...formData, gender: g })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.gender === g ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:text-purple-500'}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">身份背景 (Identity)</label>
              <textarea value={formData.identity} onChange={(e) => setFormData({ ...formData, identity: e.target.value })} rows="3" className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none" placeholder="角色的年龄、职业、过往经历..."></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">一句话人设 (Tagline)</label>
              <input value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} className="dream-input w-full px-4 py-3 rounded-xl text-sm" placeholder="例如：表面温柔克己实则腹黑" />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">性格 (Personality)</label>
              <textarea value={formData.personality} onChange={(e) => setFormData({ ...formData, personality: e.target.value })} rows="2" className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none" placeholder="例：占有欲强，容易吃醋..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">角色标签</label>
              <div onClick={() => setShowTagModal(true)} className="dream-input w-full px-3 py-2 min-h-[46px] flex flex-wrap gap-2 items-center bg-white/60 cursor-pointer hover:bg-white transition rounded-2xl border border-purple-100">
                {formData.tags.length === 0 && (
                  <span className="text-xs text-[#B3A4C8] ml-1">点击添加标签 (#傲娇 #高冷...)</span>
                )}
                {formData.tags.map((tag) => (
                  <span key={tag} className="tag-pill px-2 py-1 flex items-center shadow-sm">
                    #{tag}
                    <button onClick={(e) => { e.stopPropagation(); setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) })); }} className="ml-1 opacity-60 hover:opacity-100">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <span className="ml-auto text-purple-300 text-xs">›</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">当下的关系</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={handleCustomRelSelect} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isCustomRel ? 'bg-purple-500 text-white shadow-md border-purple-500' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>自定义</button>
                {RELATIONSHIP_PRESETS.map((rel) => (
                  <button key={rel} onClick={() => handleRelSelect(rel)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${!isCustomRel && formData.relationship === rel ? 'bg-purple-500 text-white shadow-md border-purple-500' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>{rel}</button>
                ))}
              </div>
              {isCustomRel && (
                <div className="animate-fade-in mt-2">
                  <input type="text" value={formData.customRelationship} onChange={(e) => setFormData({ ...formData, customRelationship: e.target.value })} className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" placeholder="请输入自定义关系" />
                </div>
              )}
            </div>
          </div>
          <div className="solid-card p-8 rounded-3xl space-y-6">
            <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 第一情节</h3>
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex gap-3 text-purple-700 text-sm leading-relaxed">
              <Info size={18} className="flex-shrink-0 mt-0.5 text-purple-500" />
              <div>第一情节的内容将被应用于和角色的第一次聊天。此外，设定第一情节并选择公开角色后，情节内容将显示在角色资料页上。</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">主题</label>
              <input value={formData.plotTheme} onChange={(e) => setFormData({ ...formData, plotTheme: e.target.value })} className="dream-input w-full px-4 py-3 rounded-xl text-sm" placeholder="例：当温柔人夫终于爆发腹黑属性" />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">情节梗概</label>
              <textarea value={formData.plotSummary} onChange={(e) => setFormData({ ...formData, plotSummary: e.target.value })} rows="4" className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none" placeholder="例：在一起这么久了，他还是一如既往的温柔体贴，从来不干涉你的个人生活。今天晚上你去酒吧玩，故意装作喝醉和他打电话，却在他应了一声后开始软声叫着别人的名字......" />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-2">开场白</label>
              <input value={formData.openingLine} onChange={(e) => setFormData({ ...formData, openingLine: e.target.value })} className="dream-input w-full px-4 py-3 rounded-xl text-sm" placeholder="例：“出来，我在酒吧门口”" />
            </div>
          </div>
          <div className="solid-card rounded-3xl overflow-hidden">
            <div className="p-8 pb-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setShowAdvanced(!showAdvanced)}>
              <div className="flex items-center gap-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span><h3 className="font-cute text-lg text-purple-900">进阶设定</h3><span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-600 rounded">可选</span></div>
              <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
            </div>
            {showAdvanced && (
              <div className="p-8 pt-0 space-y-6 animate-in slide-in-from-top-4 fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-3">说话风格示例</label>
                  <div className="space-y-3">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="relative flex items-center gap-3">
                        <span className="text-xs font-bold text-purple-300 font-mono">0{idx + 1}</span>
                        <input type="text" value={formData.styleExamples[idx] || ''} onChange={(e) => handleStyleExampleChange(idx, e.target.value)} className="dream-input flex-1 px-4 py-3 rounded-xl text-sm" placeholder={idx === 0 ? '例：哼，别以为我会感谢你。' : idx === 1 ? '例：今晚月色真美，不一起走走吗？' : '例：再靠近一步，我就不客气了。'} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-2">爱好</label>
                  <textarea value={formData.hobbies} onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })} rows="3" className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none" placeholder="例：喜欢看书、收集古董怀表..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-2">经历</label>
                  <textarea value={formData.experiences} onChange={(e) => setFormData({ ...formData, experiences: e.target.value })} rows="4" className="dream-input w-full px-4 py-3 rounded-xl text-sm resize-none" placeholder="请填写角色个人经历或你们的共同经历" />
                </div>
              </div>
            )}
          </div>
          <div className="solid-card p-8 rounded-3xl relative overflow-visible bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100">
            <h3 className="font-cute text-lg text-purple-900 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 角色提示词配置</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-purple-800 mb-2">角色提示词AI模型</label>
              <div className="flex items-center gap-4">
                <div className="relative z-50 flex-1" ref={modelRefMain}>
                  <button onClick={() => setIsModelOpenMain(!isModelOpenMain)} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isModelOpenMain ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                    <span className={`${selectedPromptModel ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{getModelDisplay(selectedPromptModel)}</span>
                    <div className={`text-purple-400 transition-transform ${isModelOpenMain ? 'rotate-180' : ''}`}>▼</div>
                  </button>
                  {isModelOpenMain && (
                    <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                      {modelList.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-400">暂无模型</li>
                      ) : (
                        modelList.map(m => (
                          <li key={m.id} onClick={() => { setSelectedPromptModel(m.model_id); setIsModelOpenMain(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedPromptModel === m.model_id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{m.model_nickname || m.model_name || m.model_id}</li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                  <input type="number" min="0" max="2" step="0.05" value={promptTemperature} onChange={(e) => setPromptTemperature(e.target.value)} className="dream-input w-24 px-2 py-3 rounded-xl text-sm font-bold text-center" />
                  <div className="relative group">
                    <HelpCircle size={18} className="text-purple-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-white/90 backdrop-blur-sm border border-purple-100 text-purple-900 text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
                      温度：高数值输出随机，低数值输出集中。
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-purple-800 mb-2">选择基础模版</label>
                <div className="relative z-20 flex-1" ref={dropdownRefMain}>
                  <button onClick={openTplDropdownMain} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isDropdownOpenMain ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                    <span className={`${formData.templateId ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{selectedTemplateNameMain}</span>
                    <div className={`text-purple-400 transition-transform ${isDropdownOpenMain ? 'rotate-180' : ''}`}>▼</div>
                  </button>
                  {isDropdownOpenMain && (
                    <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                      <li onClick={() => handleTemplateSelectMain('')} className="px-4 py-3 text-sm text-gray-400 hover:bg-purple-50 cursor-pointer border-b border-purple-50">-- 请选择 --</li>
                      {tplLoading ? (
                        <li className="px-4 py-3 text-sm text-gray-400">加载中...</li>
                      ) : (
                        tplList.map((tpl) => (
                          <li key={tpl.id} onClick={() => handleTemplateSelectMain(tpl.id.toString())} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${formData.templateId == tpl.id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{tpl.name} ({tpl.type})</li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <button onClick={handleGeneratePrompt} disabled={isGeneratingMain} className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center z-0">
                {isGeneratingMain ? <span className="animate-spin"><RefreshCw size={16} /></span> : <Wand2 size={16} className="text-yellow-300" />}
                {isGeneratingMain ? '生成中...' : '生成提示词'}
              </button>
            </div>
            <p className="text-xs text-purple-400 mt-2 ml-1">* 将根据上方填写的设定，自动填充到模版占位符中</p>
            <div className="mt-4 relative">
              <textarea rows="12" value={formData.generatedPrompt} onChange={(e) => setFormData({ ...formData, generatedPrompt: e.target.value })} className="dream-input w-full px-5 py-4 rounded-xl text-sm leading-relaxed font-mono text-gray-700 bg-white focus:bg-white resize-y shadow-inner" placeholder="点击上方“生成提示词”按钮，或在此直接编写 Prompt..."></textarea>
              {!formData.generatedPrompt && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <div className="text-center"><FileText size={48} className="mx-auto mb-2 text-purple-300" /><p className="text-sm font-bold text-purple-400">等待生成...</p></div>
                </div>
              )}
            </div>
          </div>
          <div className="solid-card p-8 rounded-3xl relative overflow-visible bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100">
            <h3 className="font-cute text-lg text-purple-900 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 角色提示词配置（带场景描述）</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-purple-800 mb-2">角色提示词AI模型（场景）</label>
              <div className="flex items-center gap-4">
                <div className="relative z-50 flex-1" ref={modelRefScene}>
                  <button onClick={() => setIsModelOpenScene(!isModelOpenScene)} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isModelOpenScene ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                    <span className={`${selectedSceneModel ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{getModelDisplay(selectedSceneModel)}</span>
                    <div className={`text-purple-400 transition-transform ${isModelOpenScene ? 'rotate-180' : ''}`}>▼</div>
                  </button>
                  {isModelOpenScene && (
                    <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                      {modelList.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-400">暂无模型</li>
                      ) : (
                        modelList.map(m => (
                          <li key={m.id} onClick={() => { setSelectedSceneModel(m.model_id); setIsModelOpenScene(false); }} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${selectedSceneModel === m.model_id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{m.model_nickname || m.model_name || m.model_id}</li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                  <input type="number" min="0" max="2" step="0.05" value={sceneTemperature} onChange={(e) => setSceneTemperature(e.target.value)} className="dream-input w-24 px-2 py-3 rounded-xl text-sm font-bold text-center" />
                  <div className="relative group">
                    <HelpCircle size={18} className="text-purple-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-white/90 backdrop-blur-sm border border-purple-100 text-purple-900 text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
                      温度：高数值输出随机，低数值输出集中。
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 items-end mt-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-purple-800 mb-2">选择基础模版</label>
                <div className="relative z-20 flex-1" ref={dropdownRefScene}>
                  <button onClick={openTplDropdownScene} className={`dream-input w-full px-4 py-3 rounded-xl text-sm text-left font-bold transition-all bg-white flex justify-between items-center ${isDropdownOpenScene ? 'border-purple-500 ring-4 ring-purple-100/50' : ''}`}>
                    <span className={`${formData.templateIdScene ? 'text-gray-700' : 'text-gray-400 font-normal'}`}>{selectedTemplateNameScene}</span>
                    <div className={`text-purple-400 transition-transform ${isDropdownOpenScene ? 'rotate-180' : ''}`}>▼</div>
                  </button>
                  {isDropdownOpenScene && (
                    <ul className="absolute top-full mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                      <li onClick={() => handleTemplateSelectScene('')} className="px-4 py-3 text-sm text-gray-400 hover:bg-purple-50 cursor-pointer border-b border-purple-50">-- 请选择 --</li>
                      {tplLoading ? (
                        <li className="px-4 py-3 text-sm text-gray-400">加载中...</li>
                      ) : (
                        tplList.map((tpl) => (
                          <li key={tpl.id} onClick={() => handleTemplateSelectScene(tpl.id.toString())} className={`px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer transition-colors ${formData.templateIdScene == tpl.id ? 'bg-purple-100 font-bold text-purple-700' : ''}`}>{tpl.name} ({tpl.type})</li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <button onClick={async () => {
                if (!formData.templateIdScene) return alert('请先选择一个提示词模版');
                setIsGeneratingScene(true);
                setFormData((prev) => ({ ...prev, sceneGeneratedPrompt: '' }));
                try {
                  const selectedTemplate = tplList.find((t) => t.id === parseInt(formData.templateIdScene));
                  const payload = {
                    templateContent: selectedTemplate?.content || '',
                    model: selectedSceneModel || undefined,
                    temperature: sceneTemperature === '' ? undefined : parseFloat(sceneTemperature),
                    name: formData.name,
                    gender: formData.gender,
                    identity: formData.identity,
                    tagline: formData.tagline,
                    tags: formData.tags,
                    intro: formData.intro,
                    personality: formData.personality,
                    relationship: isCustomRel ? formData.customRelationship : formData.relationship,
                    styleExamples: formData.styleExamples,
                    hobbies: formData.hobbies,
                    experiences: formData.experiences,
                  };
                  const resp = await syspromptAPI.generate(payload);
                  setFormData((prev) => ({ ...prev, sceneGeneratedPrompt: resp.prompt || '' }));
                } catch {
                } finally {
                  setIsGeneratingScene(false);
                }
              }} disabled={isGeneratingScene} className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center z-0">
                {isGeneratingScene ? <span className="animate-spin"><RefreshCw size={16} /></span> : <Wand2 size={16} className="text-yellow-300" />}
                {isGeneratingScene ? '生成中...' : '生成提示词'}
              </button>
            </div>
            <p className="text-xs text-purple-400 mt-2 ml-1">* 将根据上方填写的设定，自动填充到模版占位符中</p>
            <div className="mt-4 relative">
              <textarea rows="12" value={formData.sceneGeneratedPrompt} onChange={(e) => setFormData({ ...formData, sceneGeneratedPrompt: e.target.value })} className="dream-input w-full px-5 py-4 rounded-xl text-sm leading-relaxed font-mono text-gray-700 bg-white focus:bg-white resize-y shadow-inner" placeholder="点击上方“生成提示词”按钮，或在此直接编写 Prompt..."></textarea>
              {!formData.sceneGeneratedPrompt && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <div className="text-center"><FileText size={48} className="mx-auto mb-2 text-purple-300" /><p className="text-sm font-bold text-purple-400">等待生成...</p></div>
                </div>
              )}
            </div>
          </div>

        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-3xl flex flex-col items-center text-center">
            <h3 className="font-cute text-purple-900 mb-4 w-full text-left border-b border-purple-100 pb-2">头像预览</h3>
            <div onClick={() => setShowAvatarEditor(true)} className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center mb-4 relative group cursor-pointer overflow-hidden">
              {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <div className="text-4xl text-gray-300 font-bold">{formData.name ? formData.name[0] : '?'}</div>}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">更换头像</div>
            </div>
            <div className="w-full">
              <label className="flex items-center justify-between p-4 bg-white/50 rounded-xl cursor-pointer hover:bg-white transition-colors border border-purple-50">
                <span className="text-sm font-bold text-gray-700">发布到广场</span>
                <div onClick={() => setFormData({ ...formData, published: !formData.published })} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${formData.published ? 'bg-purple-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${formData.published ? 'translate-x-6' : ''}`}></div>
                </div>
              </label>
              <p className="text-xs text-left text-gray-400 mt-2 px-1">开启后，该角色将出现在公共广场，所有用户可见。</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white"><h4 className="font-bold mb-2 flex items-center gap-2"><span className="inline-block"><Wand2 size={16} className="text-yellow-300" /></span> 提示</h4><p className="text-xs opacity-90 leading-relaxed">好的 Prompt 决定了角色的灵魂。建议生成后仔细检查，补充更多细节。</p></div>
        </div>
      </div>
      {showTagModal && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-64 bg-black/30 z-50" onClick={() => setShowTagModal(false)}></div>
          <div className="fixed top-0 right-0 bottom-0 left-64 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-purple-50">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowTagModal(false)} className="w-8 h-8 rounded-full bg-purple-50 text-purple-800 flex items-center justify-center">‹</button>
                <h3 className="text-lg font-bold font-cute text-purple-900">添加 #标签</h3>
                <button onClick={() => setShowTagModal(false)} className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">完成</button>
              </div>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-2 ml-1">选定的标签</div>
                  <div className="flex flex-wrap gap-2 min-h-[46px] bg-purple-50/50 p-3 rounded-xl border border-purple-100 border-dashed">
                    {formData.tags.length === 0 ? (
                      <span className="text-xs text-gray-400">暂无标签</span>
                    ) : (
                      formData.tags.map((tag) => (
                        <button key={tag} onClick={() => setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))} className="bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1">
                          #{tag} <span className="text-[10px] ml-1 opacity-80">×</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-2 ml-1">直接添加 (自定义)</div>
                  <div className="flex gap-2">
                    <input value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = customTagInput.trim(); if (val) setFormData((prev) => (prev.tags.includes(val) ? prev : { ...prev, tags: [...prev.tags, val] })); setCustomTagInput(''); } }} type="text" placeholder="输入标签，不用加#" className="dream-input flex-1 px-4 py-2 text-sm bg-white rounded-xl" />
                    <button onClick={() => { const val = customTagInput.trim(); if (val) setFormData((prev) => (prev.tags.includes(val) ? prev : { ...prev, tags: [...prev.tags, val] })); setCustomTagInput(''); }} className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition">添加</button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-2 ml-1">标签选择</div>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTags.map((tag) => (
                      <button key={tag} onClick={() => setFormData((prev) => ({ ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag] }))} className={`tag-select-btn flex items-center justify-center ${formData.tags.includes(tag) ? 'active' : ''}`}>#{tag}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {showAvatarEditor && (
        <AvatarEditor
          initialImage={formData.avatar || null}
          onSave={async (dataUrl) => {
            try {
              const r = await uploadAPI.avatar(dataUrl);
              setFormData((p) => ({ ...p, avatar: r.url }));
            } catch { }
            setShowAvatarEditor(false);
          }}
          onCancel={() => setShowAvatarEditor(false)}
        />
      )}
      {showAvatarEditor && (
        <AvatarEditor
          initialImage={formData.avatar}
          onSave={(newAvatar) => { setFormData(prev => ({ ...prev, avatar: newAvatar })); setShowAvatarEditor(false); }}
          onCancel={() => setShowAvatarEditor(false)}
        />
      )}
    </div>
  );
};

export default CharacterCreateView;
