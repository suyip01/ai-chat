import pool from '../db.js';
import bcrypt from 'bcryptjs';

export const listAdmins = async (q) => {
  const where = q ? 'WHERE username LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const [rows] = await pool.query(
    `SELECT id, username, nickname, avatar, email, is_active AS isActive, created_at AS createdAt, last_login_at AS lastLoginAt FROM admins ${where} ORDER BY created_at ASC`,
    params
  );
  return rows;
};

export const createAdmin = async ({ username, nickname = null, avatar = null, email = null, password }) => {
  const id = Date.now();
  const hash = bcrypt.hashSync(password, 10);
  if (typeof avatar === 'string' && avatar.length) {
    await pool.query(
      'INSERT INTO admins (id, username, nickname, avatar, email, password_hash, is_active) VALUES (?,?,?,?,?,?,1)',
      [id, username, nickname, avatar, email, hash]
    );
  } else {
    await pool.query(
      'INSERT INTO admins (id, username, nickname, email, password_hash, is_active) VALUES (?,?,?,?,?,1)',
      [id, username, nickname, email, hash]
    );
  }
  return id;
};

export const updateAdmin = async (id, { nickname, avatar, email, isActive }) => {
  const sets = [];
  const params = [];
  if (typeof nickname === 'string') { sets.push('nickname=?'); params.push(nickname); }
  if (typeof avatar === 'string') { sets.push('avatar=?'); params.push(avatar); }
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

export const getAdminAvatar = async (id) => {
  const [[row]] = await pool.query('SELECT avatar FROM admins WHERE id=? LIMIT 1', [id]);
  return row?.avatar || null;
};

export const updateAdminSelf = async (id, { nickname, password }) => {
  const sets = [];
  const params = [];
  if (typeof nickname === 'string') { sets.push('nickname=?'); params.push(nickname); }
  if (typeof password === 'string' && password.length > 0) {
    const hash = bcrypt.hashSync(password, 10);
    sets.push('password_hash=?'); params.push(hash);
  }
  if (!sets.length) return false;
  params.push(id);
  const [res] = await pool.query(`UPDATE admins SET ${sets.join(', ')} WHERE id=?`, params);
  return res.affectedRows > 0;
};
