import { Router } from 'express';
import { userAuthRequired } from '../middleware/userAuth.js';
import pool from '../db.js';

const router = Router();
router.use(userAuthRequired);

router.post('/', async (req, res) => {
  try {
    console.log('[POST /api/user/chat-role] body=', req.body, 'userId=', req.user?.id)
    const { name, age, gender, profession, basic_info, personality, avatar } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'bad_name' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const [r] = await pool.query(
      `INSERT INTO user_chat_role (user_id, name, age, gender, profession, basic_info, personality, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, age ?? null, gender ?? '未透露', profession ?? null, basic_info ?? null, personality ?? null, avatar ?? null]
    );
    console.log('[POST /api/user/chat-role] created id=', r.insertId)
    res.json({ id: r.insertId });
  } catch (e) {
    console.error('[POST /api/user/chat-role] error:', e?.message || e)
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('[PUT /api/user/chat-role/:id] id=', req.params.id, 'body=', req.body, 'userId=', req.user?.id)
    const id = parseInt(req.params.id)
    const { name, age, gender, profession, basic_info, personality, avatar } = req.body || {}
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })
    const [r] = await pool.query(
      `UPDATE user_chat_role SET name = ?, age = ?, gender = ?, profession = ?, basic_info = ?, personality = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [name ?? null, age ?? null, gender ?? '未透露', profession ?? null, basic_info ?? null, personality ?? null, avatar ?? null, id, userId]
    )
    if (!r.affectedRows) return res.status(404).json({ error: 'not_found' })
    const { getRedis, keyRole } = await import('../client-services/redis.js')
    const rds = await getRedis()
    await rds.hSet(keyRole(userId, id), {
      id: String(id),
      name: name || '',
      age: String(age ?? ''),
      gender: gender || '未透露',
      profession: profession || '',
      basic_info: basic_info || '',
      personality: personality || '',
      avatar: avatar || '',
      updated_at: String(Date.now())
    })
    console.log('[PUT /api/user/chat-role/:id] updated id=', id)
    res.json({ id })
  } catch (e) {
    console.error('[PUT /api/user/chat-role/:id] error:', e?.message || e)
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

export default router;
