import jwt from 'jsonwebtoken';
import pool from '../db.js'
import { getRedis } from '../client-services/redis.js'

export const userAuthRequired = async (req, res, next) => {
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!t) return res.status(401).json({ error: 'unauthorized' })
  try {
    const payload = jwt.verify(t, process.env.JWT_SECRET)
    if (payload.type !== 'access') return res.status(401).json({ error: 'invalid_token_type' })
    req.user = { id: payload.id, username: payload.username }
    if (req.log) req.log = req.log.child({ userId: req.user.id })
    try {
      const r = await getRedis()
      const key = `user:active:${req.user.id}`
      let act = await r.get(key)
      if (act === null) {
        const [[u]] = await pool.query('SELECT is_active FROM users WHERE id=?', [req.user.id])
        act = u && u.is_active === 1 ? '1' : '0'
        await r.set(key, act, { EX: 60 })
      }
      if (act !== '1') return res.status(401).json({ error: 'account_disabled' })
    } catch {}
    next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}
