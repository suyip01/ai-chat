import pool from '../db.js'

export const listUserCharacters = async (userId) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.gender, c.avatar, c.identity, c.tagline, c.personality, c.relationship,
            c.plot_theme, c.plot_summary, c.opening_line, c.hobbies, c.experiences,
            c.age, c.occupation, c.created_at
     FROM characters c
     WHERE c.creator_role = 'user_role' AND c.user_id = ?
     ORDER BY c.created_at ASC`,
    [userId]
  )
  return rows
}

export const getUserCharacter = async (userId, id) => {
  const [[row]] = await pool.query(
    `SELECT * FROM characters WHERE id = ? AND creator_role = 'user_role' AND user_id = ? LIMIT 1`,
    [id, userId]
  )
  return row || null
}

export const createUserCharacter = async (userId, creator, payload) => {
  const id = Date.now()
  const {
    name, gender, avatar = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null,
    hobbies = null, experiences = null,
    age = null, occupation = null,
    tags = [], styleExamples = []
  } = payload || {}
  await pool.query(
    `INSERT INTO characters (id, name, gender, avatar, creator, creator_role, user_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line,
      hobbies, experiences, status, character_type, age, occupation)
     VALUES (?,?,?,?,?,'user_role',?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, gender, avatar, creator, userId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine,
     hobbies, experiences, 'draft', '原创角色', age, occupation]
  )
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag])
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values])
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || ''])
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values])
  }
  return id
}

export const updateUserCharacter = async (userId, id, payload) => {
  const exists = await getUserCharacter(userId, id)
  if (!exists) return false
  const {
    name, gender, avatar = null, identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, hobbies = null, experiences = null,
    age = null, occupation = null, tags = [], styleExamples = []
  } = payload || {}
  await pool.query(
    `UPDATE characters SET name=?, gender=?, avatar=?, identity=?, tagline=?, personality=?, relationship=?,
      plot_theme=?, plot_summary=?, opening_line=?, hobbies=?, experiences=?, age=?, occupation=?
     WHERE id=? AND user_id=? AND creator_role='user_role'`,
    [name, gender, avatar, identity, tagline, personality, relationship,
     plotTheme, plotSummary, openingLine, hobbies, experiences, age, occupation, id, userId]
  )
  await pool.query('DELETE FROM character_tags WHERE character_id=?', [id])
  await pool.query('DELETE FROM character_style_examples WHERE character_id=?', [id])
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag])
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values])
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || ''])
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values])
  }
  return true
}

export const deleteUserCharacter = async (userId, id) => {
  const [res] = await pool.query('DELETE FROM characters WHERE id=? AND user_id=? AND creator_role="user_role"', [id, userId])
  return !!res.affectedRows
}

