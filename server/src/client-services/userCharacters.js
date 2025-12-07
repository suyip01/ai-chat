import pool from '../db.js'
import { createLogger } from '../utils/logger.js'
const logger = createLogger({ area: 'client', component: 'service.userCharacters' })

export const listUserCharacters = async (userId) => {
  try {
  const sql =
    `SELECT c.id AS mypage_id,
            c.name AS mypage_name,
            c.tagline AS mypage_tagline,
            c.visibility AS mypage_visibility,
            c.avatar AS mypage_avatar,
            c.status AS mypage_status
     FROM characters c
     WHERE c.creator_role = 'user_role' AND c.user_id = ?
     ORDER BY c.created_at ASC`,
    params = [userId]
  logger.debug('service.userCharacters.list.sql', { sql, params })
  const [rows] = await pool.query(sql, params)
  logger.info('service.userCharacters.list.result', { rowCount: rows.length, rows })
  return rows
  } catch (err) {
    logger.error('service.userCharacters.list.error', { message: err?.message, stack: err?.stack, params: { userId } })
    return []
  }
}

export const getUserCharacter = async (userId, id) => {
  try {
  const sql1 =
    `SELECT id, name, gender, avatar, identity, tagline, personality, relationship,
            plot_theme, plot_summary, opening_line, hobbies, experiences,
            age, occupation, visibility, status, created_at, character_type,
            CASE WHEN system_prompt IS NULL OR system_prompt = '' THEN 0 ELSE 1 END AS hasSystemPrompt
     FROM characters WHERE id = ? AND creator_role = 'user_role' AND user_id = ? LIMIT 1`,
    params1 = [id, userId]
  logger.debug('service.userCharacters.get.sql', { sql: sql1, params: params1 })
  const [[row]] = await pool.query(sql1, params1)
  if (!row) return null
  logger.debug('service.userCharacters.get.tags.sql', { sql: 'SELECT tag FROM character_tags WHERE character_id=?', params: [id] })
  const [tagRows] = await pool.query('SELECT tag FROM character_tags WHERE character_id=?', [id])
  logger.debug('service.userCharacters.get.examples.sql', { sql: 'SELECT idx, content FROM character_style_examples WHERE character_id=? ORDER BY idx ASC', params: [id] })
  const [exRows] = await pool.query('SELECT idx, content FROM character_style_examples WHERE character_id=? ORDER BY idx ASC', [id])
  const { hasSystemPrompt, ...rest } = row || {}
  return {
    ...rest,
    hasSystemPrompt: !!hasSystemPrompt,
    tags: Array.isArray(tagRows) ? tagRows.map(r => r.tag).filter(Boolean) : [],
    styleExamples: Array.isArray(exRows) ? exRows.map(r => r.content).filter(Boolean) : []
  }
  } catch (err) {
    logger.error('service.userCharacters.get.error', { message: err?.message, stack: err?.stack, params: { userId, id } })
    return null
  }
}

