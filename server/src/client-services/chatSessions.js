import pool from '../db.js'
import crypto from 'crypto'
import { getRedis, keySess, keyRole, keyCharacter, keyMsgs, keySummary } from './redis.js'

const ttlSec = parseInt(process.env.CHAT_SESSION_TTL || '604800')

const pickModelAndTemp = (settings) => {
  const model = settings?.selected_chat_model
  const temperature = settings?.chat_temperature ?? 0.1
  return { model, temperature: Number(temperature) }
}

export const createSession = async ({ userId, characterId, userRoleId, userRoleData = null }) => {
  console.log('[svc:createSession] userId=', userId, 'characterId=', characterId, 'userRoleId=', userRoleId)
  const r = await getRedis()
  const sid = crypto.randomUUID()
  const [[settingsRow]] = await pool.query('SELECT selected_chat_model, chat_temperature FROM settings ORDER BY id DESC LIMIT 1')
  const [[characterRow]] = await pool.query('SELECT id, system_prompt, system_prompt_scene, plot_summary, opening_line FROM characters WHERE id = ?', [characterId])
  let roleRow = userRoleData || null
  if (!roleRow && userRoleId) {
    const [[dbRole]] = await pool.query('SELECT id, name, age, gender, profession, basic_info, personality, avatar FROM user_chat_role WHERE id = ? AND user_id = ?', [userRoleId, userId])
    roleRow = dbRole || null
  }
  const { model, temperature } = pickModelAndTemp(settingsRow)
  console.log('[svc:createSession] settingsRow=', settingsRow)
  const sessKey = keySess(sid)
  await r.hSet(sessKey, {
    sid,
    userId: String(userId),
    characterId: String(characterId),
    userRoleId: String(userRoleId),
    model: String(model || ''),
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
      await r.rPush(mk, JSON.stringify({ role: 'assistant', content: characterRow.plot_summary, ts: Date.now() }))
    }
    if (characterRow.opening_line) {
      await r.rPush(mk, JSON.stringify({ role: 'assistant', content: characterRow.opening_line, ts: Date.now() }))
    }
  }
  await r.expire(keyMsgs(sid), ttlSec)
  await r.expire(keySummary(sid), ttlSec)
  console.log('[svc:createSession] created sid=', sid, 'model=', model, 'temperature=', temperature)
  return { sid, model, temperature }
}

export const getSession = async (sid) => {
  console.log('[svc:getSession] sid=', sid)
  const r = await getRedis()
  const data = await r.hGetAll(keySess(sid))
  return Object.keys(data).length ? data : null
}
