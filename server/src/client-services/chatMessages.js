import { getRedis, keyMsgs } from './redis.js'

const serialize = (m) => JSON.stringify(m)
const deserialize = (s) => {
  try { return JSON.parse(s) } catch { return null }
}

export const appendUserMessage = async (sid, content) => {
  const r = await getRedis()
  const msg = { role: 'user', content, ts: Date.now() }
  await r.rPush(keyMsgs(sid), serialize(msg))
  console.log('[svc:appendUserMessage] sid=', sid, 'contentLen=', String(content||'').length)
  return msg
}

export const appendAssistantMessage = async (sid, content) => {
  const r = await getRedis()
  const msg = { role: 'assistant', content, ts: Date.now() }
  await r.rPush(keyMsgs(sid), serialize(msg))
  console.log('[svc:appendAssistantMessage] sid=', sid, 'contentLen=', String(content||'').length)
  return msg
}

export const getMessages = async (sid, limit = 100) => {
  const r = await getRedis()
  const total = await r.lLen(keyMsgs(sid))
  const start = Math.max(0, total - limit)
  const raw = await r.lRange(keyMsgs(sid), start, total - 1)
  console.log('[svc:getMessages] sid=', sid, 'total=', total, 'limit=', limit)
  return raw.map(deserialize).filter(Boolean)
}