export const createUserCharacter = async (userId, payload) => {
  const id = Date.now()
  const {
    name, gender, avatar = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null,
    hobbies = null, experiences = null,
    age = null, occupation = null,
    tags = [], styleExamples = [],
    character_type = null, type = null,
    visibility = 'public'
  } = payload || {}
  try {
  logger.debug('service.userCharacters.create.user.sql', { sql: 'SELECT nickname, username FROM users WHERE id=? LIMIT 1', params: [userId] })
  const [[u]] = await pool.query('SELECT nickname, username FROM users WHERE id=? LIMIT 1', [userId])
  const creator = (u?.nickname || u?.username || 'User')
  const ctype = character_type || type || '原创角色'
  const sqlIns = `INSERT INTO characters (id, name, gender, avatar, creator, creator_role, user_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line,
      hobbies, experiences, status, character_type, age, occupation, visibility)
     VALUES (?,?,?,?,?,'user_role',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  const insParams = [id, name, gender, avatar, creator, userId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine,
     hobbies, experiences, 'publishing', ctype, age, occupation, visibility === 'private' ? 'private' : 'public']
  logger.debug('service.userCharacters.create.sql', { sql: sqlIns, params: insParams })
  await pool.query(sqlIns, insParams)
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag])
    logger.debug('service.userCharacters.create.tags.sql', { sql: 'INSERT INTO character_tags (character_id, tag) VALUES ?', values })
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values])
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || ''])
    logger.debug('service.userCharacters.create.examples.sql', { sql: 'INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', values })
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values])
  }
  logger.info('service.userCharacters.create.result', { id })
  return id
  } catch (err) {
    logger.error('service.userCharacters.create.error', { message: err?.message, stack: err?.stack, params: { userId, payload } })
    throw err
  }
}

export const createUserCharacterDraft = async (userId, payload) => {
  const id = Date.now()
  const {
    name, gender, avatar = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null,
    hobbies = null, experiences = null,
    age = null, occupation = null,
    tags = [], styleExamples = [],
    character_type = null, type = null,
    visibility = 'public'
  } = payload || {}
  try {
  logger.debug('service.userCharacters.createDraft.user.sql', { sql: 'SELECT nickname, username FROM users WHERE id=? LIMIT 1', params: [userId] })
  const [[u]] = await pool.query('SELECT nickname, username FROM users WHERE id=? LIMIT 1', [userId])
  const creator = (u?.nickname || u?.username || 'User')
  const ctype = character_type || type || '原创角色'
  const sqlIns = `INSERT INTO characters (id, name, gender, avatar, creator, creator_role, user_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line,
      hobbies, experiences, status, character_type, age, occupation, visibility)
     VALUES (?,?,?,?,?,'user_role',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  const insParams = [id, name, gender, avatar, creator, userId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine,
     hobbies, experiences, 'draft', ctype, age, occupation, visibility === 'private' ? 'private' : 'public']
  logger.debug('service.userCharacters.createDraft.sql', { sql: sqlIns, params: insParams })
  await pool.query(sqlIns, insParams)
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag])
    logger.debug('service.userCharacters.createDraft.tags.sql', { sql: 'INSERT INTO character_tags (character_id, tag) VALUES ?', values })
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values])
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || ''])
    logger.debug('service.userCharacters.createDraft.examples.sql', { sql: 'INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', values })
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values])
  }
  logger.info('service.userCharacters.createDraft.result', { id })
  return id
  } catch (err) {
    logger.error('service.userCharacters.createDraft.error', { message: err?.message, stack: err?.stack, params: { userId, payload } })
    throw err
  }
}

export const updateUserCharacter = async (userId, id, payload) => {
  const exists = await getUserCharacter(userId, id)
  if (!exists) return false
  const {
    name, gender, avatar = null, identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, hobbies = null, experiences = null,
    age = null, occupation = null, tags = [], styleExamples = [], character_type = null, type = null, visibility = null
  } = payload || {}
  try {
  const sqlUpd = `UPDATE characters SET name=?, gender=?, avatar=?, identity=?, tagline=?, personality=?, relationship=?,
      plot_theme=?, plot_summary=?, opening_line=?, hobbies=?, experiences=?, age=?, occupation=?, character_type=?, visibility=?, status=?
     WHERE id=? AND user_id=? AND creator_role='user_role'`
  const updParams = [name, gender, avatar, identity, tagline, personality, relationship,
     plotTheme, plotSummary, openingLine, hobbies, experiences, age, occupation, (character_type || type || exists.character_type), (visibility || exists.visibility), 'publishing', id, userId]
  logger.debug('service.userCharacters.update.sql', { sql: sqlUpd, params: updParams })
  await pool.query(sqlUpd, updParams)
  await pool.query('DELETE FROM character_tags WHERE character_id=?', [id])
  await pool.query('DELETE FROM character_style_examples WHERE character_id=?', [id])
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag])
    logger.debug('service.userCharacters.update.tags.sql', { sql: 'INSERT INTO character_tags (character_id, tag) VALUES ?', values })
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values])
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || ''])
    logger.debug('service.userCharacters.update.examples.sql', { sql: 'INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', values })
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values])
  }
  logger.info('service.userCharacters.update.result', { id })
  return true
  } catch (err) {
    logger.error('service.userCharacters.update.error', { message: err?.message, stack: err?.stack, params: { userId, id, payload } })
    return false
  }
}

export const deleteUserCharacter = async (userId, id) => {
  try {
  logger.debug('service.userCharacters.delete.sql', { sql: 'DELETE FROM characters WHERE id=? AND user_id=? AND creator_role="user_role"', params: [id, userId] })
  const [res] = await pool.query('DELETE FROM characters WHERE id=? AND user_id=? AND creator_role="user_role"', [id, userId])
  logger.info('service.userCharacters.delete.result', { affectedRows: res?.affectedRows })
  return !!res.affectedRows
  } catch (err) {
    logger.error('service.userCharacters.delete.error', { message: err?.message, stack: err?.stack, params: { userId, id } })
    return false
  }
}
