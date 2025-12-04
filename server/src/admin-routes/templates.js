import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { runWithAdminContext, audit } from '../utils/audit.js';
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, copyTemplate, setDefaultTemplate } from '../admin-services/templates.js';

const router = Router();
router.use(authRequired);
router.use((req, res, next) => {
  runWithAdminContext(req.admin?.id || null, () => { audit('admin_request', { method: req.method, path: req.originalUrl }); next(); })
});

router.get('/', authRequired, async (req, res) => {
  try {
    const data = await listTemplates();
    res.json({ items: data });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/', authRequired, async (req, res) => {
  const { name, type, tags = [], content } = req.body || {};
  if (!name || !type) return res.status(400).json({ error: 'missing_fields' });
  try {
    const id = await createTemplate({ name, type, tags, content, creator: req.admin?.username || 'Admin' });
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/:id', authRequired, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type, tags = [], content } = req.body || {};
  if (!id || !name || !type) return res.status(400).json({ error: 'missing_fields' });
  try {
    await updateTemplate(id, { name, type, tags, content });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/copy', authRequired, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try {
    const newId = await copyTemplate(id);
    if (!newId) return res.status(404).json({ error: 'not_found' });
    res.json({ id: newId });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try {
    const ok = await deleteTemplate(id);
    if (!ok) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/default', authRequired, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try {
    await setDefaultTemplate(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
