import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './admin-routes/auth.js';
import clientAuthRoutes from './client-routes/auth.js';
import clientCharactersRoutes from './client-routes/characters.js';
import clientUploadsRoutes from './client-routes/uploads.js';
import userChatRoleRoutes from './client-routes/userChatRole.js';
import clientChatRoutes from './client-routes/chat.js';
import templatesRoutes from './admin-routes/templates.js';
import charactersRoutes from './admin-routes/characters.js';
import modelsRoutes from './admin-routes/models.js';
import settingsRoutes from './admin-routes/settings.js';
import syspromptRoutes from './admin-routes/sysprompt.js';
import uploadsRoutes from './admin-routes/uploads.js';
import usersRoutes from './admin-routes/users.js';
import adminsRoutes from './admin-routes/admins.js';
import path from 'path';
import http from 'http';
import { startChatWs } from './client-services/chatWs.js';
import { authRequired } from './middleware/auth.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET missing');
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', clientAuthRoutes);
app.use('/api/characters', clientCharactersRoutes);
app.use('/api/uploads', clientUploadsRoutes);
app.use('/api/user/chat-role', userChatRoleRoutes);
app.use('/api/chat', clientChatRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin/templates', templatesRoutes);
app.use('/api/admin/characters', charactersRoutes);
app.use('/api/admin/models', modelsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/sysprompt', syspromptRoutes);
app.use('/api/admin/uploads', uploadsRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/admins', adminsRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));
app.get('/api/admin/profile', authRequired, (req, res) => {
  res.json({ id: req.admin.id, username: req.admin.username });
});

const port = process.env.PORT || 3001;
const start = async () => {
  const server = http.createServer(app);
  startChatWs(server);
  server.listen(port, () => {
    process.stdout.write(`server start ${port}\n`);
  });
};
start();
