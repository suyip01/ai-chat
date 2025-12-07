import { Router } from 'express';
import { userAuthRequired } from '../middleware/userAuth.js';
import pool from '../db.js';

const router = Router();
router.use(userAuthRequired);

router.get('/', async (req, res) => {
  try {
    req.log.info('userChatRole.list.start', { userId: req.user?.id })
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })
    const [rows] = await pool.query(
      'SELECT id, name, age, gender, profession, basic_info, personality, avatar FROM user_chat_role WHERE user_id = ? ORDER BY id DESC',
      [userId]
    )
    req.log.info('userChatRole.list.ok', { count: Array.isArray(rows) ? rows.length : 0 })
    res.json(rows || [])
  } catch (e) {
    req.log.error('userChatRole.list.error', { message: e?.message || String(e), stack: e?.stack })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.post('/', async (req, res) => {
  try {
    req.log.info('userChatRole.create.start', { body: { ...req.body, password: undefined } })
    const { name, age, gender, profession, basic_info, personality, avatar } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'bad_name' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const [r] = await pool.query(
      `INSERT INTO user_chat_role (user_id, name, age, gender, profession, basic_info, personality, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, age ?? null, gender ?? '未透露', profession ?? null, basic_info ?? null, personality ?? null, avatar ?? null]
    );
    req.log.info('userChatRole.create.ok', { id: r.insertId })
    res.json({ id: r.insertId });
  } catch (e) {
    req.log.error('userChatRole.create.error', { message: e?.message || String(e), stack: e?.stack, ctx: { body: req.body } })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    req.log.info('userChatRole.update.start', { id: req.params.id })
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
    req.log.info('userChatRole.update.ok', { id })
    res.json({ id })
  } catch (e) {
    req.log.error('userChatRole.update.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id: req.params.id, body: req.body } })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    req.log.info('userChatRole.delete.start', { id: req.params.id })
    const id = parseInt(req.params.id)
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })
    const [r] = await pool.query(
      'DELETE FROM user_chat_role WHERE id = ? AND user_id = ?',
      [id, userId]
    )
    if (!r.affectedRows) return res.status(404).json({ error: 'not_found' })
    try {
      const { getRedis, keyRole } = await import('../client-services/redis.js')
      const rds = await getRedis()
      await rds.del(keyRole(userId, id))
    } catch (e) {
      req.log.error('userChatRole.delete.redis.error', { message: e?.message || String(e), stack: e?.stack, ctx: { userId, id } })
    }
    req.log.info('userChatRole.delete.ok', { id })
    res.json({ id })
  } catch (e) {
    req.log.error('userChatRole.delete.error', { message: e?.message || String(e), stack: e?.stack, ctx: { id: req.params.id } })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

export default router;
