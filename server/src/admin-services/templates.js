import pool from '../db.js';
import { audit } from '../utils/audit.js';

export const listTemplates = async () => {
  audit('admin_service', { op: 'listTemplates' })
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.type, t.creator, t.content, t.ref_count, t.is_default, t.created_at,
            GROUP_CONCAT(tt.tag) AS tags
     FROM templates t
     LEFT JOIN template_tags tt ON tt.template_id = t.id
     GROUP BY t.id
     ORDER BY t.is_default DESC, t.created_at ASC`
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    creator: r.creator,
    content: r.content || null,
    refCount: r.ref_count,
    isDefault: !!r.is_default,
    tags: r.tags ? r.tags.split(',') : [],
    createdAt: r.created_at,
  }));
};

export const createTemplate = async ({ name, type, tags = [], content = null, creator = 'Admin' }) => {
  audit('admin_service', { op: 'createTemplate', name, type })
  const id = Date.now();
  await pool.query(
    'INSERT INTO templates (id, name, type, creator, content, ref_count, is_default) VALUES (?,?,?,?,?,0,0)',
    [id, name, type, creator, content]
  );
  if (tags.length) {
    const values = tags.map(tag => [id, tag]);
    await pool.query('INSERT INTO template_tags (template_id, tag) VALUES ?', [values]);
  }
  return id;
};

export const updateTemplate = async (id, { name, type, tags = [], content }) => {
  audit('admin_service', { op: 'updateTemplate', id })
  await pool.query('UPDATE templates SET name=?, type=?, content=? WHERE id=?', [name, type, content, id]);
  await pool.query('DELETE FROM template_tags WHERE template_id=?', [id]);
  if (tags.length) {
    const values = tags.map(tag => [id, tag]);
    await pool.query('INSERT INTO template_tags (template_id, tag) VALUES ?', [values]);
  }
};

export const deleteTemplate = async (id) => {
  audit('admin_service', { op: 'deleteTemplate', id })
  const [res] = await pool.query('DELETE FROM templates WHERE id=?', [id]);
  return res.affectedRows > 0;
};

export const copyTemplate = async (id) => {
  audit('admin_service', { op: 'copyTemplate', id })
  const [rows] = await pool.query('SELECT id, name, type, creator, content FROM templates WHERE id=?', [id]);
  if (!rows.length) return null;
  const tpl = rows[0];
  const newId = Date.now();
  await pool.query('INSERT INTO templates (id, name, type, creator, content, ref_count, is_default) VALUES (?,?,?,?,?,0,0)', [newId, `${tpl.name}_copy`, tpl.type, tpl.creator, tpl.content]);
  const [tagRows] = await pool.query('SELECT tag FROM template_tags WHERE template_id=?', [id]);
  if (tagRows.length) {
    const values = tagRows.map(r => [newId, r.tag]);
    await pool.query('INSERT INTO template_tags (template_id, tag) VALUES ?', [values]);
  }
  return newId;
};

export const setDefaultTemplate = async (id) => {
  audit('admin_service', { op: 'setDefaultTemplate', id })
  await pool.query('UPDATE templates SET is_default=0');
  await pool.query('UPDATE templates SET is_default=1 WHERE id=?', [id]);
};
