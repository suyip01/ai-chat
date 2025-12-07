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
    req.log.info('admins.list.start', { q })
    const rows = await listAdmins(q || null);
    req.log.info('admins.list.ok', { count: Array.isArray(rows) ? rows.length : 0 })
    res.json(rows);
  } catch (e) {
    req.log.error('admins.list.error', { message: e?.message || String(e), stack: e?.stack, ctx: { query: req.query } });
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/me/avatar', async (req, res) => {
  try {
    const id = req.admin?.id;
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    req.log.info('admins.me.avatar.start', { adminId: id })
    const avatar = await getAdminAvatar(id);
    req.log.info('admins.me.avatar.ok', { adminId: id })
    res.json({ avatar });
  } catch (e) {
    req.log.error('admins.me.avatar.error', { message: e?.message || String(e), stack: e?.stack })
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const id = req.admin?.id;
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    const { nickname, password } = req.body || {};
    req.log.info('admins.me.update.start', { adminId: id, fields: Object.keys(req.body || {}) })
    const ok = await updateAdminSelf(id, { nickname, password });
    if (!ok) return res.status(400).json({ error: 'no_fields' });
    req.log.info('admins.me.update.ok', { adminId: id })
    res.json({ ok: true });
  } catch (e) {
    req.log.error('admins.me.update.error', { message: e?.message || String(e), stack: e?.stack, ctx: { body: req.body } })
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, nickname = null, avatar = null, email = null, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
    req.log.info('admins.create.start', { username })
    const id = await createAdmin({ username, nickname, avatar, email, password });
    req.log.info('admins.create.ok', { id })
    res.json({ id });
  } catch (e) {
    req.log.error('admins.create.error', { message: e?.message || String(e), stack: e?.stack, ctx: { body: req.body } })
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nickname, avatar, email, isActive } = req.body || {};
    req.log.info('admins.update.start', { id })
    const ok = await updateAdmin(id, { nickname, avatar, email, isActive });
    if (!ok) return res.status(400).json({ error: 'no_fields' });
    req.log.info('admins.update.ok', { id })
    res.json({ ok: true });
  } catch (e) {
    req.log.error('admins.update.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id: req.params.id, body: req.body } })
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    req.log.info('admins.delete.start', { id })
    const ok = await deleteAdmin(id);
    req.log.info('admins.delete.ok', { id, ok })
    res.json({ ok });
  } catch (e) {
    req.log.error('admins.delete.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id: req.params.id } })
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/password', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'missing_password' });
    req.log.info('admins.password.start', { id })
    const ok = await changeAdminPassword(id, password);
    req.log.info('admins.password.ok', { id, ok })
    res.json({ ok });
  } catch (e) {
    req.log.error('admins.password.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id: req.params.id } })
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
