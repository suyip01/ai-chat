import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin, changeAdminPassword } from '../admin-services/admins.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const rows = await listAdmins(q || null);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, email = null, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
    const id = await createAdmin({ username, email, password });
    res.json({ id });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, isActive } = req.body || {};
    const ok = await updateAdmin(id, { email, isActive });
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

