import { createClient } from 'redis'

const url = process.env.REDIS_URL || undefined
const host = process.env.REDIS_HOST || '127.0.0.1'
const port = parseInt(process.env.REDIS_PORT || '6379')
const password = process.env.REDIS_PASSWORD || undefined

let client

export const getRedis = async () => {
  if (client) return client
  client = createClient(url ? { url } : { socket: { host, port }, password })
  client.on('error', () => {})
  await client.connect()
  return client
}

export const keySess = (sid) => `chat:sess:${sid}`
export const keyMsgs = (sid) => `chat:msgs:${sid}`
export const keySummary = (sid) => `chat:summary:${sid}`
export const keyRole = (userId, roleId) => `chat:role:${userId}:${roleId}`
export const keyCharacter = (characterId) => `chat:character:${characterId}`

