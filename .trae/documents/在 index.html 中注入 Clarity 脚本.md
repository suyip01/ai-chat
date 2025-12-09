## 集成方式
1. 在 `<head>` 注入 Clarity 脚本（不改动现有逻辑）
   - 文件：`/src/index.html`
   - 内容：
```html
<script type="text/javascript">
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "uim9nsafi6");
</script>
```

2. 新建封装：`/src/user/services/analytics.ts`
   - 统一中文标签/事件，组件只调用封装：
```ts
// 简单防御式封装，未加载时静默
const safe = () => (typeof (window as any).clarity === 'function')
export const identifyUser = (u: { userId?: string | number; sessionId?: string; pageId?: string; name?: string }) => { try { if (!safe()) return; (window as any).clarity('identify', u.userId, u.sessionId, u.pageId, u.name) } catch {} }
export const setTag = (k: string, v: any) => { try { if (!safe()) return; (window as any).clarity('set', k, v) } catch {} }
export const trackEvent = (name: string, props?: Record<string, any>) => { try { if (!safe()) return; (window as any).clarity('event', name); if (props) Object.entries(props).forEach(([k,v]) => (window as any).clarity('set', k, v)) } catch {} }
```

## 页面级埋点（中文）
- 文件：`/src/user/App.tsx`
  - 在切换页签/进入聊天时统一识别与标签：
  - `identifyUser({ userId, sessionId: sid, pageId: activeTabKey, name: 页面中文名 })`
  - `setTag('页面', 页面中文名)`；`setTag('角色ID', selectedChat?.character.id)`；`setTag('聊天模式', 当前聊天模式)`（如果可用）
  - 触发点：`activeTab`、`selectedChat` 变更的 `useEffect`

- `/src/user/pages` 关键页面（示例）
  - `ChatDetail.tsx`：
    - 发送消息：`trackEvent('聊天.发送', { 文本长度: len, 聊天模式: chatMode })`
    - 切换模式：`trackEvent('聊天模式.切换', { 目标模式: mode })`
    - 打开“我的角色设置”面板：`trackEvent('聊天设置.打开')`

## 组件级埋点（中文）
- `BottomNav.tsx`
  - 点选页签：`trackEvent('底部导航.点击'); setTag('导航项', 中文项名)`
- `TopBar.tsx`
  - 返回/菜单/设置：`trackEvent('顶部栏.操作', { 动作: 中文动作 })`
- `ModelSelectorSheet.tsx`
  - 选择模型：`trackEvent('模型.选择', { 模型: mid })`
  - 温度修改：`trackEvent('模型温度.调整', { 温度: t })`
- `UserRoleSelectorSheet.tsx`
  - 选择角色：`trackEvent('角色.选择', { 角色名: persona.name })`
  - 编辑角色：`trackEvent('角色.编辑', { 角色ID: roleId })`
- `UserCharacterSettings.tsx`
  - 保存：`trackEvent('角色设置.保存')`
- `ImageCropper.tsx`
  - 开始裁剪：`trackEvent('头像裁剪.开始')`
  - 确认裁剪：`trackEvent('头像裁剪.确认')`

## 标签命名规则（中文）
- 事件名：`模块.动作`（如“聊天.发送”）
- 维度标签：使用简短中文键（如“页面”、“导航项”、“模型”、“温度”、“角色名”、“聊天模式”）

## 隐私与屏蔽（可选但推荐）
- 对敏感输入元素加 `data-clarity-mask="true"`，避免录制内容

## 验证
- 刷新后在控制台确认 `window.clarity` 存在
- 操作界面后在 Clarity 控制台：
  - Filters → Tags/Custom identifiers 查看“页面”“导航项”“模型”等标签
  - Events 查看“聊天.发送”“角色.选择”等事件

## 执行计划
1. 将脚本注入 `src/index.html` `<head>`
2. 新增 `analytics.ts` 并导出 `identifyUser/setTag/trackEvent`
3. 在 `App.tsx` 页面级钩子加入 identify/setTag
4. 在上述组件与页面插入 `trackEvent/setTag` 调用（仅在现有事件处理函数内添加，不改变现有业务逻辑）
5. 回归验证并按需补充遮罩