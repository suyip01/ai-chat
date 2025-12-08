## 目标
当某个会话的消息发送队列清空后，延迟2秒检查仍为空且无发送中，则将该会话的 `llmCounts` 重置为 `0`，避免计数残留影响后续逻辑。

## 背景
- 计数维护：在收到用户消息时增加计数（`llmCounts.set(sid, (llmCounts.get(sid) || 0) + 1)`，见 server/src/client-services/chatWs.js:170）；在分块发送完成后减少计数（server/src/client-services/chatWs.js:125）。
- 现状问题：当队列处理完毕后计数可能不为0，应在队列空闲一段时间后强制归零。

## 具体改动
1. 增加定时器Map
- 在 `startChatWs` 内与现有Map同级新增：`const resetCountTimers = new Map()`。

2. 队列空时安排重置
- 在 `enqueueSend` 的 `runNext` 中，当队列取不到 `next`（server/src/client-services/chatWs.js:90）说明队列已空：
  - 清理已有重置定时器：
    - `const t = resetCountTimers.get(sid); if (t) clearTimeout(t)`
  - 安排一个2秒后执行的定时器：
    - `const timer = setTimeout(() => { if (!sendingSids.has(sid) && (sendQueues.get(sid) || []).length === 0) { llmCounts.set(sid, 0) } resetCountTimers.delete(sid) }, 2000)`
    - `resetCountTimers.set(sid, timer)`

3. 新任务到来时取消重置
- 在 `enqueueSend(sid, batch)` 的函数开始处，当有新批次入队：
  - 如果存在重置定时器则取消：
    - `const t = resetCountTimers.get(sid); if (t) { clearTimeout(t); resetCountTimers.delete(sid) }`

## 日志（可选）
- 在计数被重置时记录一条：`createLogger({ component: 'ws' }).info('llm.count.reset', { sid })`，便于观察行为。

## 验证
- 触发一次用户消息，产生回复分块；待全部分块发送完、队列为空，2秒后确认 `llmCounts.get(sid) === 0`。
- 在队列空闲期间再次入队，应取消重置定时器，最后计数仅在新一轮队列清空后归零。

## 影响范围
- 仅改动 `server/src/client-services/chatWs.js`，不影响公共接口；与现有 `Map`/队列/发送流程风格一致。