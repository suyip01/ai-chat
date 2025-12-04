import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { runWithAdminContext, audit } from '../utils/audit.js';
import { getSettings, updateSettings } from '../admin-services/settings.js';

const router = Router();
router.use(authRequired);
router.use((req, res, next) => {
  runWithAdminContext(req.admin?.id || null, () => { audit('admin_request', { method: req.method, path: req.originalUrl }); next(); })
});

router.get('/', async (req, res) => {
  try { const s = await getSettings(); res.json(s); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.put('/', async (req, res) => {
  try { await updateSettings(req.body || {}); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

export default router;
