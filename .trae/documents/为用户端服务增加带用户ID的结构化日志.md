## 日志目标
- 在 `client-routes`、`client-services`、`admin-routes/sysprompt.js`、`admin-services/sysprompt.js` 全面接入结构化日志。
- 每条日志包含 `userId`、`reqId`、`route`、`action`、`duration`、`status`、`error` 等关键字段，便于定位问题与串联事务。
- 默认输出到 stdout（JSON），开发环境支持易读输出；保留安全红线：不记录敏感内容（API Key、Authorization、密码、完整提示词等）。

## 技术方案
1. 基础日志模块
- 新增 `server/src/utils/logger.js`：实现轻量结构化 logger（`info/warn/error`），支持 `createLogger(context)` 创建带上下文的子 logger。
- 字段：`timestamp`、`level`、`msg`、`userId`、`reqId`、`route`、`action`、`duration_ms`、`status`、`meta`。
- Redaction：对 `Authorization`、`apiKey`、`LLM_API_KEY`、`password` 等字段进行掩码；对长文本（如提示词）截断记录前 200 字并标注长度。

2. 请求级日志中间件
- 新增 `server/src/middleware/requestLogger.js`：
  - 生成 `reqId = uuid`，记录请求开始时间；
  - 从 `req.user?.id` 采集 `userId`（无则 `'anonymous'`）；
  - 将 `req.log = createLogger({ reqId, userId, route: req.originalUrl, method: req.method })` 挂载到请求对象；
  - 在响应 `finish` 时输出结束日志：`statusCode`、`duration_ms`、`contentLength`。
- 在 `server/src/index.js` 最前置 `app.use(requestLogger)`，确保路由都能使用 `req.log`。

3. 路由层接入（client-routes）
- 替换现有 `console.log` 为 `req.log.info` / `req.log.error`：
  - `server/src/client-routes/chat.js`：
    - 创建会话：记录 `action='chat.createSession'`，`character_id`、`user_chat_role_id`（掩码处理）；成功日志含 `sessionId`；错误日志包含 `error.message`。
    - 查询会话、历史：记录 `action='chat.getSession' | 'chat.getHistory'`，包含 `sid`、`limit`。
  - 其余路由（`auth.js`、`characters.js`、`uploads.js`、`userCharacters.js`、`userChatRole.js`、`userProfile.js`）按同样模式在关键点记录：入参要点、资源 ID、处理结果（count/affectedRows）、耗时。

4. 服务层接入（client-services）
- 为服务层方法增加可选 `log` 参数或使用 `createLogger` with `reqId/userId`：
  - `chatSessions.js`：
    - `createSession`：记录模型选取与温度值（仅在服务内部记录，不向客户端返回）；记录 `redis`/`db` 交互的耗时与 key/SQL（不记录敏感值与完整结果集）。
    - `getSession`：记录 `sid`、命中/未命中。
  - `chatMessages.js`、`chatSummary.js`、`characters.js`、`userCharacters.js`：统一记录查询/写入的资源标识与结果数量。
- 若当前调用不传 `log`，服务层创建本地子 logger：`createLogger({ component: 'service', name: 'chatSessions' })`。

5. 管理端 sysprompt 接入
- `server/src/admin-routes/sysprompt.js`：使用 `req.log` 记录 `action='sysprompt.generate'|'sysprompt.generateNoScene'`、模型 override、请求体关键字段的统计（如标签数量、styleExamples 数量）。
- `server/src/admin-services/sysprompt.js`：服务内部记录模型选择、调用耗时与响应截断预览：
  - `generateRolePrompt`：日志包含 `model`、`temperature`、`prompt_length`（系统/用户/输出的长度），不记录完整内容；
  - `generateNoScenePrompt`：同上，记录长度与耗时。

6. 字段与安全策略
- 必含：`userId`（来自 auth 中间件）、`reqId`、`route`、`method`、`action`、`status`、`duration_ms`、`sid/id` 等资源标识。
- 敏感字段处理：对 `Authorization`、`apiKey`、`LLM_API_KEY`、`password` 完全掩码；提示词与长文本仅记录长度与截断预览；上传文件名保留，文件内容不记录。

7. 配置
- 环境变量：`LOG_LEVEL`（默认 `info`）、`LOG_PRETTY`（开发 `true`）、`LOG_JSON`（默认 `true`）。
- 可选文件落地：后续若需要文件日志，再加 `LOG_FILE` 配置使用 `fs.createWriteStream` 追加写入。

8. 验证
- 本地运行 `npm run dev` 后：
  - 访问登录、创建会话、拉取历史、创建/更新角色与生成提示词；
  - 观察 stdout 输出的 JSON 日志，确认包含 `userId/reqId` 与动作信息；
  - 故意触发错误（缺参/权限），检查 `error` 栏位与 `status` 是否正确记录。

9. 交付
- 新增文件：`server/src/utils/logger.js`、`server/src/middleware/requestLogger.js`；
- 修改文件：`server/src/index.js`（引入中间件）、各路由与服务文件替换 `console.log` 并增加关键事务日志；
- 保持现有功能不变，仅增强可观测性。