import { Router } from 'express';
import { listPublishedCharacters, getPublishedCharacter } from '../client-services/characters.js';
import { userAuthRequired } from '../middleware/userAuth.js';

const router = Router();
router.use(userAuthRequired);

router.get('/', async (req, res) => {
  try {
    const tag = (req.query.tag || '').trim() || null;
    const limit = parseInt(req.query.limit || '24');
    const items = await listPublishedCharacters({ tag, limit });
    req.log.info('characters.list', { tag, limit, count: items?.length || 0 })
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'bad_id' });
    const data = await getPublishedCharacter(id);
    req.log.info('characters.get', { id, found: !!data })
    if (!data) return res.status(404).json({ error: 'not_found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});
