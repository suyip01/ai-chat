## 问题分析
- 聊天列表红点来源：在 `App.tsx` 的后台订阅逻辑中，收到 `assistant_message` 后通过 `setChats` 更新 `chat.unreadCount`（src/user/App.tsx:477-485）。当前仅在“最终分片”时 `+1`。
- Toast 数量来源：同一处在“最终分片”时触发 `chatEvents.emitIncoming(...)`，`count` 取自当前会话的 `unreadCount`，`ToastIncomingBridge` 转发到 `ToastProvider.showIncoming` 渲染 `[count条]`（src/user/components/ToastIncomingBridge.tsx、src/user/components/Toast.tsx:84）。
- 现象：一轮返回 `chunkTotal=3` + 另一轮 `chunkTotal=1`，总 4 条消息，但逻辑按“每轮最终分片 +1”，因此红点与 Toast 只加到 2。

## 修复方案
- 在后台订阅处理处，按“最终分片的 `chunkTotal`”累计未读：
  - 将 `nextCount = (c.unreadCount || 0) + (isFinal ? 1 : 0)` 改为 `nextCount = (c.unreadCount || 0) + (isFinal ? (meta?.chunkTotal || 1) : 0)`。
  - 当 `matched` 不存在、需取 `chatsRef.current` 时，将 `+1` 改为 `+(meta?.chunkTotal || 1)`，保持与红点一致。
  - 继续仅在最终分片时触发 Toast，`count` 传当前累计后的 `unreadCount`。
- 兼容性：无 `chunkTotal` 时按 1 处理；非最终分片不累计、不触发 Toast。

## 验证用例
- 用例 A：两轮返回，第一轮 `chunkTotal=3`，第二轮 `chunkTotal=1`，在关闭聊天页面时红点应累计到 4，Toast 显示 `[4条]`。
- 用例 B：单轮 `chunkTotal` 缺失或为 1，红点与 Toast 均累计 +1。
- 用例 C：聊天页面打开时仍保持 `unreadCount` 归零逻辑，不受影响。

## 预期改动文件
- 仅修改：`src/user/App.tsx`（后台订阅处的未读累计与 Toast 计数回退路径）
- 无需修改：`ChatList.tsx`、`Toast.tsx`、`ToastIncomingBridge.tsx`（它们已按传入的 `count` 展示）

## 风险与回滚
- 风险极低（纯前端计数修正）。如需回滚，仅恢复为按轮 +1 的旧逻辑。