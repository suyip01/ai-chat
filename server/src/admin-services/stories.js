import pool from '../db.js'
import { createLogger } from '../utils/logger.js'
const logger = createLogger({ area: 'admin', component: 'service.stories' })

export const listStories = async () => {
  try {
  const sql =
    `SELECT s.id, s.user_id, s.title, s.description, s.image, s.author, s.likes, s.content, s.publish_date, s.created_at, s.status,
            GROUP_CONCAT(t.tag ORDER BY t.tag SEPARATOR ',') AS tags,
            (SELECT GROUP_CONCAT(sc.character_id) FROM story_characters sc WHERE sc.story_id = s.id) AS character_ids
     FROM stories s
     LEFT JOIN story_tags t ON t.story_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`
  logger.debug('admin.stories.list.sql', { sql })
  const [rows] = await pool.query(sql)
  return (rows || []).map(r => ({
    ...r,
    tags: typeof r.tags === 'string' && r.tags.length ? r.tags.split(',') : [],
    character_ids: typeof r.character_ids === 'string' && r.character_ids.length ? r.character_ids.split(',').map(x => Number(x)) : []
  }))
  } catch (err) {
    logger.error('admin.stories.list.error', { message: err?.message, stack: err?.stack })
    return []
  }
}

export const getStory = async (id) => {
  try {
  logger.debug('admin.stories.get.sql', { id })
  const [[row]] = await pool.query(`SELECT id, user_id, title, description, image, author, likes, content, publish_date, created_at, status FROM stories WHERE id=? LIMIT 1`, [id])
  if (!row) return null
  const [tags] = await pool.query(`SELECT tag FROM story_tags WHERE story_id=?`, [id])
  const [roles] = await pool.query(
    `SELECT sc.character_id AS id, c.name AS name
     FROM story_characters sc
     LEFT JOIN characters c ON c.id = sc.character_id
     WHERE sc.story_id = ?`,
    [id]
  )
  const [[u]] = await pool.query(`SELECT nickname, avatar FROM users WHERE id=? LIMIT 1`, [row.user_id])
  const authorOut = (row.author && String(row.author).length) ? row.author : ((u && u.nickname) ? u.nickname : '')
  return {
    ...row,
    author: authorOut,
    tags: Array.isArray(tags) ? tags.map(x => x.tag) : [],
    character_ids: Array.isArray(roles) ? roles.map(x => x.id) : [],
    roles: Array.isArray(roles) ? roles.map(r => ({ id: r.id, name: r.name })) : [],
    user_avatar: (u && u.avatar) ? u.avatar : ''
  }
  } catch (err) {
    logger.error('admin.stories.get.error', { message: err?.message, stack: err?.stack, params: { id } })
    return null
  }
}

export const createStory = async (payload) => {
  const id = Date.now()
  const { user_id = null, title, description = null, image = null, author = null, likes = null, content, status = 'draft', tags = [], character_ids = [] } = payload || {}
  try {
  const sqlIns = `INSERT INTO stories (id, user_id, title, description, image, author, likes, content, status)
     VALUES (?,?,?,?,?,?,?,?,?)`
  const paramsIns = [id, user_id, title, description, image, author, likes, content, status]
  logger.debug('admin.stories.create.sql', { sql: sqlIns, params: paramsIns })
  await pool.query(sqlIns, paramsIns)
  if (Array.isArray(tags) && tags.length) {
    const values = tags.map(tag => [id, tag])
    logger.debug('admin.stories.create.tags.sql', { sql: 'INSERT INTO story_tags (story_id, tag) VALUES ?', values })
    await pool.query('INSERT INTO story_tags (story_id, tag) VALUES ?', [values])
  }
  if (Array.isArray(character_ids) && character_ids.length) {
    const unique = [...new Set(character_ids.map(n => Number(n)).filter(n => Number.isFinite(n)))]
    if (unique.length) {
      const values = unique.map(cid => [id, cid])
      logger.debug('admin.stories.create.characters.sql', { sql: 'INSERT INTO story_characters (story_id, character_id) VALUES ?', values })
      await pool.query('INSERT INTO story_characters (story_id, character_id) VALUES ?', [values])
    }
  }
  return id
  } catch (err) {
    logger.error('admin.stories.create.error', { message: err?.message, stack: err?.stack, params: { payload } })
    throw err
  }
}

export const updateStory = async (id, payload) => {
  const { title, description = null, image = null, author = null, likes = null, content, status = undefined, tags = [], character_ids = [] } = payload || {}
  try {
  if (status === undefined) {
    const sqlUpd = `UPDATE stories SET title=?, description=?, image=?, author=?, likes=?, content=? WHERE id=?`
    const paramsUpd = [title, description, image, author, likes, content, id]
    logger.debug('admin.stories.update.sql', { sql: sqlUpd, params: paramsUpd })
    await pool.query(sqlUpd, paramsUpd)
  } else {
    const sqlUpd = `UPDATE stories SET title=?, description=?, image=?, author=?, likes=?, content=?, status=? WHERE id=?`
    const paramsUpd = [title, description, image, author, likes, content, status, id]
    logger.debug('admin.stories.update.sql', { sql: sqlUpd, params: paramsUpd })
    await pool.query(sqlUpd, paramsUpd)
  }
  await pool.query('DELETE FROM story_tags WHERE story_id=?', [id])
  if (Array.isArray(tags) && tags.length) {
    const filtered = tags.filter(t => typeof t === 'string' && t.trim().length > 0).map(t => t.trim())
    if (filtered.length) {
      const placeholders = filtered.map(() => '(?, ?)').join(',')
      const args = filtered.flatMap(tag => [id, tag])
      logger.debug('admin.stories.update.tags.sql', { sql: `INSERT INTO story_tags (story_id, tag) VALUES ${placeholders}`, args })
      await pool.query(`INSERT INTO story_tags (story_id, tag) VALUES ${placeholders}`, args)
    }
  }
  await pool.query('DELETE FROM story_characters WHERE story_id=?', [id])
  if (Array.isArray(character_ids) && character_ids.length) {
    const unique = [...new Set(character_ids.map(n => Number(n)).filter(n => Number.isFinite(n)))]
    if (unique.length) {
      const placeholders = unique.map(() => '(?, ?)').join(',')
      const args = unique.flatMap(cid => [id, cid])
      logger.debug('admin.stories.update.characters.sql', { sql: `INSERT INTO story_characters (story_id, character_id) VALUES ${placeholders}`, args })
      await pool.query(`INSERT INTO story_characters (story_id, character_id) VALUES ${placeholders}`, args)
    }
  }
  return true
  } catch (err) {
    logger.error('admin.stories.update.error', { message: err?.message, stack: err?.stack, params: { id, payload } })
    return false
  }
}

export const setStoryStatus = async (id, status) => {
  const allowed = ['published', 'draft']
  if (!allowed.includes(status)) throw new Error('invalid_status')
  try {
    logger.debug('admin.stories.status.sql', { id, status })
    const [res] = await pool.query('UPDATE stories SET status=? WHERE id=?', [status, id])
    return !!res.affectedRows
  } catch (err) {
    logger.error('admin.stories.status.error', { message: err?.message, stack: err?.stack, params: { id, status } })
    return false
  }
}

export const deleteStory = async (id) => {
  try {
    logger.debug('admin.stories.delete.sql', { id })
    const [res] = await pool.query('DELETE FROM stories WHERE id=?', [id])
    return !!res.affectedRows
  } catch (err) {
    logger.error('admin.stories.delete.error', { message: err?.message, stack: err?.stack, params: { id } })
    return false
  }
}
