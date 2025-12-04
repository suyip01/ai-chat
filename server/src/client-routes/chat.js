import { Router } from 'express'
import { userAuthRequired } from '../middleware/userAuth.js'
import { createSession, getSession } from '../client-services/chatSessions.js'
import { getMessages } from '../client-services/chatMessages.js'
import pool from '../db.js'

const router = Router()
router.use(userAuthRequired)

router.post('/sessions', async (req, res) => {
  const userId = req.user?.id
  const { character_id, user_chat_role_id } = req.body || {}
  req.log.info('chat.sessions.create.start', { character_id, user_chat_role_id })
  if (!character_id) return res.status(400).json({ error: 'bad_params' })
  try {
    const { sid } = await createSession({ userId, characterId: character_id, userRoleId: user_chat_role_id || null, log: req.log })
    const sess = await getSession(sid)
    req.log.info('chat.sessions.create.ok', { sessionId: sid })
    res.json({ sessionId: sid, model: { id: sess.model_id || sess.model || '', nickname: sess.model_nickname || '' }, temperature: Number(sess.temperature || 0.1) })
  } catch (e) {
    req.log.error('chat.sessions.create.error', { error: e?.message || e })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.get('/sessions/:id', async (req, res) => {
  const sid = req.params.id
  req.log.info('chat.sessions.get', { sid })
  const sess = await getSession(sid)
  if (!sess) return res.status(404).json({ error: 'not_found' })
  const { userId, characterId, userRoleId, created_at, model_id, model_nickname, temperature } = sess
  res.json({ session: { sid, userId, characterId, userRoleId, created_at, model: { id: model_id || sess.model || '', nickname: model_nickname || '' }, temperature: Number(temperature || 0.1) } })
})

router.get('/sessions/:id/history', async (req, res) => {
  const sid = req.params.id
  req.log.info('chat.sessions.history', { sid, limit: req.query.limit })
  const msgs = await getMessages(sid, parseInt(req.query.limit || '100'))
  res.json({ messages: msgs })
})

export default router
router.get('/models', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT model_id AS id, COALESCE(model_nickname, model_name, model_id) AS nickname FROM models ORDER BY created_at DESC')
    res.json({ items: Array.isArray(rows) ? rows : [] })
  } catch (e) {
    req.log.error('chat.models.list.error', { error: e?.message || e })
    res.status(500).json({ error: 'server_error' })
  }
})

router.put('/sessions/:id/config', async (req, res) => {
  const sid = req.params.id
  const { model_id, temperature } = req.body || {}
  try {
    const [[valid]] = model_id ? await pool.query('SELECT model_id FROM models WHERE model_id=? OR model_name=? OR model_nickname=? LIMIT 1', [model_id, model_id, model_id]) : [[{ model_id: null }]]
    const r = await (await import('../client-services/redis.js')).getRedis()
    const key = (await import('../client-services/redis.js')).keySess(sid)
    if (model_id && !valid?.model_id) return res.status(400).json({ error: 'bad_model' })
    if (model_id) await r.hSet(key, { model: String(valid.model_id), model_id: String(valid.model_id) })
    if (temperature !== undefined) await r.hSet(key, { temperature: String(Number(temperature)) })
    req.log.info('chat.sessions.config.ok', { sid, model_id: valid?.model_id || undefined, temperature: temperature !== undefined ? Number(temperature) : undefined })
    res.json({ ok: true })
  } catch (e) {
    req.log.error('chat.sessions.config.error', { error: e?.message || e })
    res.status(500).json({ error: 'server_error' })
  }
})
