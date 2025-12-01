import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../services/settings.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  try { const s = await getSettings(); res.json(s); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.put('/', async (req, res) => {
  try { await updateSettings(req.body || {}); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

export default router;

