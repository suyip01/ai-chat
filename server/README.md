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

