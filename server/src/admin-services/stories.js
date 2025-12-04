import pool from '../db.js'

export const listStories = async () => {
  const [rows] = await pool.query(
    `SELECT s.id, s.user_id, s.title, s.description, s.image, s.author, s.likes, s.content, s.publish_date, s.created_at, s.status,
            GROUP_CONCAT(t.tag ORDER BY t.tag SEPARATOR ',') AS tags
     FROM stories s
     LEFT JOIN story_tags t ON t.story_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`
  )
  return (rows || []).map(r => ({
    ...r,
    tags: typeof r.tags === 'string' && r.tags.length ? r.tags.split(',') : []
  }))
}

export const getStory = async (id) => {
  const [[row]] = await pool.query(`SELECT id, user_id, title, description, image, author, likes, content, publish_date, created_at, status FROM stories WHERE id=? LIMIT 1`, [id])
  if (!row) return null
  const [tags] = await pool.query(`SELECT tag FROM story_tags WHERE story_id=?`, [id])
  return { ...row, tags: Array.isArray(tags) ? tags.map(x => x.tag) : [] }
}

export const createStory = async (payload) => {
  const id = Date.now()
  const { user_id = null, title, description = null, image = null, author = null, likes = null, content, publish_date = null, status = 'draft', tags = [] } = payload || {}
  await pool.query(
    `INSERT INTO stories (id, user_id, title, description, image, author, likes, content, publish_date, status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, user_id, title, description, image, author, likes, content, publish_date, status]
  )
  if (Array.isArray(tags) && tags.length) {
    const values = tags.map(tag => [id, tag])
    await pool.query('INSERT INTO story_tags (story_id, tag) VALUES ?', [values])
  }
  return id
}

export const updateStory = async (id, payload) => {
  const { title, description = null, image = null, author = null, likes = null, content, publish_date = null, status = undefined, tags = [] } = payload || {}
  if (status === undefined) {
    await pool.query(
      `UPDATE stories SET title=?, description=?, image=?, author=?, likes=?, content=?, publish_date=? WHERE id=?`,
      [title, description, image, author, likes, content, publish_date, id]
    )
  } else {
    await pool.query(
      `UPDATE stories SET title=?, description=?, image=?, author=?, likes=?, content=?, publish_date=?, status=? WHERE id=?`,
      [title, description, image, author, likes, content, publish_date, status, id]
    )
  }
  await pool.query('DELETE FROM story_tags WHERE story_id=?', [id])
  if (Array.isArray(tags) && tags.length) {
    const filtered = tags.filter(t => typeof t === 'string' && t.trim().length > 0).map(t => t.trim())
    if (filtered.length) {
      const placeholders = filtered.map(() => '(?, ?)').join(',')
      const args = filtered.flatMap(tag => [id, tag])
      await pool.query(`INSERT INTO story_tags (story_id, tag) VALUES ${placeholders}`, args)
    }
  }
  return true
}

export const setStoryStatus = async (id, status) => {
  const allowed = ['published', 'draft']
  if (!allowed.includes(status)) throw new Error('invalid_status')
  const [res] = await pool.query('UPDATE stories SET status=? WHERE id=?', [status, id])
  return !!res.affectedRows
}

export const deleteStory = async (id) => {
  const [res] = await pool.query('DELETE FROM stories WHERE id=?', [id])
  return !!res.affectedRows
}
