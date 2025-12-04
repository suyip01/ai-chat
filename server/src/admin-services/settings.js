import pool from '../db.js';
import { getRedis } from '../client-services/redis.js';
import { audit } from '../utils/audit.js';

const ensureSettings = async () => {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id=1');
  if (!rows.length) {
    await pool.query('INSERT INTO settings (id, selected_model, selected_chat_model, selected_story_model, model_temperature, chat_temperature, story_temperature) VALUES (1, ?, ?, ?, ?, ?, ?)', ['gpt-4o', 'gpt-4o', 'gpt-4o', 0.10, 0.10, 0.10]);
  }
};

export const getSettings = async () => {
  audit('admin_service', { op: 'getSettings' })
  await ensureSettings();
  const [rows] = await pool.query('SELECT * FROM settings WHERE id=1');
  return rows[0];
};

export const updateSettings = async (payload) => {
  audit('admin_service', { op: 'updateSettings' })
  const {
    selected_model,
    selected_chat_model,
    selected_story_model,
    model_temperature,
    chat_temperature,
    story_temperature,
    default_template_id,
  } = payload;
  await ensureSettings();
  await pool.query(
    `UPDATE settings SET selected_model=?, selected_chat_model=?, selected_story_model=?, model_temperature=?, chat_temperature=?, story_temperature=?, default_template_id=? WHERE id=1`,
    [selected_model, selected_chat_model, selected_story_model, model_temperature, chat_temperature, story_temperature, default_template_id || null]
  );
  try {
    const r = await getRedis();
    let cursor = '0';
    let updated = 0;
    const match = 'chat:sess:*';
    do {
      const reply = await r.scan(cursor, { MATCH: match, COUNT: 200 });
      const nextCursor = Array.isArray(reply) ? reply[0] : (reply && reply.cursor) ? reply.cursor : '0';
      const keys = Array.isArray(reply) ? reply[1] : (reply && reply.keys) ? reply.keys : [];
      cursor = nextCursor;
      for (const k of keys) {
        await r.hSet(k, { model: String(selected_chat_model || ''), temperature: String(chat_temperature ?? '') });
        updated++;
      }
    } while (cursor !== '0');
    console.log('[admin:settings] redis sessions updated count=', updated, 'model=', selected_chat_model, 'temperature=', chat_temperature);
  } catch (e) {
    console.log('[admin:settings] redis update skipped or failed:', e?.message || e);
  }
};
