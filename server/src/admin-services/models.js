import pool from '../db.js';

export const listModels = async () => {
  const [rows] = await pool.query(
    'SELECT id, model_id, model_name, model_nickname, created_at FROM models ORDER BY created_at DESC'
  );
  return rows;
};

export const createModel = async ({ model_id, model_name, model_nickname = null }) => {
  const [res] = await pool.query(
    'INSERT INTO models (model_id, model_name, model_nickname) VALUES (?,?,?)',
    [model_id, model_name, model_nickname]
  );
  return res.insertId;
};

export const removeModel = async (id) => {
  const [res] = await pool.query('DELETE FROM models WHERE id=?', [id]);
  return res.affectedRows > 0;
};
