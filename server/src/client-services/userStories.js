import pool from '../db.js'
import { createLogger } from '../utils/logger.js'
const logger = createLogger({ area: 'client', component: 'service.userStories' })

export const listUserStories = async (userId, _opts = {}) => {
  try {
  const sql =
    `SELECT 
        s.id AS mypage_id,
        s.title AS mypage_title,
        s.description AS mypage_description,
        s.image AS mypage_image,
        s.status AS mypage_status,
        (SELECT GROUP_CONCAT(t.tag) FROM story_tags t WHERE t.story_id = s.id) AS tags
     FROM stories s
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC`,
    params = [userId]
  logger.debug('service.userStories.list.sql', { sql, params })
  const [rows] = await pool.query(sql, params)
  return (rows || []).map(r => ({
    ...r,
    tags: typeof r.tags === 'string' && r.tags.length ? r.tags.split(',') : []
  }))
  } catch (err) {
    logger.error('service.userStories.list.error', { message: err?.message, stack: err?.stack, params: { userId } })
    return []
  }
}

export const getUserStory = async (userId, id) => {
  try {
  const sql1 =
    `SELECT id, user_id, title, description, image, status, content, publish_date, created_at
     FROM stories WHERE id=? AND user_id=? LIMIT 1`,
    params1 = [id, userId]
  logger.debug('service.userStories.get.sql', { sql: sql1, params: params1 })
  const [[row]] = await pool.query(sql1, params1)
  if (!row) return null
  logger.debug('service.userStories.get.tags.sql', { sql: 'SELECT tag FROM story_tags WHERE story_id=?', params: [id] })
  const [tags] = await pool.query(`SELECT tag FROM story_tags WHERE story_id=?`, [id])
  logger.debug('service.userStories.get.characters.sql', { sql: 'SELECT character_id FROM story_characters WHERE story_id=?', params: [id] })
  const [chars] = await pool.query(`SELECT character_id FROM story_characters WHERE story_id=?`, [id])
  logger.debug('service.userStories.get.user.sql', { sql: 'SELECT avatar FROM users WHERE id=? LIMIT 1', params: [row.user_id] })
  const [[u]] = await pool.query(`SELECT avatar FROM users WHERE id=? LIMIT 1`, [row.user_id])
  return {
    ...row,
    tags: Array.isArray(tags) ? tags.map(x => x.tag) : [],
    characterIds: Array.isArray(chars) ? chars.map(x => x.character_id) : [],
    user_avatar: (u && u.avatar) ? u.avatar : ''
  }
  } catch (err) {
    logger.error('service.userStories.get.error', { message: err?.message, stack: err?.stack, params: { userId, id } })
    return null
  }
}

export const createUserStory = async (userId, payload) => {
  const id = Date.now()
  const {
    title,
    description = null,
    image = null,
    status = 'draft',
    content,
    tags = [],
    characterIds = []
  } = payload || {}
  try {
  logger.debug('service.userStories.create.user.sql', { sql: 'SELECT nickname, username FROM users WHERE id=? LIMIT 1', params: [userId] })
  const [[u]] = await pool.query('SELECT nickname, username FROM users WHERE id=? LIMIT 1', [userId])
  const author = (u?.nickname || u?.username || 'User')

  const sqlIns = `INSERT INTO stories (id, user_id, title, description, image, author, status, content)
     VALUES (?,?,?,?,?,?,?,?)`
  const paramsIns = [id, userId, title, description, image, author, status, content]
  logger.debug('service.userStories.create.sql', { sql: sqlIns, params: paramsIns })
  await pool.query(sqlIns, paramsIns)
  if (Array.isArray(tags) && tags.length) {
    const values = tags.map(tag => [id, tag])
    logger.debug('service.userStories.create.tags.sql', { sql: 'INSERT INTO story_tags (story_id, tag) VALUES ?', values })
    await pool.query('INSERT INTO story_tags (story_id, tag) VALUES ?', [values])
  }
  if (Array.isArray(characterIds) && characterIds.length) {
    const values = characterIds.map(cid => [id, cid])
    logger.debug('service.userStories.create.characters.sql', { sql: 'INSERT INTO story_characters (story_id, character_id) VALUES ?', values })
    await pool.query('INSERT INTO story_characters (story_id, character_id) VALUES ?', [values])
  }
  if (status === 'published' && Array.isArray(characterIds) && characterIds.length) {
    const unique = [...new Set(characterIds.map(n => Number(n)).filter(n => Number.isFinite(n)))]
    if (unique.length) {
      const placeholders = unique.map(() => '?').join(',')
      const sqlUpdVis = `UPDATE characters SET visibility='public' WHERE id IN (${placeholders}) AND user_id=? AND creator_role='user_role'`
      logger.debug('service.userStories.create.publishVis.sql', { sql: sqlUpdVis, params: [...unique, userId] })
      await pool.query(sqlUpdVis, [...unique, userId])
    }
  }
  logger.info('service.userStories.create.result', { id })
  return id
  } catch (err) {
    logger.error('service.userStories.create.error', { message: err?.message, stack: err?.stack, params: { userId, payload } })
    throw err
  }
}

