import pool from '../db.js'

export const listUserCharacters = async (userId) => {
  const [rows] = await pool.query(
    `SELECT c.id AS mypage_id,
            c.name AS mypage_name,
            c.tagline AS mypage_tagline,
            c.visibility AS mypage_visibility,
            c.avatar AS mypage_avatar,
            c.status AS mypage_status
     FROM characters c
     WHERE c.creator_role = 'user_role' AND c.user_id = ?
     ORDER BY c.created_at ASC`,
    [userId]
  )
  return rows
}

export const getUserCharacter = async (userId, id) => {
  const [[row]] = await pool.query(
    `SELECT id, name, gender, avatar, identity, tagline, personality, relationship,
            plot_theme, plot_summary, opening_line, hobbies, experiences,
            age, occupation, visibility, status, created_at,
            CASE WHEN system_prompt IS NULL OR system_prompt = '' THEN 0 ELSE 1 END AS hasSystemPrompt
     FROM characters WHERE id = ? AND creator_role = 'user_role' AND user_id = ? LIMIT 1`,
    [id, userId]
  )
  if (!row) return null
  const [tagRows] = await pool.query('SELECT tag FROM character_tags WHERE character_id=?', [id])
  const [exRows] = await pool.query('SELECT idx, content FROM character_style_examples WHERE character_id=? ORDER BY idx ASC', [id])
  const { hasSystemPrompt, ...rest } = row || {}
  return {
    ...rest,
    hasSystemPrompt: !!hasSystemPrompt,
    tags: Array.isArray(tagRows) ? tagRows.map(r => r.tag).filter(Boolean) : [],
    styleExamples: Array.isArray(exRows) ? exRows.map(r => r.content).filter(Boolean) : []
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
  const [[u]] = await pool.query('SELECT nickname, username FROM users WHERE id=? LIMIT 1', [userId])
  const creator = (u?.nickname || u?.username || 'User')
  const ctype = character_type || type || '原创角色'
  await pool.query(
    `INSERT INTO characters (id, name, gender, avatar, creator, creator_role, user_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line,
      hobbies, experiences, status, character_type, age, occupation, visibility)
     VALUES (?,?,?,?,?,'user_role',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, gender, avatar, creator, userId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine,
     hobbies, experiences, 'publishing', ctype, age, occupation, visibility === 'private' ? 'private' : 'public']
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
  const [[u]] = await pool.query('SELECT nickname, username FROM users WHERE id=? LIMIT 1', [userId])
  const creator = (u?.nickname || u?.username || 'User')
  const ctype = character_type || type || '原创角色'
  await pool.query(
    `INSERT INTO characters (id, name, gender, avatar, creator, creator_role, user_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line,
      hobbies, experiences, status, character_type, age, occupation, visibility)
     VALUES (?,?,?,?,?,'user_role',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, gender, avatar, creator, userId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine,
     hobbies, experiences, 'draft', ctype, age, occupation, visibility === 'private' ? 'private' : 'public']
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
    age = null, occupation = null, tags = [], styleExamples = [], character_type = null, type = null, visibility = null
  } = payload || {}
  await pool.query(
    `UPDATE characters SET name=?, gender=?, avatar=?, identity=?, tagline=?, personality=?, relationship=?,
      plot_theme=?, plot_summary=?, opening_line=?, hobbies=?, experiences=?, age=?, occupation=?, character_type=?, visibility=?, status=?
     WHERE id=? AND user_id=? AND creator_role='user_role'`,
    [name, gender, avatar, identity, tagline, personality, relationship,
     plotTheme, plotSummary, openingLine, hobbies, experiences, age, occupation, (character_type || type || exists.character_type), (visibility || exists.visibility), 'publishing', id, userId]
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
