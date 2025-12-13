## 改动目标
- 发送消息前检查 `access_token` 过期时间，若剩余 <2 分钟则先刷新再发送。
- 建立 WS 级的用户消息 ACK：服务端收到并入队生成后立即回传 `user_ack`，客户端据此把用户消息状态改为已发送；未收到 ACK 超时标记为失败并支持点击重试。

## 客户端改动
### 1) 令牌过期检查与刷新（统一入口）
- 新增工具方法：`decodeJwtExp(token): number | null`，从 JWT 解出 `exp`（单位秒）。
- 新增方法：`ensureFreshToken(minRemainingMs = 120000): Promise<boolean>`，判断 `exp*1000 - Date.now()` 是否小于 `minRemainingMs`，则调用已有 `refreshAccessToken()` 并在成功后重置本地 `user_access_token`。
- 在 `sharedChatWs.sendText(...)` 发送前调用 `ensureFreshToken()`；若刷新失败则返回并在 UI 上标记该条消息为失败。
- 为保持一致性，在 `chatService.connectChatWs.sendText(...)` 也加入上述预检查（该接口若仍被其他页面使用）。

### 2) 用户消息携带客户端消息ID
- `ChatDetail.handleSend` 构造的 `userMsg.id` 改为随 payload 一并发送：`client_msg_id`。
- `sharedChatWs.sendText(...)` 增加可选参数 `clientMsgId?: string`，并把其嵌入发送 payload。

### 3) ACK 处理
- `sharedChatWs.ts` 的 WS `onmessage` 增加分支：当 `type === 'user_ack'`，通过 `controlSubscribers` 广播（维持 assistant 分发的现有结构不变）。
- `ChatDetail.tsx` 在现有的 `addControlListener` 上再监听 `user_ack`，匹配 `sessionId` 与 `clientMsgId`，将该条消息的 `saved = true`、`failed = false`，并清除其超时定时器。

### 4) 失败与重试 UI/逻辑
- `ChatDetail` 的消息对象增加运行时字段：`failed?: boolean`、`pendingAck?: boolean`。
- 发送后：为该条消息设定 `pendingAck = true`，启动一个 8s 超时定时器；若超时仍无 ACK，则 `failed = true`、`pendingAck = false`，在气泡时间旁显示红色感叹号按钮。
- 点击红色感叹号：触发重发（复用原 `sendText`，携带同一 `client_msg_id` 或新建 ID），并重新进入 ACK 等待。

## 服务端改动（WS）
- 在 `server/src/client-services/chatWs.js` 的 `ws.on('message')` 内，在 `appendUserMessage(sid, payload.text, meta)` 成功之后：
  - 读取 `payload.client_msg_id`，随后向对应连接 `ws.send({ type: 'user_ack', sessionId: sid, clientMsgId: payload.client_msg_id })`。
- 保持现有鉴权与入队生成逻辑不变。

## 发送流程（更新后）
- 用户点击发送 → 构建 `userMsg`（含 `id`）→ 写入本地 IndexedDB（现有行为保留）→ 调用 `sharedChatWs.sendText`：
  - 检查并必要时刷新令牌；失败则直接把该条消息标记为失败。
  - 发送 payload（包含 `client_msg_id`）。
  - 等待服务端 `user_ack`，成功则清除超时并标记为已发送；若超时未收到则显示失败感叹号，支持重试。

## 兼容性与边界
- 若 `access_token` 不是 JWT：`decodeJwtExp` 返回 `null` → 始终在发送前尝试刷新一次（可加 2 分钟节流）。
- 若服务端在极短时间内返回 `refresh_required`：客户端仍会收到 control 消息；我们优先通过发送前刷新降低出现概率。
- 本地 DB 写入与 ACK 独立：即使写入成功仍可能失败未送达服务器，UI 以 ACK 为准展示状态。

## 影响文件
- `src/user/services/sharedChatWs.ts`（令牌预检、payload 扩展、ACK 分支）
- `src/user/services/chatService.ts`（令牌预检，保持一致）
- `src/user/pages/ChatDetail.tsx`（消息状态、ACK 监听、超时与重试、UI 感叹号）
- `src/user/services/chatDb.ts`（无需结构变动；可选：为用户消息增加一个 `pending/failed` 标记字段，若需要持久化状态）
- `src/user/App.tsx`（不需要变更）
- `server/src/client-services/chatWs.js`（发送 `user_ack`）

## 验证方案
- 单元验证：
  - 构造即将过期 JWT（`exp` 在 90s 后）→ 发送消息应先刷新再发送。
  - 模拟服务端不回 ACK（临时注释 ACK 发送）→ 前端 8s 后出现红色感叹号，可点击重试并成功清除失败状态。
- 集成验证：
  - 正常会话下，发送 → 收到 `user_ack` → 用户消息状态更新为已发送；随后分片助手消息到达。
  - 切换不同页面与网络波动场景，确认不会重复发送或丢消息。

请确认以上方案，我将据此在指定文件中落地实现与测试。