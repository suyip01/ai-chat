import pool from '../db.js';

export const listPublishedCharacters = async ({ tag = null, limit = 24 } = {}) => {
  try {
    const whereBase = "c.status='published'";
    const whereTag = tag ? "AND EXISTS (SELECT 1 FROM character_tags ct WHERE ct.character_id=c.id AND ct.tag=?)" : "";
    const params = tag ? [tag, limit] : [limit];
    const [rows] = await pool.query(
       `SELECT 
          c.id,
          c.name,
          c.avatar,
          c.creator,
          c.age,
          c.occupation,
          c.tagline,
          c.personality,
          c.relationship,
          c.plot_theme,
          c.plot_summary,
          c.opening_line,
          (SELECT GROUP_CONCAT(ct.tag) FROM character_tags ct WHERE ct.character_id=c.id) AS tags
       FROM characters c
       WHERE ${whereBase} ${whereTag}
       ORDER BY c.created_at DESC
       LIMIT ?`,
      params
    );
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      creator: r.creator,
      age: r.age,
      occupation: r.occupation,
      tagline: r.tagline,
      personality: r.personality,
      relationship: r.relationship,
      plot_theme: r.plot_theme,
      plot_summary: r.plot_summary,
      opening_line: r.opening_line,
      tags: r.tags ? r.tags.split(',') : [],
    }));
  } catch {
    return [];
  }
};

export const getPublishedCharacter = async (id) => {
  try {
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
  } catch {
    return null;
  }
};
