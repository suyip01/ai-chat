## 后端新增 /api/user-characters
- 路由文件：`server/src/client-routes/userCharacters.js`，使用 `userAuthRequired` 中间件
- 提供接口：
  - `GET /api/user-characters`：按用户 `req.user.id` 列出当前用户创建的角色
  - `GET /api/user-characters/:id`：获取详情（需校验归属该用户）
  - `POST /api/user-characters`：创建用户角色（仅保存基础资料，不上传提示词/模型/模板）
  - `PUT /api/user-characters/:id`：更新用户角色（仅基础资料）
  - `DELETE /api/user-characters/:id`：删除用户角色
- 保持现有公共角色端点不变：`/api/characters`（`server/src/index.js#L32` 和 `server/src/client-routes/characters.js` 不修改）

## 数据库与服务层
- 复用 `characters` 表或引入 `user_characters` 表：
  - 推荐复用 `characters` 表并新增 `user_id` 列用于归属（`ensureCharacterSchema` 中检查并添加该列）
  - 用户创建的角色统一设置 `creator_role='user_role'`，`creator=req.user.username`
- 服务层文件：`server/src/client-services/userCharacters.js`
  - `listUserCharacters(userId)`：按 `user_id` 和 `creator_role='user_role'` 查询
  - `getUserCharacter(userId, id)`：详情 + 归属校验
  - `createUserCharacter(userId, payload)`：插入基础资料字段（name、gender、avatar、identity、tagline、personality、relationship、plotTheme、plotSummary、openingLine、hobbies、experiences、tags、styleExamples、age、occupation），不写提示词/模型/模板
  - `updateUserCharacter(userId, id, payload)`：更新基础资料字段
  - `deleteUserCharacter(userId, id)`：删除

## 异步生成提示词
- 参考 `server/src/admin-services/sysprompt.js`
- 在 `createUserCharacter` / `updateUserCharacter` 成功后，异步触发生成两份提示词：
  - `system_prompt`（不带场景版）：使用 `generateNoScenePrompt` 或基于 `generateRolePrompt` 的模板变体
  - `system_prompt_scene`（带场景版）：使用 `generateRolePrompt`
- 生成完成后写回 `characters` 表对应记录（仅提示词字段）
- 为避免阻塞：在路由中 `setImmediate`/`setTimeout` 调用服务层生成函数；出错只记录日志不影响用户接口响应

## Redis 缓存（可选）
- 用户角色提示词更新后，刷新 `chat:character:{characterId}` 以便新会话使用最新提示词

## 前端集成
- 新建前端服务：`src/user/services/userCharactersService.ts`
  - `listUserCharacters()` → `GET /api/user-characters`
  - `getUserCharacter(id)` → `GET /api/user-characters/:id`
  - `createUserCharacter(payload)` → `POST /api/user-characters`
  - `updateUserCharacter(id, payload)` → `PUT /api/user-characters/:id`
  - `deleteUserCharacter(id)` → `DELETE /api/user-characters/:id`
- 角色创作页：复用并扩展 `src/user/components/UserCharacterSettings.tsx`（或新建“我的角色”页面）
  - 表单字段对齐服务层：性别、名字、年龄、职业、基本信息、性格、头像（已有裁剪上传模块）
  - 点击“完成”时调用 `createUserCharacter` 或 `updateUserCharacter`
  - 创建/更新仅提交基础资料；提示词生成由后端异步处理
- 列表页：在 `ChatList` 或新建“我的角色”列表页显示用户创建的角色，支持编辑/删除（调用上述服务）

## 安全与校验
- 后端所有 `/api/user-characters/*` 接口均使用 `userAuthRequired` 校验用户
- 所有读/写操作按 `user_id` 做归属校验
- 字段校验：`name`、`gender` 必填；其他可选
- 响应体：创建返回 `{ id }`；更新返回 `{ ok: true }`

## 兼容性与不变项
- 不修改 `/api/characters` 公共角色接口与其挂载路径（在 `server/src/index.js` 已固定）
- 会话及 WS 逻辑不变；当用户选择自创角色进入聊天，新会话会读取该角色提示词（生成完成后生效）

## 交付步骤
1. 在后端添加 `user_id` 列（`ensureCharacterSchema`）
2. 编写 `client-services/userCharacters.js` 与 `client-routes/userCharacters.js`
3. 在创建/更新完成后异步生成两份提示词并写回数据库
4. 前端新增 `userCharactersService.ts` 与页面/组件调用，完成创建/修改/删除/列表展示
5. 验证：
   - 创建用户角色 → 返回 id → 异步生成提示词，数据库字段更新
   - 列表按用户显示角色；编辑更新基础资料
   - 删除角色后列表刷新，Redis 缓存（如启用）同步清理对应键

请确认以上方案，我将按此实现后端接口与前端页面逻辑，保持公共角色端点不变并新增 `/api/user-characters`。