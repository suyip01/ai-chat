import { Router } from 'express'
import pool from '../db.js'
import { userAuthRequired } from '../middleware/userAuth.js'

const router = Router()
router.use(userAuthRequired)

router.get('/profile', async (req, res) => {
  try {
    req.log.info('userProfile.get.start', { userId: req.user.id })
    const [[row]] = await pool.query('SELECT id, username, email, nickname, avatar, used_count FROM users WHERE id=? LIMIT 1', [req.user.id])
    req.log.info('userProfile.get', { userId: req.user.id, found: !!row })
    if (!row) return res.status(404).json({ error: 'not_found' })
    res.json({ id: row.id, username: row.username, email: row.email, nickname: row.nickname || '', avatar: row.avatar || '', used_count: typeof row.used_count === 'number' ? row.used_count : 0 })
  } catch (e) {
    req.log.error('userProfile.get.error', { message: e?.message || String(e), stack: e?.stack })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.put('/profile', async (req, res) => {
  try {
    const { avatar, nickname } = req.body || {}
    req.log.info('userProfile.update.start', { fields: Object.keys(req.body || {}) })
    const fields = []
    const params = []
    if (typeof avatar === 'string') { fields.push('avatar=?'); params.push(avatar) }
    if (typeof nickname === 'string') { fields.push('nickname=?'); params.push(nickname) }
    if (!fields.length) return res.status(400).json({ error: 'nothing_to_update' })
    params.push(req.user.id)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, params)

    // Sync nickname to characters and stories
    if (typeof nickname === 'string') {
      req.log.info('userProfile.update.sync_nickname', { userId: req.user.id, nickname })
      await pool.query('UPDATE characters SET creator=? WHERE user_id=? AND creator_role=?', [nickname, req.user.id, 'user_role'])
      await pool.query('UPDATE stories SET author=? WHERE user_id=?', [nickname, req.user.id])
    }

    req.log.info('userProfile.update.ok', { userId: req.user.id, fields })
    res.json({ ok: true })
  } catch (e) {
    req.log.error('userProfile.update.error', { message: e?.message || String(e), stack: e?.stack, ctx: { body: req.body } })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

export default router
