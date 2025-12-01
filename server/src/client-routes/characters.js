import { Router } from 'express';
import { listPublishedCharacters, getPublishedCharacter } from '../client-services/characters.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tag = (req.query.tag || '').trim() || null;
    const limit = parseInt(req.query.limit || '24');
    const items = await listPublishedCharacters({ tag, limit });
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
    if (!data) return res.status(404).json({ error: 'not_found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});
