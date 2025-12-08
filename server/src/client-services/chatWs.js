import { WebSocketServer } from 'ws'
import pool from '../db.js'
import { getSession } from './chatSessions.js'
import { appendUserMessage, appendAssistantMessage, getMessages } from './chatMessages.js'
import { getRedis, keySummary, keyRole, keyCharacter } from './redis.js'
import { maybeSummarizeSession } from './chatSummary.js'
import TextGenerationService from './textGenerationService.js'
import { createLogger } from '../utils/logger.js'

const buildSystem = async (sess, mode, roleOverride) => {
  const wlog = createLogger({ component: 'ws' })
  try {
    const r = await getRedis()
    const summary = await r.get(keySummary(sess.sid))
    const parts = []
    let charPrompt = null
    try {
      const ck = keyCharacter(sess.characterId)
      const updatedAt = await r.hGet(ck, 'updated_at')
      const sessCreated = Number(sess.created_at || 0)
      if (updatedAt && Number(updatedAt) > sessCreated) {
        const fields = await r.hmGet(ck, 'system_prompt', 'system_prompt_scene')
        charPrompt = mode === 'scene' ? (fields?.[1] || '') : (fields?.[0] || '')
      }
    } catch {}
    const base = mode === 'scene' ? (charPrompt || sess.system_prompt_scene) : (charPrompt || sess.system_prompt)
    if (base) parts.push(base)
    if (summary) parts.push(`历史记忆：${summary}`)
    let role = roleOverride || null
    if (!role) role = await r.hGetAll(keyRole(sess.userId, sess.userRoleId))
    if (role && Object.keys(role).length) {
      const info = []
      info.push('### 用户个人资料如下：')
      info.push(`- 名字：${role.name || ''}`)
      info.push(`- 性别：${role.gender || ''}`)
      info.push(`- 年龄：${role.age || ''}`)
      info.push(`- 职业：${role.profession || ''}`)
      info.push(`- 基本信息：${role.basic_info || ''}`)
      info.push(`- 性格描述：${role.personality || ''}`)
      parts.push(info.join('\n'))
    } else {
      parts.push('### 我的角色设定如下：\n- 名字：\n- 性别：\n- 年龄：\n- 职业：\n- 基本信息：\n- 性格描述：')
    }
    const sys = parts.join('\n\n')
    wlog.debug('buildSystem.ok', { sid: sess.sid, sysLen: String(sys).length })
    return sys
  } catch (e) {
    wlog.error('buildSystem.error', { sid: sess.sid, message: e?.message || String(e), stack: e?.stack })
    return ''
  }
}

