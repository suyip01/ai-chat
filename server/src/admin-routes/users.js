import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { listUsers, createUser, updateUser, deleteUser, changePassword } from '../admin-services/users.js';

const router = Router();
router.use(authRequired);

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
    const { username, email = null, password, chatLimit = 0 } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
    const id = await createUser({ username, email, password, chatLimit });
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, chatLimit, isActive } = req.body || {};
    const ok = await updateUser(id, { email, chatLimit, isActive });
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
