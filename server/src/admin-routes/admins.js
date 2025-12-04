import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { runWithAdminContext, audit } from '../utils/audit.js';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin, changeAdminPassword, getAdminAvatar, updateAdminSelf } from '../admin-services/admins.js';

const router = Router();
router.use(authRequired);
router.use((req, res, next) => {
  runWithAdminContext(req.admin?.id || null, () => { audit('admin_request', { method: req.method, path: req.originalUrl }); next(); })
});

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const rows = await listAdmins(q || null);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/me/avatar', async (req, res) => {
  try {
    const id = req.admin?.id;
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    const avatar = await getAdminAvatar(id);
    res.json({ avatar });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const id = req.admin?.id;
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    const { nickname, password } = req.body || {};
    const ok = await updateAdminSelf(id, { nickname, password });
    if (!ok) return res.status(400).json({ error: 'no_fields' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, nickname = null, avatar = null, email = null, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
    const id = await createAdmin({ username, nickname, avatar, email, password });
    res.json({ id });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nickname, avatar, email, isActive } = req.body || {};
    const ok = await updateAdmin(id, { nickname, avatar, email, isActive });
    if (!ok) return res.status(400).json({ error: 'no_fields' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await deleteAdmin(id);
    res.json({ ok });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/password', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'missing_password' });
    const ok = await changeAdminPassword(id, password);
    res.json({ ok });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
