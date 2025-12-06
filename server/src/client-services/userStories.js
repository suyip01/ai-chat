import pool from '../db.js'

export const listUserStories = async (userId, _opts = {}) => {
  const [rows] = await pool.query(
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
    [userId]
  )
  return (rows || []).map(r => ({
    ...r,
    tags: typeof r.tags === 'string' && r.tags.length ? r.tags.split(',') : []
  }))
}

export const getUserStory = async (userId, id) => {
  const [[row]] = await pool.query(
    `SELECT id, user_id, title, description, image, status, content, publish_date, created_at
     FROM stories WHERE id=? AND user_id=? LIMIT 1`,
    [id, userId]
  )
  if (!row) return null
  const [tags] = await pool.query(`SELECT tag FROM story_tags WHERE story_id=?`, [id])
  const [chars] = await pool.query(`SELECT character_id FROM story_characters WHERE story_id=?`, [id])
  const [[u]] = await pool.query(`SELECT avatar FROM users WHERE id=? LIMIT 1`, [row.user_id])
  return {
    ...row,
    tags: Array.isArray(tags) ? tags.map(x => x.tag) : [],
    characterIds: Array.isArray(chars) ? chars.map(x => x.character_id) : [],
    user_avatar: (u && u.avatar) ? u.avatar : ''
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
  await pool.query(
    `INSERT INTO stories (id, user_id, title, description, image, author, status, content)
     VALUES (?,?,?,?,?,NULL,?,?)`,
    [id, userId, title, description, image, status, content]
  )
  if (Array.isArray(tags) && tags.length) {
    const values = tags.map(tag => [id, tag])
    await pool.query('INSERT INTO story_tags (story_id, tag) VALUES ?', [values])
  }
  if (Array.isArray(characterIds) && characterIds.length) {
    const values = characterIds.map(cid => [id, cid])
    await pool.query('INSERT INTO story_characters (story_id, character_id) VALUES ?', [values])
  }
  if (status === 'published' && Array.isArray(characterIds) && characterIds.length) {
    const unique = [...new Set(characterIds.map(n => Number(n)).filter(n => Number.isFinite(n)))]
    if (unique.length) {
      const placeholders = unique.map(() => '?').join(',')
      await pool.query(`UPDATE characters SET visibility='public' WHERE id IN (${placeholders}) AND user_id=? AND creator_role='user_role'`, [...unique, userId])
    }
  }
  return id
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
  if (status === undefined) {
    await pool.query(
      `UPDATE stories SET title=?, description=?, image=?, content=? WHERE id=? AND user_id=?`,
      [title, description, image, content, id, userId]
    )
  } else {
    await pool.query(
      `UPDATE stories SET title=?, description=?, image=?, status=?, content=? WHERE id=? AND user_id=?`,
      [title, description, image, status, content, id, userId]
    )
  }
  await pool.query('DELETE FROM story_tags WHERE story_id=?', [id])
  await pool.query('DELETE FROM story_characters WHERE story_id=?', [id])
  if (Array.isArray(tags) && tags.length) {
    const values = tags.map(tag => [id, tag])
    await pool.query('INSERT INTO story_tags (story_id, tag) VALUES ?', [values])
  }
  if (Array.isArray(characterIds) && characterIds.length) {
    const values = characterIds.map(cid => [id, cid])
    await pool.query('INSERT INTO story_characters (story_id, character_id) VALUES ?', [values])
  }
  const isPublishing = status === 'published' || (status === undefined && String((exists || {}).status || '') === 'published')
  if (isPublishing && Array.isArray(characterIds) && characterIds.length) {
    const unique = [...new Set(characterIds.map(n => Number(n)).filter(n => Number.isFinite(n)))]
    if (unique.length) {
      const placeholders = unique.map(() => '?').join(',')
      await pool.query(`UPDATE characters SET visibility='public' WHERE id IN (${placeholders}) AND user_id=? AND creator_role='user_role'`, [...unique, userId])
    }
  }
  return true
}

export const deleteUserStory = async (userId, id) => {
  const [res] = await pool.query('DELETE FROM stories WHERE id=? AND user_id=?', [id, userId])
  return !!res.affectedRows
}
