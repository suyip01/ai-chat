import { Router } from 'express'
import pool from '../db.js'
import { userAuthRequired } from '../middleware/userAuth.js'

const router = Router()
router.use(userAuthRequired)

router.get('/profile', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT id, username, email, nickname, avatar, used_count FROM users WHERE id=? LIMIT 1', [req.user.id])
    if (!row) return res.status(404).json({ error: 'not_found' })
    res.json({ id: row.id, username: row.username, email: row.email, nickname: row.nickname || '', avatar: row.avatar || '', used_count: typeof row.used_count === 'number' ? row.used_count : 0 })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.put('/profile', async (req, res) => {
  try {
    const { avatar, nickname } = req.body || {}
    const fields = []
    const params = []
    if (typeof avatar === 'string') { fields.push('avatar=?'); params.push(avatar) }
    if (typeof nickname === 'string') { fields.push('nickname=?'); params.push(nickname) }
    if (!fields.length) return res.status(400).json({ error: 'nothing_to_update' })
    params.push(req.user.id)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, params)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

export default router