export const updateUserStory = async (userId, id, payload) => {
  const exists = await getUserStory(userId, id)
  if (!exists) return false
  const {
    title,
    description = null,
    image = null,
    status = undefined,
    content,
    tags = [],
    characterIds = []
  } = payload || {}
  try {
  if (status === undefined) {
    const sqlUpd = `UPDATE stories SET title=?, description=?, image=?, content=? WHERE id=? AND user_id=?`
    const paramsUpd = [title, description, image, content, id, userId]
    logger.debug('service.userStories.update.sql', { sql: sqlUpd, params: paramsUpd })
    await pool.query(sqlUpd, paramsUpd)
  } else {
    const sqlUpd = `UPDATE stories SET title=?, description=?, image=?, status=?, content=? WHERE id=? AND user_id=?`
    const paramsUpd = [title, description, image, status, content, id, userId]
    logger.debug('service.userStories.update.sql', { sql: sqlUpd, params: paramsUpd })
    await pool.query(sqlUpd, paramsUpd)
  }
  await pool.query('DELETE FROM story_tags WHERE story_id=?', [id])
  await pool.query('DELETE FROM story_characters WHERE story_id=?', [id])
  if (Array.isArray(tags) && tags.length) {
    const values = tags.map(tag => [id, tag])
    logger.debug('service.userStories.update.tags.sql', { sql: 'INSERT INTO story_tags (story_id, tag) VALUES ?', values })
    await pool.query('INSERT INTO story_tags (story_id, tag) VALUES ?', [values])
  }
  if (Array.isArray(characterIds) && characterIds.length) {
    const values = characterIds.map(cid => [id, cid])
    logger.debug('service.userStories.update.characters.sql', { sql: 'INSERT INTO story_characters (story_id, character_id) VALUES ?', values })
    await pool.query('INSERT INTO story_characters (story_id, character_id) VALUES ?', [values])
  }
  const isPublishing = status === 'published' || (status === undefined && String((exists || {}).status || '') === 'published')
  if (isPublishing && Array.isArray(characterIds) && characterIds.length) {
    const unique = [...new Set(characterIds.map(n => Number(n)).filter(n => Number.isFinite(n)))]
    if (unique.length) {
      const placeholders = unique.map(() => '?').join(',')
      const sqlUpdVis = `UPDATE characters SET visibility='public' WHERE id IN (${placeholders}) AND user_id=? AND creator_role='user_role'`
      logger.debug('service.userStories.update.publishVis.sql', { sql: sqlUpdVis, params: [...unique, userId] })
      await pool.query(sqlUpdVis, [...unique, userId])
    }
  }
  logger.info('service.userStories.update.result', { id })
  return true
  } catch (err) {
    logger.error('service.userStories.update.error', { message: err?.message, stack: err?.stack, params: { userId, id, payload } })
    return false
  }
}

export const deleteUserStory = async (userId, id) => {
  try {
  logger.debug('service.userStories.delete.sql', { sql: 'DELETE FROM stories WHERE id=? AND user_id=?', params: [id, userId] })
  const [res] = await pool.query('DELETE FROM stories WHERE id=? AND user_id=?', [id, userId])
  logger.info('service.userStories.delete.result', { affectedRows: res?.affectedRows })
  return !!res.affectedRows
  } catch (err) {
    logger.error('service.userStories.delete.error', { message: err?.message, stack: err?.stack, params: { userId, id } })
    return false
  }
}
