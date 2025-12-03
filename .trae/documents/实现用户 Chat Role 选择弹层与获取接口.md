## 服务端接口
- 新增 `GET /api/user/chat-role`，返回当前登录用户的所有 Chat Role 列表。
- 路由文件：`server/src/client-routes/userChatRole.js`（已挂载 `/api/user/chat-role`）。
- 实现：
  - 从 `req.user.id` 取 `userId`，查询 `user_chat_role` 表：`SELECT id, name, age, gender, profession, basic_info, personality, avatar FROM user_chat_role WHERE user_id = ? ORDER BY id DESC`。
  - 返回 JSON 数组，字段保持表结构；错误时返回 `{ error: 'server_error' }`。
- 兼容：保留现有 `POST`、`PUT`；暂不依赖 Redis（`PUT` 已写入缓存，列表直接读库即可）。

## 前端服务方法
- 在 `src/user/services/chatService.ts` 或新建 `userChatRoleService.ts` 增加：
  - `fetchUserChatRoles(): Promise<Array<{ id:number; name:string; age:number|null; gender:string; profession:string|null; basic_info:string|null; personality:string|null; avatar:string|null }>>`
  - 使用现有 `authFetch('/user/chat-role')`。
- 性别映射：服务或组件层将后端 `gender`（"男"/"女"/"未透露"）转换为 `UserPersona.gender`（`male`/`female`/`secret`）。

## 角色选择底部弹层 UI
- 新增组件 `UserRoleSelectorSheet`（目录：`src/user/components/`）。
- 行为与样式参考示例：`Desktop/user.bak/pages/ChatWindowsPage.jsx` 的“我的角色”弹层。
- 结构：
  - 顶部粘性 Header：左侧返回、标题“我的角色”；右上角“添加”按钮。
  - 列表项：头像圆形、名称、职业/年龄；当前选中项右侧显示勾选标识。
  - 空列表时显示占位与“添加”按钮。
- 交互：
  - 打开时调用 `fetchUserChatRoles()` 拉取数据；点击某项：
    - 将所选项映射为 `UserPersona` 并调用父组件的 `onSelect(persona, roleId)`。
    - 将 `roleId` 写入 `localStorage('user_chat_role_id')`，便于会话创建。
  - 点击右上角“添加”：关闭弹层并打开现有 `UserCharacterSettings` 页面（当前“角色添加页面”）。

## 集成到聊天页
- 修改 `src/user/components/ChatDetail.tsx`：
  - “我的角色设置”按钮不再直接打开 `UserCharacterSettings`，改为打开 `UserRoleSelectorSheet`。
  - `onSelect` 后：
    - 调用现有 `onUpdateUserPersona` 更新 `userPersona`。
    - 若当前没有会话，调用 `createChatSession(character.id, selectedRoleId)`；已有会话仅更新后续消息的 `userRole`（现有 `wsRef.sendText` 已支持）。
  - Sheet 右上角“添加”跳转到 `UserCharacterSettings`（保持现有添加流程，不引入模拟数据）。

## 体验与兼容
- 视觉：底部弹层圆角、阴影、`backdrop-blur`，与示例一致；安全区（`env(safe-area-inset-bottom)`）处理。
- 失败处理：拉取失败时显示轻提示与重试按钮。
- 无角色：展示空态与“添加角色”引导。

## 交付项
- 服务端：`GET /api/user/chat-role` 实现与导出。
- 前端：
  - 新建 `UserRoleSelectorSheet` 组件。
  - 新增 `fetchUserChatRoles` 方法。
  - 更新 `ChatDetail.tsx` 打开选择弹层并接入选择逻辑。

请确认以上方案，我将据此实现、联调并验证。