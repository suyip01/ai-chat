## 总体原则
- 不是给“所有页面和组件”都统一加埋点代码；而是：
  - 在入口 `<head>` 初始化 Clarity（或 NPM 初始化）。
  - 在路由钩子里进行页面级识别与标签；这已覆盖所有页面访问（无需每页单独写）。
  - 在“关键交互组件”里添加事件埋点（按钮/模式切换/上传/裁剪/提交等）。

## 页面级（自动覆盖）
- 入口 `<head>` 集成 Clarity 脚本；SPA 路由变更时在 `App.tsx`（或路由根组件）统一调用：
  - `clarity('identify', userId, sessionId, pageId, name)` 每次路由变化都调用。
  - `clarity('set', 'page', routePath)` 可选。
- 这一步对 `/src/user/pages` 下所有页面生效；无需在每个页面组件都写同样代码。

## 组件级（仅对关键交互）
- 对你列出的组件，建议埋点如下（示例事件名，可按你的命名规则）：
  - `BottomNav.tsx`：导航点击事件 `clarity('event', 'Nav.Click')` 并 `set('navItem', itemKey)`。
  - `TopBar.tsx`：返回/设置/菜单点击 `clarity('event', 'TopBar.Action')` 并 `set('action', actionKey)`。
  - `ModelSelectorSheet.tsx`：模型选择 `clarity('event', 'Model.Select')` 并 `set('model', modelId)`、`set('temperature', value)`。
  - `UserRoleSelectorSheet.tsx`：角色选择 `clarity('event', 'UserRole.Select')` 并 `set('role', roleId)`。
  - `UserCharacterSettings.tsx`：角色配置保存 `clarity('event', 'CharacterSettings.Save')`。
  - `ImageCropper.tsx`：开始裁剪 `clarity('event', 'Avatar.CropStart')`、确认裁剪 `clarity('event', 'Avatar.CropConfirm')`。
  - `/src/user/pages/*`：页面内部的关键按钮（如发送消息、模式切换、上传）分别触发对应事件；无需重复“页面访问”埋点。
- 统一封装：创建 `analytics.ts` 暴露 `identify/setTag/trackEvent`，各组件只调用封装，避免散落重复代码。

## 用户区分
- 登录：使用稳定 `userId` 调用 `clarity('identify', userId, sessionId, pageId, friendlyName)`；Clarity 会在客户端哈希处理该 ID [Identify API]。
- 未登录：生成匿名 ID（localStorage），同样传入 `identify`，实现跨页面合并。
- 会话/页面：`customSessionId` 用后端会话或 WS 会话 ID；`customPageId` 用路由名称/Path。
- 标签：`set('role', user.role)`, `set('plan', user.plan)`, `set('chatMode', chatMode)` 便于过滤 [Client API]。

## 合规/隐私
- 如需 Cookie 同意，初始化后按需调用 `clarity('consent')` 或 `clarity.consentV2`。
- 对可能包含敏感信息的DOM使用 `data-clarity-mask="true"`，避免录制敏感文本 [Client API]。

## 实施顺序
1. 在 `<head>` 添加 Clarity 代码或使用 NPM 包在入口初始化。
2. 在 `App.tsx` 路由监听中统一调用 `identify` 与 `setTag`。
3. 新建 `analytics.ts` 封装 Clarity API；将上述关键组件的交互绑定到 `trackEvent`。
4. 在含敏感数据的表单元素上添加遮罩属性。
5. 验证：在 Clarity 控制台用 Filters（Custom identifiers/Tags/Events）查看用户与事件。

## 引用
- Clarity Client API（`set`/`event`/`consent`/`upgrade`）：https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
- Identify API（区分用户/会话/页面）：https://learn.microsoft.com/en-us/clarity/setup-and-installation/identify-api
- NPM 包（代码化集成）：https://www.npmjs.com/package/@microsoft/clarity