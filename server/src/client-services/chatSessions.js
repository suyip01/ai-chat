import pool from '../db.js'
import crypto from 'crypto'
import { getRedis, keySess, keyRole, keyCharacter, keyMsgs, keySummary } from './redis.js'
import { createLogger } from '../utils/logger.js'

const ttlSec = parseInt(process.env.CHAT_SESSION_TTL || '604800')

const pickModelAndTemp = (settings) => {
  const model = settings?.selected_chat_model
  const temperature = settings?.chat_temperature ?? 0.1
  return { model, temperature: Number(temperature) }
}

export const createSession = async ({ userId, characterId, userRoleId, userRoleData = null, log }) => {
  const logger = (log || createLogger({ component: 'service', name: 'chatSessions', userId })).child({ characterId, userRoleId })
  try {
  logger.info('createSession.start', { userId, characterId, userRoleId })
  const r = await getRedis()
  const sid = crypto.randomUUID()
  const [[settingsRow]] = await pool.query('SELECT selected_chat_model, chat_temperature FROM settings ORDER BY id DESC LIMIT 1')
  const [[characterRow]] = await pool.query('SELECT id, name, system_prompt, system_prompt_scene, plot_summary, opening_line FROM characters WHERE id = ?', [characterId])
  let roleRow = userRoleData || null
  if (!roleRow && userRoleId) {
    const [[dbRole]] = await pool.query('SELECT id, name, age, gender, profession, basic_info, personality, avatar FROM user_chat_role WHERE id = ? AND user_id = ?', [userRoleId, userId])
    roleRow = dbRole || null
  }
  const { model, temperature } = pickModelAndTemp(settingsRow)
  let modelId = null
  let modelNickname = null
  try {
    const [[mrow]] = await pool.query('SELECT model_id, COALESCE(model_nickname, model_name, model_id) AS nick FROM models WHERE model_id=? OR model_name=? OR model_nickname=? LIMIT 1', [model, model, model])
    modelId = mrow?.model_id || model || null
    modelNickname = mrow?.nick || model || ''
  } catch (e) { logger.error('createSession.model.lookup.error', { message: e?.message, stack: e?.stack }) }
  logger.info('createSession.model', { model: modelId, nickname: modelNickname, temperature })
  const sessKey = keySess(sid)
  await r.hSet(sessKey, {
    sid,
    userId: String(userId),
    characterId: String(characterId),
    userRoleId: String(userRoleId),
    model: String(modelId || ''),
    model_id: String(modelId || ''),
    model_nickname: String(modelNickname || ''),
    temperature: String(temperature),
    system_prompt: characterRow?.system_prompt || '',
    system_prompt_scene: characterRow?.system_prompt_scene || '',
    created_at: String(Date.now())
  })
  await r.expire(sessKey, ttlSec)
  if (roleRow) {
    const roleKey = keyRole(userId, userRoleId)
    await r.hSet(roleKey, {
      id: String(roleRow.id),
      name: roleRow.name || '',
      age: String(roleRow.age ?? ''),
      gender: roleRow.gender || '',
      profession: roleRow.profession || '',
      basic_info: roleRow.basic_info || '',
      personality: roleRow.personality || '',
      avatar: roleRow.avatar || '',
      updated_at: String(Date.now())
    })
  }
  if (characterRow) {
    const charKey = keyCharacter(characterId)
    await r.hSet(charKey, {
      id: String(characterRow.id),
      system_prompt: characterRow.system_prompt || '',
      system_prompt_scene: characterRow.system_prompt_scene || '',
      updated_at: String(Date.now())
    })
    const mk = keyMsgs(sid)
    if (characterRow.plot_summary) {
      const prefix = `[系统标记：这是当前场景的剧情背景。文中的“你/妳/ni”指代用户，“他/她/ta/${characterRow.name || 'AI'}”指代AI。请基于此背景，代入角色进行互动。]\n`
      await r.rPush(mk, JSON.stringify({ role: 'assistant', content: `${prefix}${characterRow.plot_summary}`, ts: Date.now() }))
    }
    if (characterRow.opening_line) {
      await r.rPush(mk, JSON.stringify({ role: 'assistant', content: characterRow.opening_line, ts: Date.now() }))
    }
  }
  await r.expire(keyMsgs(sid), ttlSec)
  await r.expire(keySummary(sid), ttlSec)
  logger.info('createSession.ok', { sid })
  return { sid, model, temperature }
  } catch (err) {
    logger.error('createSession.error', { message: err?.message, stack: err?.stack, ctx: { userId, characterId, userRoleId } })
    throw err
  }
}

export const getSession = async (sid) => {
  const logger = createLogger({ component: 'service', name: 'chatSessions' })
  try {
    logger.info('getSession.start', { sid })
    const r = await getRedis()
    const data = await r.hGetAll(keySess(sid))
    return Object.keys(data).length ? data : null
  } catch (err) {
    logger.error('getSession.error', { message: err?.message, stack: err?.stack, sid })
    return null
  }
}
