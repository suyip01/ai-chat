## 目标
- WS 每个分片都即时写入 IndexedDB 并渲染（不合并）。
- 聊天页面打开时：用户消息与 AI 分片消息都即时写入 IndexedDB，同时发往服务端。
- 关闭后重新打开聊天页面时才从 IndexedDB 读取历史。
- 未读计数按分片数量累加：来多少分片，就 +多少。

## 改动点
- `src/user/pages/ChatDetail.tsx`
  - 将 `appendAssistantWithRead` 改为：每到一个分片就“新增一条消息 + 立即 dbAddMessage（saved=true）”；保留将上一条用户消息标记已读的逻辑。
  - 删除组件卸载时批量写入未保存消息的逻辑，避免重复与合并副作用。
  - 用户消息即时写入 IndexedDB 与发往服务端保持不变。
- `src/user/App.tsx`
  - 后台 WS 订阅处理：每个分片都 `unreadCount = unreadCount + 1`（去掉仅最终分片 +1 的判断），并继续即时写入分片到 IndexedDB 与更新预览。
- `src/user/services/sharedChatWs.ts`
  - 保持现有分片传递接口，不引入 `fullText`；各处以分片作为独立消息处理。

## 涉及文件
- `src/user/pages/ChatDetail.tsx`
- `src/user/App.tsx`
- 复用：`src/user/services/sharedChatWs.ts`、`src/user/services/chatDb.ts`、`src/user/services/chatEvents.ts`

## 验证
- 打开聊天页面时：
  - 用户消息与每个 AI 分片都立即出现在 IndexedDB 与页面。
- 聊天页面关闭时：
  - WS 背景订阅每个分片都使列表该会话的未读计数 +1，预览显示最后一个分片文本。
- 重新进入聊天页面：
  - 初始渲染来自 IndexedDB 历史；实时分片仍持续追加，无重复或合并。