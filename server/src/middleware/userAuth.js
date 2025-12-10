import jwt from 'jsonwebtoken';
import pool from '../db.js'
import { getRedis } from '../client-services/redis.js'

export const verifyAccessActive = async (t) => {
  const payload = jwt.verify(t, process.env.JWT_SECRET)
  if (payload.type !== 'access') throw new Error('invalid_token_type')
  const user = { id: payload.id, username: payload.username }
  const r = await getRedis()
  const key = `user:active:${user.id}`
  let act = await r.get(key)
  if (act === null) {
    const [[u]] = await pool.query('SELECT is_active FROM users WHERE id=?', [user.id])
    act = u && u.is_active === 1 ? '1' : '0'
    await r.set(key, act, { EX: 600 })
  }
  if (act !== '1') throw new Error('account_disabled')
  return user
}

export const userAuthRequired = async (req, res, next) => {
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!t) return res.status(401).json({ error: 'unauthorized' })
  try {
    const user = await verifyAccessActive(t)
    req.user = user
    if (req.log) req.log = req.log.child({ userId: req.user.id })
    next()
  } catch (e) {
    const m = e?.message || ''
    if (m === 'account_disabled' || m === 'invalid_token_type') return res.status(401).json({ error: m })
    return res.status(401).json({ error: 'invalid_token' })
  }
}
