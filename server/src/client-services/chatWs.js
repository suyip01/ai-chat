import { WebSocketServer } from 'ws'
import { getSession } from './chatSessions.js'
import { appendUserMessage, appendAssistantMessage, getMessages } from './chatMessages.js'
import { getRedis, keySummary, keyRole } from './redis.js'
import { maybeSummarizeSession } from './chatSummary.js'
import TextGenerationService from './textGenerationService.js'

const buildSystem = async (sess, mode, roleOverride) => {
  const r = await getRedis()
  const summary = await r.get(keySummary(sess.sid))
  const parts = []
  const base = mode === 'scene' ? sess.system_prompt_scene : sess.system_prompt
  if (base) parts.push(base)
  if (summary) parts.push(`历史记忆：${summary}`)
  let role = roleOverride || null
  if (!role) role = await r.hGetAll(keyRole(sess.userId, sess.userRoleId))
  if (role && Object.keys(role).length) {
    const info = []
    info.push('### 我的角色设定如下：')
    info.push(`- 性别：${role.gender || ''}`)
    info.push(`- 年龄：${role.age || ''}`)
    info.push(`- 职业：${role.profession || ''}`)
    info.push(`- 基本信息：${role.basic_info || ''}`)
    info.push(`- 性格描述：${role.personality || ''}`)
    parts.push(info.join('\n'))
  } else {
    parts.push('### 我的角色设定如下：\n- 性别：\n- 年龄：\n- 职业：\n- 基本信息：\n- 性格描述：')
  }
  return parts.join('\n\n')
}

export const startChatWs = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws/chat' })
  console.log('[ws] startChatWs listening on /ws/chat')
  const lastTypingAt = new Map()
  const pendingJobs = new Map()
  const llmCounts = new Map()

  const scheduleGenerate = (sid, job, baseDelay = 2000) => {
    const prev = pendingJobs.get(sid)
    if (prev && prev.timer) clearTimeout(prev.timer)
    const last = lastTypingAt.get(sid) || 0
    const now = Date.now()
    const elapsed = now - last
    const wait = elapsed >= baseDelay ? 0 : (baseDelay - elapsed)
    const timer = setTimeout(async () => {
      const last2 = lastTypingAt.get(sid) || 0
      const elapsed2 = Date.now() - last2
      if (elapsed2 < baseDelay) {
        scheduleGenerate(sid, job, baseDelay)
        return
      }
      try { await job() } finally { pendingJobs.delete(sid) }
    }, wait)
    pendingJobs.set(sid, { timer, job })
  }
  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      console.log('[ws] message raw=', String(raw))
      let payload
      try { payload = JSON.parse(String(raw)) } catch { payload = null }
      if (!payload || !payload.sessionId || !payload.text) return
      const sid = payload.sessionId
      const mode = typeof payload.chatMode === 'string' ? payload.chatMode : 'daily'
      const roleOverride = payload.userRole && typeof payload.userRole === 'object' ? payload.userRole : null
      console.log('[ws] payload sid=', sid, 'mode=', mode, 'roleOverride=', !!roleOverride)
      if (payload.type === 'typing') { lastTypingAt.set(sid, Date.now()); return }
      const sess = await getSession(sid)
      if (!sess) return
      await appendUserMessage(sid, payload.text)
      llmCounts.set(sid, 0)
      const job = async () => {
        const svc = new TextGenerationService()
        const sys = await buildSystem(sess, mode, roleOverride)
        const history = await getMessages(sid, 80)
        const lastUser = [...history].reverse().find(m => m && m.role === 'user')
        const quote = lastUser ? String(lastUser.content || '') : ''
        const model = sess.model || undefined
        const temperature = Number(sess.temperature || 0.2)
        const reply = await svc.generateResponse(history, null, sys, model, temperature)
        console.log('[ws] reply len=', String(reply||'').length)
        const chunks = String(reply || '').split('\n').map(s => s.trim()).filter(s => s.length)
        const count = llmCounts.get(sid) || 0
        const includeQuote = count >= 1
        console.log('[ws] llmCount=', count, 'includeQuote=', includeQuote, 'quotePreview=', quote ? String(quote).slice(0, 30) : '')
        for (let i = 0; i < chunks.length; i++) {
          const piece = chunks[i]
          await appendAssistantMessage(sid, piece)
          const payloadOut = includeQuote ? { type: 'assistant_message', content: piece, quote } : { type: 'assistant_message', content: piece }
          ws.send(JSON.stringify(payloadOut))
          if (i < chunks.length - 1) {
            await new Promise(res => setTimeout(res, 2000))
          }
        }
        await maybeSummarizeSession(sid)
        llmCounts.set(sid, count + 1)
      }
      scheduleGenerate(sid, job)
    })
  })
  return wss
}
