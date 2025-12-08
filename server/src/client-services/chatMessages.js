import { getRedis, keyMsgs } from './redis.js'
import { createLogger } from '../utils/logger.js'
const logger = createLogger({ area: 'client', component: 'service.chatMessages' })

const serialize = (m) => JSON.stringify(m)
const deserialize = (s) => {
  try { return JSON.parse(s) } catch { return null }
}

export const appendUserMessage = async (sid, content, meta) => {
  try {
    const r = await getRedis()
    const msg = { role: 'user', content, ts: Date.now() }
    await r.rPush(keyMsgs(sid), serialize(msg))
    logger.info('appendUser', { sid, contentLen: String(content||'').length, content, meta })
    return msg
  } catch (err) {
    logger.error('appendUser.error', { message: err?.message, stack: err?.stack, sid })
    throw err
  }
}

export const appendAssistantMessage = async (sid, content, meta) => {
  try {
    const r = await getRedis()
    const base = { role: 'assistant', content, ts: Date.now() }
    const msg = (meta && meta.withQuote && meta.quote) ? { ...base, quote: String(meta.quote) } : base
    await r.rPush(keyMsgs(sid), serialize(msg))
    logger.info('appendAssistant', { sid, contentLen: String(content||'').length, content })
    return msg
  } catch (err) {
    logger.error('appendAssistant.error', { message: err?.message, stack: err?.stack, sid })
    throw err
  }
}

export const getMessages = async (sid, limit = 100) => {
  try {
    const r = await getRedis()
    const total = await r.lLen(keyMsgs(sid))
    const start = Math.max(0, total - limit)
    const raw = await r.lRange(keyMsgs(sid), start, total - 1)
    const msgs = raw.map(deserialize).filter(Boolean)
    logger.info('getMessages', { sid, total, limit, messages: msgs })
    return msgs
  } catch (err) {
    logger.error('getMessages.error', { message: err?.message, stack: err?.stack, sid, limit })
    return []
  }
}
