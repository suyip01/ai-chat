import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import templatesRoutes from './routes/templates.js';
import { authRequired } from './middleware/auth.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET missing');
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/admin', authRoutes);
app.use('/api/admin/templates', templatesRoutes);
app.get('/api/admin/profile', authRequired, (req, res) => {
  res.json({ id: req.admin.id, username: req.admin.username });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  process.stdout.write(`admin server ${port}\n`);
});
