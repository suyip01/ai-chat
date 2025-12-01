import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import templatesRoutes from './routes/templates.js';
import charactersRoutes from './routes/characters.js';
import modelsRoutes from './routes/models.js';
import settingsRoutes from './routes/settings.js';
import syspromptRoutes from './routes/sysprompt.js';
import uploadsRoutes from './routes/uploads.js';
import usersRoutes from './routes/users.js';
import path from 'path';
import { authRequired } from './middleware/auth.js';
import { ensureCharacterSchema } from './services/characters.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET missing');
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/admin', authRoutes);
app.use('/api/admin/templates', templatesRoutes);
app.use('/api/admin/characters', charactersRoutes);
app.use('/api/admin/models', modelsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/sysprompt', syspromptRoutes);
app.use('/api/admin/uploads', uploadsRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));
app.get('/api/admin/profile', authRequired, (req, res) => {
  res.json({ id: req.admin.id, username: req.admin.username });
});

const port = process.env.PORT || 3001;
const start = async () => {
  await ensureCharacterSchema();
  app.listen(port, () => {
    process.stdout.write(`admin server ${port}\n`);
  });
};
start();
