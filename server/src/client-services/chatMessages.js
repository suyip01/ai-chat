import { getRedis, keyMsgs } from './redis.js'
import { createLogger } from '../utils/logger.js'

const serialize = (m) => JSON.stringify(m)
const deserialize = (s) => {
  try { return JSON.parse(s) } catch { return null }
}

export const appendUserMessage = async (sid, content) => {
  const r = await getRedis()
  const msg = { role: 'user', content, ts: Date.now() }
  await r.rPush(keyMsgs(sid), serialize(msg))
  createLogger({ component: 'service', name: 'chatMessages' }).info('appendUser', { sid, contentLen: String(content||'').length })
  return msg
}

export const appendAssistantMessage = async (sid, content) => {
  const r = await getRedis()
  const msg = { role: 'assistant', content, ts: Date.now() }
  await r.rPush(keyMsgs(sid), serialize(msg))
  createLogger({ component: 'service', name: 'chatMessages' }).info('appendAssistant', { sid, contentLen: String(content||'').length })
  return msg
}

export const getMessages = async (sid, limit = 100) => {
  const r = await getRedis()
  const total = await r.lLen(keyMsgs(sid))
  const start = Math.max(0, total - limit)
  const raw = await r.lRange(keyMsgs(sid), start, total - 1)
  createLogger({ component: 'service', name: 'chatMessages' }).info('getMessages', { sid, total, limit })
  return raw.map(deserialize).filter(Boolean)
}
