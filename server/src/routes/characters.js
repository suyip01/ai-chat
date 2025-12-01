import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { listCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter, setCharacterStatus } from '../services/characters.js';

const router = Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  const q = req.query || {};
  const rawRole = q.creator_role || q.creatorRole;
  const role = rawRole === 'admin_role' || rawRole === 'user_role' ? rawRole : undefined;
  try {
    const items = await listCharacters(role);
    res.json({ items });
  }
  catch (e) {
    console.error('GET /api/admin/characters error:', e?.message || e);
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try { const data = await getCharacter(id); if (!data) return res.status(404).json({ error: 'not_found' }); res.json(data); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.gender) return res.status(400).json({ error: 'missing_fields' });
  try {
    const payload = { ...body, creator: req.admin?.username || 'Admin', creatorRole: 'admin_role' };
    const id = await createCharacter(payload);
    res.json({ id });
  }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  const body = req.body || {};
  const payload = { ...body, creator: body.creator || req.admin?.username || 'Admin', creatorRole: body.creatorRole || 'admin_role' };
  try { await updateCharacter(id, payload); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try { const ok = await deleteCharacter(id); if (!ok) return res.status(404).json({ error: 'not_found' }); res.json({ ok }); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.post('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'missing_status' });
  try { await setCharacterStatus(id, status); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

export default router;
