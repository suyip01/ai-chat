import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { listModels, createModel, removeModel } from '../services/models.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  try { const items = await listModels(); res.json({ items }); }
  catch { res.status(500).json({ error: 'server_error' }); }
});

router.post('/', async (req, res) => {
  const { model_id, model_name, model_nickname } = req.body || {};
  if (!model_id || !model_name) return res.status(400).json({ error: 'missing_fields' });
  try {
    const id = await createModel({ model_id, model_name, model_nickname });
    res.json({ id });
  } catch (e) {
    if (String(e?.code).toUpperCase() === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'duplicate_model_id' });
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'bad_id' });
  try {
    const ok = await removeModel(id);
    if (!ok) return res.status(404).json({ error: 'not_found' });
    res.json({ ok });
  } catch { res.status(500).json({ error: 'server_error' }); }
});

export default router;

