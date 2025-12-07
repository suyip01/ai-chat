import pool from '../db.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger({ area: 'client', component: 'service.characters' });

export const listPublishedCharacters = async ({ tag = null, limit = 24, offset = 0, visibility = 'public' } = {}) => {
  try {
    const whereBase = "c.status='published' AND c.visibility=?";
    const whereTag = tag ? "AND EXISTS (SELECT 1 FROM character_tags ct WHERE ct.character_id=c.id AND ct.tag=?)" : "";
    const params = tag ? [visibility, tag, limit, offset] : [visibility, limit, offset];
    const sql = `SELECT 
          c.id,
          c.name,
          c.avatar,
          COALESCE(u.nickname, a.nickname, c.creator) AS creator,
          c.creator AS creator_username,
          c.age,
          c.occupation,
          c.tagline,
          c.personality,
          c.relationship,
          c.plot_theme,
          c.plot_summary,
          c.opening_line,
          c.character_type,
          (SELECT GROUP_CONCAT(ct.tag) FROM character_tags ct WHERE ct.character_id=c.id) AS tags
       FROM characters c
       LEFT JOIN admins a ON a.username = c.creator
       LEFT JOIN users u ON u.username = c.creator
       WHERE ${whereBase} ${whereTag}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`;
    logger.debug('service.characters.list.sql', { sql, params });
    const [rows] = await pool.query(sql, params);
    logger.info('service.characters.list.result', { rowCount: rows.length, rows });
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      creator: r.creator,
      creator_username: r.creator_username,
      age: r.age,
      occupation: r.occupation,
      tagline: r.tagline,
      personality: r.personality,
      relationship: r.relationship,
      plot_theme: r.plot_theme,
      plot_summary: r.plot_summary,
      opening_line: r.opening_line,
      character_type: r.character_type,
      tags: r.tags ? r.tags.split(',') : [],
    }));
  } catch (err) {
    logger.error('service.characters.list.error', { message: err?.message, stack: err?.stack, params: { tag, limit, offset, visibility } });
    return [];
  }
};

export const getPublishedCharacter = async (id) => {
  try {
    const sql = `SELECT 
          c.id,
          c.name,
          c.gender,
          c.avatar,
          COALESCE(u.nickname, a.nickname, c.creator) AS creator,
          c.age,
          c.occupation,
          c.tagline,
          c.personality,
          c.relationship,
          c.plot_theme,
          c.plot_summary,
          c.opening_line,
          c.character_type,
          (SELECT GROUP_CONCAT(ct.tag) FROM character_tags ct WHERE ct.character_id=c.id) AS tags
       FROM characters c
       LEFT JOIN admins a ON a.username = c.creator
       LEFT JOIN users u ON u.username = c.creator
       WHERE c.status='published' AND c.visibility='public' AND c.id=?
       LIMIT 1`;
    logger.debug('service.characters.get.sql', { sql, params: [id] });
    const [rows] = await pool.query(sql, [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      gender: r.gender,
      avatar: r.avatar,
      creator: r.creator,
      age: r.age,
      occupation: r.occupation,
      tagline: r.tagline,
      personality: r.personality,
      relationship: r.relationship,
      plot_theme: r.plot_theme,
      plot_summary: r.plot_summary,
      openingLine: r.opening_line,
      character_type: r.character_type,
      tags: r.tags ? r.tags.split(',') : [],
    };
  } catch (err) {
    logger.error('service.characters.get.error', { message: err?.message, stack: err?.stack, params: { id } });
    return null;
  }
};
