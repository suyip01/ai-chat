import pool from '../db.js';

const ensureSettings = async () => {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id=1');
  if (!rows.length) {
    await pool.query('INSERT INTO settings (id, selected_model, selected_chat_model, selected_story_model, model_temperature, chat_temperature, story_temperature) VALUES (1, ?, ?, ?, ?, ?, ?)', ['gpt-4o', 'gpt-4o', 'gpt-4o', 0.10, 0.10, 0.10]);
  }
};

export const getSettings = async () => {
  await ensureSettings();
  const [rows] = await pool.query('SELECT * FROM settings WHERE id=1');
  return rows[0];
};

export const updateSettings = async (payload) => {
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
};
