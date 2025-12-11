import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { runWithAdminContext, audit } from '../utils/audit.js';
import { listUsers, createUser, updateUser, deleteUser, changePassword, startAutoDeactivate } from '../admin-services/users.js';

const router = Router();
router.use(authRequired);
router.use((req, res, next) => {
  runWithAdminContext(req.admin?.id || null, () => { audit('admin_request', { method: req.method, path: req.originalUrl }); next(); })
});

// 启动自动禁用过期测试用户的后台任务
startAutoDeactivate();

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const rows = await listUsers(q || null);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, nickname = null, avatar = null, email = null, password, chatLimit = 0, expireAfterMinutes = null } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
    const id = await createUser({ username, nickname, avatar, email, password, chatLimit, expireAfterMinutes });
    res.json({ id });
  } catch (e) {
    if (e && e.message === 'duplicate_username') return res.status(409).json({ error: 'duplicate_username' });
    if (e && e.message === 'db_error') return res.status(500).json({ error: 'db_error', message: e?.message || '' });
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nickname, avatar, email, chatLimit, isActive, expireAfterMinutes, resetFirstLogin } = req.body || {};
    const ok = await updateUser(id, { nickname, avatar, email, chatLimit, isActive, expireAfterMinutes, resetFirstLogin });
    if (!ok) return res.status(400).json({ error: 'no_fields' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await deleteUser(id);
    res.json({ ok });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/password', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'missing_password' });
    const ok = await changePassword(id, password);
    res.json({ ok });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
