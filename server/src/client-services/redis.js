import { createClient } from 'redis'
import { createLogger } from '../utils/logger.js'
const logger = createLogger({ area: 'client', component: 'service.redis' })

const url = process.env.REDIS_URL || undefined
const host = process.env.REDIS_HOST || '127.0.0.1'
const port = parseInt(process.env.REDIS_PORT || '6379')
const password = process.env.REDIS_PASSWORD || undefined

let client

export const getRedis = async () => {
  if (client) return client
  const opts = url ? { url } : { socket: { host, port }, password }
  logger.info('redis.connect.start', { url: url || undefined, host: url ? undefined : host, port: url ? undefined : port })
  client = createClient(opts)
  client.on('error', (e) => { logger.error('redis.error', { message: e?.message || String(e), stack: e?.stack }) })
  await client.connect()
  logger.info('redis.connect.ok')
  return client
}

export const keySess = (sid) => `chat:sess:${sid}`
export const keyMsgs = (sid) => `chat:msgs:${sid}`
export const keySummary = (sid) => `chat:summary:${sid}`
export const keyRole = (userId, roleId) => `chat:role:${userId}:${roleId}`
export const keyCharacter = (characterId) => `chat:character:${characterId}`
