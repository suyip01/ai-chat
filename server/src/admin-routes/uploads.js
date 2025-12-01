import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authRequired);

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'missing_file' });
    const isImage = /^image\/(jpeg|jpg)$/.test(file.mimetype);
    if (!isImage) return res.status(400).json({ error: 'invalid_type' });
    const ext = 'jpg';
    const dir = path.join(process.cwd(), 'server', 'uploads', 'avatars');
    await fs.promises.mkdir(dir, { recursive: true });
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(dir, name);
    await fs.promises.writeFile(filePath, file.buffer);
    const urlPath = `/uploads/avatars/${name}`;
    res.json({ url: urlPath });
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

export default router;
