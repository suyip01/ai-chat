import { Router } from 'express';
import { userAuthRequired } from '../middleware/userAuth.js';
import pool from '../db.js';

const router = Router();
router.use(userAuthRequired);

router.post('/', async (req, res) => {
  try {
    const { name, age, gender, profession, basic_info, personality, avatar } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'bad_name' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const [r] = await pool.query(
      `INSERT INTO user_chat_role (user_id, name, age, gender, profession, basic_info, personality, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, age ?? null, gender ?? '未透露', profession ?? null, basic_info ?? null, personality ?? null, avatar ?? null]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

export default router;

