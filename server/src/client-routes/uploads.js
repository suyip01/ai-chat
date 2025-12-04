import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { userAuthRequired } from '../middleware/userAuth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(userAuthRequired);

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    req.log.info('uploads.avatar.start', { filename: req.body?.filename })
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'missing_file' });
    const isImage = /^image\/(jpeg|jpg|png)$/.test(file.mimetype);
    if (!isImage) return res.status(400).json({ error: 'invalid_type' });
    const ext = 'jpg';
    const dir = path.join(process.cwd(), 'server', 'uploads', 'users', 'avatars');
    await fs.promises.mkdir(dir, { recursive: true });
    let name = req.body?.filename;
    if (typeof name !== 'string' || !name.length) {
      name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    }
    name = name.replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!name.endsWith('.jpg')) name = `${name}.${ext}`;
    const filePath = path.join(dir, name);
    await fs.promises.writeFile(filePath, file.buffer);
    const urlPath = `/uploads/users/avatars/${name}`;
    req.log.info('uploads.avatar.ok', { url: urlPath })
    res.json({ url: urlPath });
  } catch (e) {
    req.log.error('uploads.avatar.error', { error: e?.message || e })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

export default router;
