<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1cV7KQi0LLKZwc8TQfhBSD-DxKxU99e9k

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# AI Chat Frontend

本目录包含前端应用（Vite + React + TypeScript）。

## 环境准备
- Node.js ≥ 18

## 依赖安装
```bash
cd src
npm install
```

## 本地开发
1. 在 `src/.env.local` 配置：
   - `VITE_SERVER_ORIGIN=ws://localhost:3001` 指向后端 WS 地址
   - 前端 REST Base URL 默认为 `/api`（通过 Vite 代理转发到后端）
2. 启动开发服务：
```bash
npm run dev
```
- 访问 `http://localhost:5173`
- 前端将调用：
  - REST：`/api/...`（需在 Vite 代理或 Nginx 中代理到后端）
  - WebSocket：`${VITE_SERVER_ORIGIN}/ws/chat`

## 构建与部署
```bash
npm run build
npx vite build
```
会在 `dist/` 生成静态资源，可使用任意静态服务器部署（如 Nginx、Vercel、Netlify）。

### Nginx 反向代理（示例）
```nginx
server {
  listen 80;
  server_name your.domain;

  root /path/to/src/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /ws/chat {
    proxy_pass http://127.0.0.1:3001/ws/chat;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
  }
}
```

## 与后端的关键约定
- 会话创建：`POST /api/chat/sessions`，Body: `{ character_id }`（可选 `user_chat_role_id`）
- WebSocket：`${VITE_SERVER_ORIGIN}/ws/chat`
  - 发送消息：`{ sessionId, text, chatMode, userRole }`
  - 输入状态：`{ type: 'typing', sessionId, typing }`
  - 接收消息：`{ type: 'assistant_message', content, quote? }`

## 本地存储
- 每个角色的历史消息保存到 `localStorage` 键：`chat_history_{characterId}`
- 会话 ID 保存到：`chat_session_{characterId}`
- 刷新后会在列表中显示该会话的最后一条消息预览

## 常见问题
- 401 自动刷新：前端已实现 `authFetch`，当响应 401 时使用刷新令牌获取新的 `access_token` 后重试请求。
- WS 连接失败：确认 `VITE_SERVER_ORIGIN` 指向后端实际地址（开发环境一般为 `ws://localhost:3001`）。
- 引用消息显示：当同一轮用户消息触发两次及以上 LLM 时，第二次及以后回复会携带 `quote`，前端在气泡下方显示灰色圆角引用框。
