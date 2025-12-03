Setup

1. Create database: ai_chat
2. Import schema: sql/init_admin.sql
3. Copy .env.example to .env and set JWT_SECRET; configure ACCESS_EXPIRES=30m, REFRESH_EXPIRES=7d, PORT=3001
4. Install deps: npm --prefix server install
5. Start: npm --prefix server run dev

Auth

POST /api/admin/login { username, password } → returns access_token (30m) + refresh_token (7d)
POST /api/admin/refresh { refresh_token } → returns new access_token + refresh_token
Authorization: Bearer <token>
# AI Chat Server

本目录包含后端服务（Express + WebSocket）与会话/消息缓存（Redis）以及大模型调用（OpenAI 兼容接口）。

## 环境准备
- Node.js ≥ 18
- MySQL ≥ 8（用于用户、角色、系统提示词等）
- Redis ≥ 6（用于会话、消息、总结缓存）
- 可用的大模型服务（OpenAI 兼容或厂商网关：模型、Base URL、API Key）

## 依赖安装
```bash
cd server
npm install
```

## 配置环境变量
在 `server/.env` 中配置（参考 `.env.example`）：
- `PORT=3001` 后端端口
- `JWT_SECRET=...` 令牌签名密钥
- 数据库：`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`
- Redis：
  - 推荐 `REDIS_URL=redis://127.0.0.1:6379`
  - 或使用 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`
- 大模型：
  - `LLM_API_KEY` 或 `OPENAI_API_KEY`
  - `LLM_BASE_URL` 或 `OPENAI_BASE_URL`
  - `LLM_MODEL`（例如 ByteDance/doubao-seed-1.6-thinking、deepseek-ai/DeepSeek-V3-0324）
- 其他：
  - `CHAT_SESSION_TTL=604800` 会话 TTL（秒）
  - `CHAT_SUMMARY_ROUNDS=30` 总结触发轮次阈值

## 初始化数据库
创建数据库并执行项目根目录的 SQL 初始化脚本（根据你的环境调整）：
```sql
-- 进入 MySQL 后执行
SOURCE /path/to/sql/init_admin.sql;
```

## 开发启动
```bash
npm run dev
```
- HTTP API 默认监听 `http://localhost:3001`
- WebSocket 路径：`/ws/chat`

## 核心端点
- 认证：
  - `POST /api/auth/login` 登录（返回 access_token 与 refresh_token）
  - `POST /api/auth/refresh` 刷新访问令牌
- 角色（对前端可见的客户端接口）：
  - `GET /api/characters` 列表
  - `GET /api/characters/:id` 详情
  - `POST /api/user/chat-role` 创建自定义用户角色
  - `PUT /api/user/chat-role/:id` 更新自定义用户角色
- 会话：
  - `POST /api/chat/sessions` 创建会话（Body: `character_id`，可选 `user_chat_role_id`）
  - `GET /api/chat/sessions/:id` 查询会话信息
  - `GET /api/chat/sessions/:id/history?limit=N` 拉取历史（短期不做持久化时可忽略）
- WebSocket：`ws://<host>:3001/ws/chat`
  - 客户端消息格式：
    ```json
    { "sessionId": "sid", "text": "...", "chatMode": "daily|scene", "userRole": { ... } }
    ```
  - 输入状态（防抖）：
    ```json
    { "type": "typing", "sessionId": "sid", "typing": true|false }
    ```

## 生产部署
### 使用 PM2
```bash
npm i -g pm2
pm2 start src/index.js --name ai-chat-server
pm2 save
```

### 使用 Nginx 反向代理（示例）
```nginx
server {
  listen 80;
  server_name your.domain;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # WebSocket 路径
  location /ws/chat {
    proxy_pass http://127.0.0.1:3001/ws/chat;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
  }
}
```

## 常见问题
- 前端 WS 连接到开发端口（Vite 5173）而非后端：请在前端 `.env.local` 设置 `VITE_SERVER_ORIGIN=ws://localhost:3001`。
- 模型参数不一致：确认 `settings` 表的 `selected_chat_model` 与 `chat_temperature`，以及 `.env` 中的默认模型；会话创建时缓存到 Redis。
- 重启后自动重连：前端已实现 WS 自动重连与消息队列，后端重启后会话可恢复。

