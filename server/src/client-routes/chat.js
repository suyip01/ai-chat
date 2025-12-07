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
  req.log.info('chat.sessions.create.start', { character_id, user_chat_role_id, body: req.body })
  if (!character_id) return res.status(400).json({ error: 'bad_params' })
  try {
    const { sid } = await createSession({ userId, characterId: character_id, userRoleId: user_chat_role_id || null, log: req.log })
    req.log.info('chat.sessions.create.ok', { sessionId: sid })
    res.json({ sessionId: sid })
  } catch (e) {
    req.log.error('chat.sessions.create.error', { message: e?.message || String(e), stack: e?.stack, ctx: { userId, body: req.body } })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.get('/sessions/:id', async (req, res) => {
  try {
    const sid = req.params.id
    req.log.info('chat.sessions.get', { sid })
    const sess = await getSession(sid)
    if (!sess) return res.status(404).json({ error: 'not_found' })
    const { userId, characterId, userRoleId, created_at } = sess
    res.json({ session: { sid, userId, characterId, userRoleId, created_at } })
  } catch (e) {
    req.log.error('chat.sessions.get.error', { message: e?.message || String(e), stack: e?.stack, ctx: { sid: req.params.id } })
    res.status(500).json({ error: 'server_error' })
  }
})

router.get('/sessions/:id/history', async (req, res) => {
  try {
    const sid = req.params.id
    const limit = parseInt(req.query.limit || '100')
    req.log.info('chat.sessions.history', { sid, limit })
    const msgs = await getMessages(sid, limit)
    res.json({ messages: msgs })
  } catch (e) {
    req.log.error('chat.sessions.history.error', { message: e?.message || String(e), stack: e?.stack, ctx: { sid: req.params.id, query: req.query } })
    res.status(500).json({ error: 'server_error' })
  }
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

// removed: session config endpoint; model and temperature are provided per-message
