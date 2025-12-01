import pool from '../db.js';
import bcrypt from 'bcryptjs';

export const ensureUsersSchema = async () => {
  const [tables] = await pool.query(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [process.env.DB_NAME, 'users']
  );
  if (!tables.length) {
    await pool.query(
      `CREATE TABLE users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(255) NULL,
        password_hash VARCHAR(255) NULL,
        used_count INT DEFAULT 0,
        chat_limit INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } else {
    const [cols] = await pool.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
      [process.env.DB_NAME, 'users']
    );
    const names = new Set(cols.map(r => r.COLUMN_NAME));
    const alters = [];
    if (!names.has('email')) alters.push('ADD COLUMN email VARCHAR(255) NULL');
    if (!names.has('used_count')) alters.push('ADD COLUMN used_count INT DEFAULT 0');
    if (!names.has('chat_limit')) alters.push('ADD COLUMN chat_limit INT DEFAULT 0');
    if (!names.has('is_active')) alters.push('ADD COLUMN is_active TINYINT DEFAULT 1');
    if (alters.length) await pool.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
};

export const listUsers = async (q) => {
  await ensureUsersSchema();
  const where = q ? 'WHERE username LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const [rows] = await pool.query(
    `SELECT id, username, email, used_count AS used, chat_limit AS chatLimit, is_active, created_at
     FROM users ${where} ORDER BY created_at ASC`,
    params
  );
  return rows;
};

export const createUser = async ({ username, email = null, password, chatLimit = 0 }) => {
  await ensureUsersSchema();
  const id = Date.now();
  const hash = password ? bcrypt.hashSync(password, 10) : null;
  await pool.query(
    'INSERT INTO users (id, username, email, password_hash, chat_limit, used_count, is_active) VALUES (?,?,?,?,?,0,1)',
    [id, username, email, hash, chatLimit]
  );
  return id;
};

export const updateUser = async (id, { email, chatLimit, isActive }) => {
  await ensureUsersSchema();
  const sets = [];
  const params = [];
  if (typeof email === 'string') { sets.push('email=?'); params.push(email); }
  if (typeof chatLimit === 'number') { sets.push('chat_limit=?'); params.push(chatLimit); }
  if (typeof isActive === 'number') { sets.push('is_active=?'); params.push(isActive); }
  if (!sets.length) return false;
  params.push(id);
  const [res] = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=?`, params);
  return res.affectedRows > 0;
};

export const deleteUser = async (id) => {
  await ensureUsersSchema();
  const [res] = await pool.query('DELETE FROM users WHERE id=?', [id]);
  return res.affectedRows > 0;
};

export const changePassword = async (id, password) => {
  await ensureUsersSchema();
  const hash = bcrypt.hashSync(password, 10);
  const [res] = await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, id]);
  return res.affectedRows > 0;
};

