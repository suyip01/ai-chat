import React, { useEffect } from 'react';
import { ArrowLeft, Send, MoreVertical, X, ChevronRight, User as UserIcon, MessageSquare, Image as ImageIcon, Loader2, Cpu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { androidSlideRight, fade } from '../animations';
import { UserCharacterSettings } from '../components/UserCharacterSettings';
import { UserRoleSelectorSheet } from '../components/UserRoleSelectorSheet';
import { ModelSelectorSheet } from '../components/ModelSelectorSheet';
import { Character, Message, UserPersona } from '../types';
import { sharedChatWs } from '../services/sharedChatWs';
import { useChatUI } from '../hooks/chat/useChatUI';
import { useChatSettings } from '../hooks/chat/useChatSettings';
import { useChatSession } from '../hooks/chat/useChatSession';

// 聊天详情页组件接口
interface ChatDetailProps {
  character: Character;           // 当前聊天的角色对象
  initialMessages: Message[];     // 初始消息列表
  userPersona?: UserPersona;      // 用户当前使用的身份（可选）
  onBack: () => void;             // 返回上一页回调
  onUpdateLastMessage: (msg: Message) => void; // 更新最后一条消息回调（用于列表页预览）
  onOpenUserSettings?: () => void; // 打开用户全局设置（可选，目前未直接使用）
  onShowProfile: () => void;      // 点击角色头像查看详情回调
  onUpdateUserPersona?: (persona: UserPersona) => void; // 更新用户身份回调
  sessionId?: string;             // 指定的会话ID
}

/**
 * 聊天详情页主要组件
 * 负责组装 UI, Settings, Session 三层 Hook，并渲染视图
 */
export const ChatDetail: React.FC<ChatDetailProps> = ({
  character,
  initialMessages,
  userPersona,
  onBack,
  onUpdateLastMessage,
  onShowProfile,
  sessionId: sessionIdProp
}) => {
  // 1. 初始化聊天设置 Hook (管理模式、输入框状态、背景、角色配置等)
  const settings = useChatSettings(character.id, sessionIdProp || null, userPersona);

  // 2. 初始化聊天会话 Hook (管理 WebSocket、消息收发、重试、会话生命周期)
  const session = useChatSession({
    character,
    sessionIdProp,
    onUpdateLastMessage,
    input: settings.input,
    setInput: settings.setInput,
    chatMode: settings.chatMode,
    effectivePersona: settings.effectivePersona,
    modelId: settings.modelId,
    modelTemp: settings.modelTemp,
    hasModelOverride: settings.hasModelOverride,
    hasTempOverride: settings.hasTempOverride,
    setModelTemp: (t) => settings.updateModel(undefined, undefined, t),
    setModelId: (id) => settings.updateModel(id),
    initialMessages
  });

  // 3. 初始化 UI 交互 Hook
  const ui = useChatUI(session.messages, session.isTyping, settings.input);

  const isTouch = (navigator as any)?.maxTouchPoints > 0;

  // 当背景图变更时，检测亮度以调整文字颜色
  useEffect(() => {
    ui.analyzeBgBrightness(settings.chatBg);
  }, [settings.chatBg]);

  // 时间格式化辅助函数
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-primary-50 z-50"
      style={{ ...ui.viewportStyle, overscrollBehavior: 'none', position: 'fixed' }}
      initial={{ x: isTouch ? '100%' : 0 }}
      animate={{ x: 0 }}
      exit={{ x: isTouch ? '100%' : 0 }}
      transition={{ duration: isTouch ? 0.3 : 0, ease: 'easeInOut' }}
    >
      <div className="mx-auto w-full max-w-md h-full flex flex-col relative bg-white shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden">
        {/* 顶部导航栏 */}
        <div className="bg-primary-50/95 backdrop-blur-md pt-[env(safe-area-inset-top)] shadow-none z-10 border-b border-white/50 flex-shrink-0">
          <div className="px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 -ml-2 text-slate-800 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>

              {/* 点击名字区域 */}
              <div
                className="flex items-center cursor-pointer active:opacity-70 transition-opacity"
              >
                <h2 className="font-bold text-slate-800 text-lg">
                  {session.isTyping ? '对方正在输入中...' : character.name}
                </h2>
              </div>
            </div>
            {/* 更多设置按钮 */}
            <button
              onClick={() => settings.setIsSettingsOpen(true)}
              className="p-2 text-slate-800 hover:text-primary-600 rounded-full hover:bg-black/5 transition-all"
            >
              <MoreVertical size={24} />
            </button>
          </div>
        </div>

        {/* 消息列表区域 */}
        <div
          ref={ui.contentRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar ${settings.chatBg ? '' : 'bg-primary-50'}`}
          style={{
            overflowAnchor: 'none',
            backgroundImage: settings.chatBg ? `url(${settings.chatBg})` : undefined,
            backgroundSize: settings.chatBg ? 'cover' : undefined,
            backgroundPosition: settings.chatBg ? 'center' : undefined,
            backgroundRepeat: settings.chatBg ? 'no-repeat' : undefined,
          }}
        >
          {/* 日期分割线（示例） */}
          <div className="flex justify-center my-4">
            <span
              className={`text-[10px] px-3 py-1 rounded-full font-medium backdrop-blur-sm ${settings.chatBg ? (ui.isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'bg-black/10 text-white'}`}
            >今天</span>
          </div>

          {session.messages.map((msg, index) => {
            const isMe = msg.senderId === 'user';

            return (
              <div key={`${msg.id}_${index}`} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-4 group`}>

                {isMe ? (
                  // 用户发送的消息
                  <div className="flex w-full justify-end mb-4 group">
                    <div className="flex flex-col items-end max-w-[75%]">
                      <div className="flex items-center justify-end gap-2">
                        {/* 失败重试按钮 */}
                        {(msg as any).failed && (
                          <div className="flex items-center justify-center">
                            <button
                              className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                              onClick={() => session.handleSend(msg.id)} // 调用 handleSend 并传入 ID 进行重试
                              title="重新发送"
                            >
                              <span className="font-bold text-xs">!</span>
                            </button>
                          </div>
                        )}

                        {/* Loading 动画 */}
                        {(msg as any).spinning && !(msg as any).failed && (
                          <div className={`flex items-center justify-center ${settings.chatBg ? 'p-1 rounded-full backdrop-blur-sm ' + (ui.isBgDark ? 'bg-white/30' : 'bg-black/30') : ''}`}>
                            <Loader2 className={`w-4 h-4 animate-spin ${settings.chatBg ? (ui.isBgDark ? 'text-slate-800' : 'text-white') : 'text-slate-400'}`} />
                          </div>
                        )}

                        {/* 消息气泡 */}
                        <div
                          className={`
                              px-4 py-3 text-[15px] shadow-sm leading-relaxed relative
                              bg-[#A855F7] text-white rounded-[20px] rounded-tr-sm
                            `}
                        >
                          {msg.text}
                        </div>
                      </div>

                      {/* 状态：已读/时间 */}
                      <div className="flex items-center gap-2 mt-1 mr-1">
                        {msg.read && (
                          <span
                            className={`text-[10px] ${settings.chatBg ? 'px-1.5 py-0.5 rounded-full backdrop-blur-sm ' + (ui.isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'text-slate-400'}`}
                            style={settings.chatBg ? { textShadow: ui.isBgDark ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.6)' } : undefined}
                          >已读</span>
                        )}
                        <span
                          className={`text-[10px] ${settings.chatBg ? 'px-1.5 py-0.5 rounded-full backdrop-blur-sm ' + (ui.isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'text-slate-400'}`}
                          style={settings.chatBg ? { textShadow: ui.isBgDark ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.6)' } : undefined}
                        >{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>

                    {/* 用户头像 */}
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-pink-200 flex items-center justify-center text-pink-600 font-bold border border-white shadow-sm">
                        {settings.effectivePersona?.avatar ? (
                          <img src={settings.effectivePersona.avatar} alt={settings.effectivePersona?.name || '我'} className="w-full h-full object-cover" />
                        ) : (
                          (settings.effectivePersona?.name ? settings.effectivePersona.name[0] : '我')
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 角色回复的消息
                  <div className="flex w-full justify-start mb-4 group">
                    <div className="flex-shrink-0 mr-3 flex flex-col items-center gap-1">
                      <div
                        onClick={onShowProfile}
                        className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-500 font-bold border border-white cursor-pointer active:scale-95 transition-transform"
                      >
                        {character.avatar ? (
                          <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                        ) : (
                          character.name[0]
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start max-w-[75%]">
                      <div
                        className={`
                          px-4 py-3 text-[15px] shadow-sm leading-relaxed relative
                          bg-white text-slate-800 rounded-[20px] rounded-tl-sm border border-slate-100
                        `}
                      >
                        {msg.text}
                      </div>
                      {/* 引用回复气泡 */}
                      {msg.quote && (
                        <div className="mt-1 max-w-full">
                          <div className="inline-block bg-slate-100 text-slate-500 text-xs leading-tight rounded-[12px] px-2 py-1 border border-slate-200">
                            {msg.quote}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 ml-1">
                        <span
                          className={`text-[10px] ${settings.chatBg ? 'px-1.5 py-0.5 rounded-full backdrop-blur-sm ' + (ui.isBgDark ? 'bg-white/30 text-slate-800' : 'bg-black/30 text-white') : 'text-slate-400'}`}
                          style={settings.chatBg ? { textShadow: ui.isBgDark ? '0 1px 1px rgba(255,255,255,0.5)' : '0 1px 1px rgba(0,0,0,0.6)' } : undefined}
                        >{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}

          <div ref={ui.messagesEndRef} />
        </div>

        {/* 底部输入区域 */}
        <div className="bg-white p-3 pb-3 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] pb-[env(safe-area-inset-bottom)] mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white rounded-[24px] px-3 py-2 border border-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.12)] transition-shadow focus-within:shadow-[0_16px_40px_rgba(0,0,0,0.16)]">

            <div className="flex-1 flex items-center pl-2">
              <textarea
                ref={ui.textareaRef}
                value={settings.input}
                onChange={(e) => {
                  settings.setInput(e.target.value);
                  if (session.sessionId) sharedChatWs.sendTyping(session.sessionId, true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    session.handleSend();
                  }
                }}
                onFocus={() => { ui.scrollToBottom(); setTimeout(ui.scrollToBottom, 150); setTimeout(ui.scrollToBottom, 300); ui.resizeTextarea(); setTimeout(ui.resizeTextarea, 0); }}
                onBlur={() => { if (session.sessionId) sharedChatWs.sendTyping(session.sessionId, false) }}
                placeholder=""
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-700 text-sm p-0 resize-none max-h-24 overflow-y-auto no-scrollbar leading-5 placeholder:text-slate-400"
                rows={1}
                style={{ minHeight: '22px' }}
              />
            </div>

            <button
              onClick={() => session.handleSend()}
              disabled={!settings.input.trim() || settings.input.trim() === '（）'}
              className={`p-2 rounded-full transition-all duration-300 flex-shrink-0 flex items-center justify-center ${settings.input.trim() && settings.input.trim() !== '（）' ? 'bg-[#A855F7] text-white shadow-md active:scale-95' : 'bg-transparent text-[#A855F7]'}`}
            >
              <Send size={20} className={settings.input.trim() && settings.input.trim() !== '（）' ? 'ml-0.5' : ''} />
            </button>
          </div>
        </div>

        {/* 设置面板遮罩 */}
        <AnimatePresence initial={false}>
          {settings.isSettingsOpen && (
            <>
              <motion.div className="absolute inset-0 bg-black/20 z-[60] will-change-opacity" onClick={() => settings.setIsSettingsOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} />
              <motion.div className="absolute top-0 right-0 h-full w-3/4 bg-white z-[70] shadow-2xl will-change-transform transform-gpu" initial={{ x: isTouch ? '100%' : 0 }} animate={{ x: 0 }} exit={{ x: isTouch ? '100%' : 0 }} transition={{ ...androidSlideRight, duration: isTouch ? 0.28 : 0 }}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800">聊天设置</h3>
                  <button onClick={() => settings.setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      settings.setIsSettingsOpen(false);
                      settings.setIsRoleSheetOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <UserIcon size={18} />
                      </div>
                      <span className="font-bold text-sm">我的角色设置</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>

                  <div className="h-[1px] bg-slate-50 mx-4"></div>

                  {/* 模型设置入口 */}
                  <button
                    onClick={() => { settings.setIsSettingsOpen(false); settings.setIsModelSheetOpen(true) }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <Cpu size={18} />
                      </div>
                      <span className="font-bold text-sm">模型</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{settings.modelNick || '默认'}</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </button>

                  <div className="h-[1px] bg-slate-50 mx-4"></div>

                  {/* 聊天模式切换 */}
                  <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <MessageSquare size={18} />
                      </div>
                      <span className="font-bold text-sm">聊天模式</span>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => settings.handleModeSwitch('daily')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${settings.chatMode === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                      >
                        日常
                      </button>
                      <button
                        onClick={() => settings.handleModeSwitch('scene')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${settings.chatMode === 'scene' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        场景
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-50 mx-4"></div>

                  {/* 背景更换 */}
                  <button
                    onClick={() => { settings.setIsSettingsOpen(false); settings.setIsBgSheetOpen(true); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <ImageIcon size={18} />
                      </div>
                      <span className="font-bold text-sm">聊天背景更改</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 背景设置面板 */}
        <AnimatePresence initial={false}>
          {settings.isBgSheetOpen && (
            <motion.div
              className="absolute inset-0 bg-white z-[70] will-change-transform"
              initial={{ x: isTouch ? '100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: isTouch ? '100%' : 0 }}
              transition={{ ...androidSlideRight, duration: isTouch ? 0.28 : 0 }}
            >
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => settings.setIsBgSheetOpen(false)} className="p-2 -ml-2 text-slate-800 hover:bg-black/5 rounded-full">
                  <ArrowLeft size={24} />
                </button>
                <h3 className="font-bold text-lg text-slate-800">聊天背景</h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { settings.updateBg(undefined); ui.setIsBgDark(null); settings.setIsBgSheetOpen(false) }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="font-bold text-sm text-slate-700">重置背景</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <div className="h-[1px] bg-slate-50 mx-4"></div>
                <button
                  onClick={() => { settings.setIsBgSheetOpen(false); settings.bgInputRef.current?.click(); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="font-bold text-sm text-slate-700">从相册中选择</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {settings.isUserSettingsOpenLocal && (
          <UserCharacterSettings
            currentPersona={settings.editingPersona}
            roleId={settings.editingRoleId}
            onBack={() => settings.setIsUserSettingsOpenLocal(false)}
            onSave={(_) => {
              settings.setIsUserSettingsOpenLocal(false);
              settings.setIsRoleSheetOpen(true);
            }}
            withinContainer
          />
        )}

        <UserRoleSelectorSheet
          isOpen={settings.isRoleSheetOpen}
          currentPersona={settings.personaLocal || userPersona}
          characterId={character.id}
          onClose={() => settings.setIsRoleSheetOpen(false)}
          onAdd={() => { settings.setIsRoleSheetOpen(false); settings.setEditingPersona(undefined); settings.setEditingRoleId(undefined); settings.setIsUserSettingsOpenLocal(true); }}
          onSelect={(persona) => {
            settings.savePersona(persona);
          }}
          onEdit={(persona, roleId) => { settings.setIsRoleSheetOpen(false); settings.setEditingPersona(persona); settings.setEditingRoleId(roleId); settings.setIsUserSettingsOpenLocal(true) }}
        />

        {/* 模型选择Sheet */}
        <AnimatePresence initial={false}>
          {settings.isModelSheetOpen && (
            <ModelSelectorSheet
              isOpen={settings.isModelSheetOpen}
              currentModelId={settings.modelId}
              onClose={() => settings.setIsModelSheetOpen(false)}
              onSelect={(mid, nickname) => {
                settings.updateModel(mid, nickname);
              }}
              temperature={settings.modelTemp}
              onTempChange={(t) => { settings.updateModel(undefined, undefined, t); }}
            />
          )}
        </AnimatePresence>

        {/* 会话失效提示弹窗 */}
        {session.isSessionInvalid && (
          <>
            <div className="fixed inset-0 z-[80] bg-black/20"></div>
            <div className="fixed inset-0 z-[90] flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm">
                <div className="px-6 py-5 text-center text-slate-800 font-bold">该会话已失效，请新建会话。</div>
                <div className="h-[1px] bg-slate-100"></div>
                <div className="flex">
                  <button className="flex-1 py-3 text-slate-600 active:opacity-70" onClick={() => { session.setIsSessionInvalid(false); onBack(); }}>返回列表</button>
                  <div className="w-[1px] bg-slate-100"></div>
                  <button
                    className="flex-1 py-3 text-primary-600 font-bold active:opacity-70"
                    onClick={() => {
                      session.recreateSession();
                    }}
                  >新建会话</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 账号禁用提示弹窗 */}
        {session.showDisabledPrompt && (
          <>
            <div className="fixed inset-0 z-[80] bg-black/30"></div>
            <div className="fixed inset-0 z-[90] flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[85%] max-w-sm">
                <div className="px-6 py-5 text-center font-bold text-red-600">此帐号已暂停使用，请联络工作人员。</div>
                <div className="h-[1px] bg-slate-100"></div>
                <div className="flex">
                  <button
                    className="flex-1 py-3 text-primary-600 font-bold active:opacity-70"
                    onClick={async () => {
                      try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch { }
                      session.setShowDisabledPrompt(false)
                      try { window.location.reload() } catch { }
                    }}
                  >确定</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 隐藏的背景图上传 input */}
        <input
          type="file"
          accept="image/*"
          ref={settings.bgInputRef}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              const r = new FileReader()
              r.onload = (ev) => {
                const result = ev.target?.result as string
                settings.updateBg(result)
                ui.analyzeBgBrightness(result)
              }
              r.readAsDataURL(f)
            }
            try { e.currentTarget.value = '' } catch { }
          }}
        />

      </div>
    </motion.div>
  );
};
