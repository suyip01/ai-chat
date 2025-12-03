import { Router } from 'express'
import { userAuthRequired } from '../middleware/userAuth.js'
import { createSession, getSession } from '../client-services/chatSessions.js'
import { getMessages } from '../client-services/chatMessages.js'

const router = Router()
router.use(userAuthRequired)

router.post('/sessions', async (req, res) => {
  const userId = req.user?.id
  const { character_id, user_chat_role_id } = req.body || {}
  console.log('[POST /api/chat/sessions] userId=', userId, 'body=', { character_id, user_chat_role_id })
  if (!character_id) return res.status(400).json({ error: 'bad_params' })
  try {
    const { sid } = await createSession({ userId, characterId: character_id, userRoleId: user_chat_role_id || null })
    console.log('[POST /api/chat/sessions] created sid=', sid)
    res.json({ sessionId: sid })
  } catch (e) {
    console.error('[POST /api/chat/sessions] error:', e?.message || e)
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.get('/sessions/:id', async (req, res) => {
  const sid = req.params.id
  console.log('[GET /api/chat/sessions/:id] sid=', sid)
  const sess = await getSession(sid)
  if (!sess) return res.status(404).json({ error: 'not_found' })
  const { userId, characterId, userRoleId, created_at } = sess
  res.json({ session: { sid, userId, characterId, userRoleId, created_at } })
})

router.get('/sessions/:id/history', async (req, res) => {
  const sid = req.params.id
  console.log('[GET /api/chat/sessions/:id/history] sid=', sid, 'limit=', req.query.limit)
  const msgs = await getMessages(sid, parseInt(req.query.limit || '100'))
  res.json({ messages: msgs })
})

export default router
