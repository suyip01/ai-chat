import pool from '../db.js';
import bcrypt from 'bcryptjs';

export const listAdmins = async (q) => {
  const where = q ? 'WHERE username LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const [rows] = await pool.query(
    `SELECT id, username, email, is_active AS isActive, created_at AS createdAt, last_login_at AS lastLoginAt FROM admins ${where} ORDER BY created_at ASC`,
    params
  );
  return rows;
};

export const createAdmin = async ({ username, email = null, password }) => {
  const id = Date.now();
  const hash = bcrypt.hashSync(password, 10);
  await pool.query(
    'INSERT INTO admins (id, username, email, password_hash, is_active) VALUES (?,?,?,?,1)',
    [id, username, email, hash]
  );
  return id;
};

export const updateAdmin = async (id, { email, isActive }) => {
  const sets = [];
  const params = [];
  if (typeof email === 'string') { sets.push('email=?'); params.push(email); }
  if (typeof isActive === 'number') { sets.push('is_active=?'); params.push(isActive); }
  if (!sets.length) return false;
  params.push(id);
  const [res] = await pool.query(`UPDATE admins SET ${sets.join(', ')} WHERE id=?`, params);
  return res.affectedRows > 0;
};

export const deleteAdmin = async (id) => {
  const [res] = await pool.query('DELETE FROM admins WHERE id=?', [id]);
  return res.affectedRows > 0;
};

export const changeAdminPassword = async (id, password) => {
  const hash = bcrypt.hashSync(password, 10);
  const [res] = await pool.query('UPDATE admins SET password_hash=? WHERE id=?', [hash, id]);
  return res.affectedRows > 0;
};