export const startChatWs = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws/chat' })
  createLogger({ component: 'ws' }).info('startChatWs', { path: '/ws/chat' })
  const lastTypingAt = new Map()
  const pendingJobs = new Map()
  const llmCounts = new Map()
  const wsBySid = new Map()

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
      const wlog = createLogger({ component: 'ws' })
      wlog.debug('message', { rawPreview: String(raw).slice(0, 60) })
      let payload
      try { payload = JSON.parse(String(raw)) } catch { payload = null }
      if (!payload || !payload.sessionId) return
      const sid = payload.sessionId
      wsBySid.set(sid, ws)
      const mode = typeof payload.chatMode === 'string' ? payload.chatMode : 'daily'
      const roleOverride = payload.userRole && typeof payload.userRole === 'object' ? payload.userRole : null
      wlog.info('payload', { sid, mode, roleOverride: !!roleOverride })
      if (payload.type === 'typing') { lastTypingAt.set(sid, Date.now()); return }
      if (!payload.text) return
      const sess = await getSession(sid)
      if (!sess) return
      wlog.info('user.message', { userId: sess.userId, sid, textLen: String(payload.text).length, textPreview: String(payload.text).slice(0, 100) })
      await appendUserMessage(sid, payload.text)
      llmCounts.set(sid, 0)
      const job = async () => {
        const svc = new TextGenerationService()
        const sys = await buildSystem(sess, mode, roleOverride)
        const history = await getMessages(sid, 80)
        wlog.info('llm.start', {
          userId: sess.userId,
          sid,
          mode,
          historyCount: Array.isArray(history) ? history.length : 0,
          sysLen: String(sys || '').length,
          sysPreview: String(sys || '').slice(0, 160)
        })
        const lastUser = [...history].reverse().find(m => m && m.role === 'user')
        const quote = lastUser ? String(lastUser.content || '') : ''
        const modelOverride = typeof payload.model_id === 'string' ? payload.model_id : undefined
        const tempOverride = payload.temperature !== undefined ? Number(payload.temperature) : undefined
        const model = modelOverride || sess.model || sess.model_id || undefined
        const temperature = tempOverride !== undefined ? tempOverride : Number(sess.temperature || 0.2)
        let reply
        let t0
        let durMs
        try {
          t0 = process.hrtime.bigint()
          reply = await svc.generateResponse(history, null, sys, model, temperature, { sid, userId: sess.userId })
          durMs = Number(process.hrtime.bigint() - t0) / 1e6
        } catch (e) {
          durMs = t0 ? Number(process.hrtime.bigint() - t0) / 1e6 : undefined
          wlog.error('llm.error', { userId: sess.userId, sid, error: e?.message || e, duration_ms: durMs !== undefined ? Math.round(durMs) : undefined })
          reply = ''
        }
        wlog.info('llm.done', { userId: sess.userId, sid, model, temperature, duration_ms: durMs !== undefined ? Math.round(durMs) : undefined, rawLen: String(reply || '').length, rawPreview: String(reply || '').slice(0, 160) })
        const content = mode === 'daily' ? String(reply || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '') : String(reply || '')
        wlog.info('reply.len', { userId: sess.userId, sid, len: String(content).length })
        const chunks = content.split('\n').map(s => s.trim()).filter(s => s.length)
        const count = llmCounts.get(sid) || 0
        const includeQuote = (count >= 1) || ((svc.lastAttempts || 1) > 1)
        wlog.info('llm.count', { userId: sess.userId, sid, count, includeQuote, quotePreview: quote ? String(quote).slice(0, 30) : '' })
        wlog.info('reply.chunks', { userId: sess.userId, sid, total: chunks.length, chunkPreviews: chunks.slice(0, 5).map(c => String(c).slice(0, 80)) })
        for (let i = 0; i < chunks.length; i++) {
          const piece = chunks[i]
          await appendAssistantMessage(sid, piece)
          const withQuote = includeQuote && i === 0
          const payloadOut = withQuote ? { type: 'assistant_message', content: piece, quote, chunkIndex: i + 1, chunkTotal: chunks.length } : { type: 'assistant_message', content: piece, chunkIndex: i + 1, chunkTotal: chunks.length }
          const target = wsBySid.get(sid) || ws
          try {
            target.send(JSON.stringify(payloadOut))
            wlog.info('reply.send', { userId: sess.userId, sid, chunkIndex: i + 1, chunkTotal: chunks.length, len: String(piece).length, preview: String(piece).slice(0, 100), withQuote })
          } catch (e) {
            wlog.error('reply.send.error', { userId: sess.userId, sid, chunkIndex: i + 1, error: e?.message || e })
          }
          if (i < chunks.length - 1) {
            await new Promise(res => setTimeout(res, 2000))
          }
        }
        await maybeSummarizeSession(sid)
        try {
          wlog.info('usage.increment.start', { userId: sess.userId })
          const [[urow]] = await pool.query('SELECT id FROM users WHERE id=?', [sess.userId])
          wlog.debug('usage.user.exists', { exists: !!urow })
          const [res] = await pool.query('UPDATE users SET used_count = COALESCE(used_count,0) + 1 WHERE id=?', [sess.userId])
          wlog.info('usage.increment.ok', { userId: sess.userId, column: 'used_count', affectedRows: res?.affectedRows })
          if (!res || !res.affectedRows) {
            const [res2] = await pool.query('UPDATE users SET used = COALESCE(used,0) + 1 WHERE id=?', [sess.userId])
            wlog.info('usage.increment.legacy', { userId: sess.userId, column: 'used', affectedRows: res2?.affectedRows })
          }
        } catch (e) {
          wlog.error('usage.increment.error', { error: e?.message || e })
        }
        llmCounts.set(sid, count + 1)
      }
      scheduleGenerate(sid, job)
    })
  })
  return wss
}
