import pool from '../db.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger({ area: 'client', component: 'service.characters' });

export const listPublishedCharacters = async ({ tag = null, limit = 24, offset = 0, visibility = 'public', search = '' } = {}) => {
  try {
    let whereBase = "c.status='published' AND c.visibility=?";
    const params = [visibility];

    if (tag) {
      whereBase += " AND EXISTS (SELECT 1 FROM character_tags ct WHERE ct.character_id=c.id AND ct.tag=?)";
      params.push(tag);
    }

    if (search) {
      whereBase += " AND (c.name LIKE ? OR c.tagline LIKE ? OR c.creator LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    params.push(limit, offset);
    const sql = `SELECT 
          c.id,
          c.name,
          c.avatar,
          c.creator,
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
          c.created_at,
          (SELECT GROUP_CONCAT(ct.tag) FROM character_tags ct WHERE ct.character_id=c.id) AS tags
       FROM characters c
       WHERE ${whereBase}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`;
    logger.debug('service.characters.list.sql', { sql, paramsShape: { visibility, limit, offset, hasTag: !!tag } });
    const [rows] = await pool.query(sql, params);
    const ids = Array.isArray(rows) ? rows.map(r => r.id).slice(0, 3) : [];
    logger.info('service.characters.list.result', { rowCount: rows.length, ids });
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
      created_at: r.created_at,
      tags: r.tags ? r.tags.split(',') : [],
    }));
  } catch (err) {
    logger.error('service.characters.list.error', { message: err?.message, stack: err?.stack, params: { tag, limit, offset, visibility } });
    return [];
  }
};

export const listPublicCharactersExcludeUser = async (excludeUsername, { limit = 10, offset = 0, search = '', excludeUserId = null, excludeNickname = null } = {}) => {
  try {
    let whereClause = "c.status='published' AND c.visibility='public' AND c.creator != ?";
    const params = [excludeUsername];

    if (excludeNickname) {
      whereClause += " AND c.creator != ?";
      params.push(excludeNickname);
    }

    if (excludeUserId) {
      whereClause += " AND (c.user_id != ? OR c.user_id IS NULL)";
      params.push(excludeUserId);
    }

    if (search) {
      whereClause += " AND (c.name LIKE ? OR c.tagline LIKE ? OR c.creator LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const sql = `SELECT 
          c.id,
          c.name,
          c.avatar,
          c.tagline,
          c.plot_summary,
          c.creator
       FROM characters c
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`;

    params.push(limit, offset);

    logger.debug('service.characters.listExclude.sql', { sql, params });
    const [rows] = await pool.query(sql, params);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      tagline: r.tagline,
      plot_summary: r.plot_summary,
      creator: r.creator
    }));
  } catch (err) {
    logger.error('service.characters.listExclude.error', { message: err?.message, stack: err?.stack, params: { excludeUsername, limit, offset } });
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
          c.creator,
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
