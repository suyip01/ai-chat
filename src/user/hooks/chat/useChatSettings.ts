import { useState, useEffect, useMemo, useRef } from 'react';
import { UserPersona } from '../../types';
import { trackEvent, setTag } from '../../services/analytics';
import { getConfig as dbGetConfig, putConfig as dbPutConfig } from '../../services/chatDb';

/**
 * 聊天设置 Hook
 * 管理当前聊天的模式（日常/场景）、角色扮演设置、模型参数、聊天背景等
 * 更改为完全基于 IndexedDB 存储（按 SessionID 隔离），不再使用 LocalStorage
 */
export const useChatSettings = (characterId: string, sessionId: string | null, userPersonaProp?: UserPersona) => {
    // 聊天模式：daily（日常）或 scene（场景）
    const [chatMode, setChatMode] = useState<'daily' | 'scene'>('scene');
    // 输入框内容，场景模式下默认包含中文括号
    const [input, setInput] = useState('（）');

    // UI 状态控制
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUserSettingsOpenLocal, setIsUserSettingsOpenLocal] = useState(false);
    const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
    const [isModelSheetOpen, setIsModelSheetOpen] = useState(false);
    const [isBgSheetOpen, setIsBgSheetOpen] = useState(false);

    // 正在编辑的角色/Persona信息
    const [editingPersona, setEditingPersona] = useState<UserPersona | undefined>(undefined);
    const [editingRoleId, setEditingRoleId] = useState<number | undefined>(undefined);

    // 模型参数
    const [modelId, setModelId] = useState<string | undefined>(undefined);
    const [modelTemp, setModelTemp] = useState<number>(0.1);
    const [modelNick, setModelNick] = useState<string | undefined>(undefined);
    const [hasModelOverride, setHasModelOverride] = useState<boolean>(false);
    const [hasTempOverride, setHasTempOverride] = useState<boolean>(false);

    // 本地（当前会话）生效的角色 Persona
    const [personaLocal, setPersonaLocal] = useState<UserPersona | undefined>(undefined);

    // 背景设置状态
    const [chatBg, setChatBg] = useState<string | undefined>(undefined);
    const bgInputRef = useRef<HTMLInputElement>(null);

    // 计算最终生效的用户身份 Persona
    const effectivePersona = useMemo<UserPersona | undefined>(() => {
        if (personaLocal) return personaLocal;
        try {
            // 如果只有基础头像昵称，构造成临时 Persona (作为显示兜底，不保存)
            const nickname = localStorage.getItem('user_nickname') || '';
            const avatar = localStorage.getItem('user_avatar') || '';
            if (nickname || avatar) {
                return {
                    name: nickname || '我',
                    gender: 'secret',
                    age: '',
                    profession: '',
                    basicInfo: '',
                    personality: '',
                    avatar: avatar || undefined,
                };
            }
        } catch { }
        return undefined;
    }, [personaLocal]);

    // 初始化：完全从 IndexedDB 加载当前 Session 的配置
    useEffect(() => {
        if (!sessionId) return;
        const load = async () => {
            try {
                const cfg = await dbGetConfig(sessionId);
                if (cfg) {
                    if (cfg.mode === 'daily' || cfg.mode === 'scene') {
                        setChatMode(cfg.mode);
                        setInput(cfg.mode === 'scene' ? '（）' : '');
                    }
                    if (cfg.persona) setPersonaLocal(cfg.persona);
                    if (cfg.modelId) { setModelId(cfg.modelId); setHasModelOverride(true); }
                    if (typeof cfg.temperature === 'number') { setModelTemp(cfg.temperature); setHasTempOverride(true); }
                    if (cfg.modelNick) setModelNick(cfg.modelNick);
                    if (cfg.background) setChatBg(cfg.background);
                }
            } catch { }
        };
        load();
    }, [sessionId]);

    // 统一持久化函数
    const persistSettings = (updates: Partial<{
        mode: 'daily' | 'scene';
        persona: UserPersona;
        modelId: string;
        temperature: number;
        modelNick: string;
        background: string;
    }>) => {
        if (!sessionId) return;

        // 合并更新值与当前状态（注意：调用此函数时应传入最新的变更值，因为闭包中的状态可能是旧的）
        const nextMode = 'mode' in updates ? updates.mode! : chatMode;
        const nextPersona = 'persona' in updates ? updates.persona : personaLocal;
        const nextModelId = 'modelId' in updates ? updates.modelId : modelId;
        const nextTemp = 'temperature' in updates ? updates.temperature! : modelTemp;
        const nextNick = 'modelNick' in updates ? updates.modelNick : modelNick;
        const nextBg = 'background' in updates ? updates.background : chatBg;

        dbPutConfig(sessionId, {
            sessionId,
            mode: nextMode,
            persona: nextPersona,
            modelId: nextModelId,
            temperature: nextTemp,
            modelNick: nextNick,
            background: nextBg
        }).catch(() => { });
    };

    // 切换聊天模式
    const handleModeSwitch = (mode: 'daily' | 'scene') => {
        setChatMode(mode);
        if (mode === 'scene') {
            if (!input.includes('（') && !input.includes('(')) {
                setInput(prev => `（）${prev}`);
            } else if (input === '') {
                setInput('（）');
            }
        } else {
            if (input === '（）' || input === '()') {
                setInput('');
            }
        }
        persistSettings({ mode });
        trackEvent('聊天模式.切换', { 目标模式: mode === 'scene' ? '场景' : '日常' });
        setTag('聊天模式', mode === 'scene' ? '场景' : '日常');
    };

    // 保存 Persona
    const savePersona = (persona: UserPersona) => {
        setPersonaLocal(persona);
        persistSettings({ persona });
    };

    // 更新模型设置
    const updateModel = (id?: string, nick?: string, temp?: number) => {
        // 更新 State
        if (id !== undefined) { setModelId(id); setHasModelOverride(!!id); }
        if (nick !== undefined) setModelNick(nick);
        if (temp !== undefined) { setModelTemp(temp); setHasTempOverride(true); }

        // 持久化 (必须显式传递更新的值)
        persistSettings({
            modelId: id !== undefined ? id : modelId,
            modelNick: nick !== undefined ? nick : modelNick,
            temperature: temp !== undefined ? temp : modelTemp
        });
    };

    // 更新背景
    const updateBg = (bg?: string) => {
        setChatBg(bg);
        persistSettings({ background: bg });
    };

    return {
        chatMode, setChatMode,
        input, setInput,
        isSettingsOpen, setIsSettingsOpen,
        isUserSettingsOpenLocal, setIsUserSettingsOpenLocal,
        isRoleSheetOpen, setIsRoleSheetOpen,
        isModelSheetOpen, setIsModelSheetOpen,
        editingPersona, setEditingPersona,
        editingRoleId, setEditingRoleId,

        modelId, modelTemp, modelNick, hasModelOverride, hasTempOverride,
        personaLocal,

        effectivePersona,

        isBgSheetOpen, setIsBgSheetOpen,
        chatBg, bgInputRef,

        handleModeSwitch,
        savePersona,
        updateModel,
        updateBg
    };
};
