import pool from '../db.js';

export const listPublishedCharacters = async ({ tag = null, limit = 24 } = {}) => {
  const where = tag ? 'WHERE c.status="published" AND ct.tag=?' : 'WHERE c.status="published"';
  const params = tag ? [tag, limit] : [limit];
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.avatar, c.intro, GROUP_CONCAT(ct.tag) AS tags
     FROM characters c
     LEFT JOIN character_tags ct ON ct.character_id = c.id
     ${where}
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT ?`,
    params
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    intro: r.intro,
    tags: r.tags ? r.tags.split(',') : [],
  }));
};

export const getPublishedCharacter = async (id) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.gender, c.avatar, c.intro, c.identity, c.tagline, c.opening_line,
            GROUP_CONCAT(ct.tag) AS tags
     FROM characters c
     LEFT JOIN character_tags ct ON ct.character_id = c.id
     WHERE c.status='published' AND c.id=?
     GROUP BY c.id
     LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    gender: r.gender,
    avatar: r.avatar,
    intro: r.intro,
    identity: r.identity,
    tagline: r.tagline,
    openingLine: r.opening_line,
    tags: r.tags ? r.tags.split(',') : [],
  };
};
