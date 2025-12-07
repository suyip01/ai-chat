import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { runWithAdminContext, audit } from '../utils/audit.js';
import { listCharacters, getCharacter, createCharacter, updateCharacter, updateCharacterPreserveOwner, deleteCharacter, setCharacterStatus } from '../admin-services/characters.js';

const router = Router();

router.use(authRequired);
router.use((req, res, next) => {
  runWithAdminContext(req.admin?.id || null, () => { audit('admin_request', { method: req.method, path: req.originalUrl }); next(); })
});

router.get('/', async (req, res) => {
  const q = req.query || {};
  const rawRole = q.creator_role || q.creatorRole;
  const role = rawRole === 'admin_role' || rawRole === 'user_role' ? rawRole : undefined;
  try {
    req.log.info('admin.characters.list.start', { role, query: req.query })
    const items = await listCharacters(role);
    req.log.info('admin.characters.list.ok', { count: Array.isArray(items) ? items.length : 0 })
    res.json({ items });
  }
  catch (e) {
    req.log.error('admin.characters.list.error', { message: e?.message || String(e), stack: e?.stack, ctx: { query: req.query } });
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try { 
    req.log.info('admin.characters.get.start', { id })
    const data = await getCharacter(id); if (!data) return res.status(404).json({ error: 'not_found' });
    req.log.info('admin.characters.get.ok', { id })
    res.json(data); 
  }
  catch (e) { 
    req.log.error('admin.characters.get.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id: req.params.id } })
    res.status(500).json({ error: 'server_error' }); 
  }
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.gender) return res.status(400).json({ error: 'missing_fields' });
  try {
    const payload = { ...body, creator: req.admin?.username || 'Admin', creatorRole: 'admin_role' };
    req.log.info('admin.characters.create.start', { payloadFields: Object.keys(payload || {}) })
    const id = await createCharacter(payload);
    req.log.info('admin.characters.create.ok', { id })
    res.json({ id });
  }
  catch (e) {
    req.log.error('admin.characters.create.error', { message: e?.message || String(e), stack: e?.stack, ctx: { body: req.body } });
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  const body = req.body || {};
  try {
    const existing = await getCharacter(id);
    if (!existing) return res.status(404).json({ error: 'not_found' });
    if (existing.creator_role === 'user_role') {
      const payload = { ...body };
      delete payload.creator;
      delete payload.creatorRole;
      delete payload.user_id;
      req.log.info('admin.characters.update.preserve.start', { id })
      await updateCharacterPreserveOwner(id, payload);
      req.log.info('admin.characters.update.preserve.ok', { id })
    } else {
      const payload = { ...body, creator: body.creator || req.admin?.username || 'Admin', creatorRole: body.creatorRole || 'admin_role' };
      req.log.info('admin.characters.update.start', { id })
      await updateCharacter(id, payload);
      req.log.info('admin.characters.update.ok', { id })
    }
    res.json({ ok: true });
  }
  catch (e) { req.log.error('admin.characters.update.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id, body: req.body } }); res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' }); }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try { const ok = await deleteCharacter(id); if (!ok) return res.status(404).json({ error: 'not_found' }); res.json({ ok }); }
  catch (e) { req.log.error('admin.characters.delete.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id } }); res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' }); }
});

router.post('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'missing_status' });
  try { req.log.info('admin.characters.status.start', { id, status }); await setCharacterStatus(id, status); req.log.info('admin.characters.status.ok', { id, status }); res.json({ ok: true }); }
  catch (e) { req.log.error('admin.characters.status.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id, status } }); res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' }); }
});

export default router;
