import pool from '../db.js';
import bcrypt from 'bcryptjs';
import { audit } from '../utils/audit.js';
import { getRedis } from '../client-services/redis.js'

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
        nickname VARCHAR(64) NULL,
        avatar VARCHAR(255) DEFAULT '/uploads/avatars/default_avatar.jpg',
        email VARCHAR(255) NULL,
        password_hash VARCHAR(255) NULL,
        used_count INT DEFAULT 0,
        chat_limit INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        first_login_at DATETIME NULL,
        expire_after_login_minutes INT NULL,
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
    if (!names.has('nickname')) alters.push('ADD COLUMN nickname VARCHAR(64) NULL');
    if (!names.has('avatar')) alters.push("ADD COLUMN avatar VARCHAR(255) DEFAULT '/uploads/avatars/default_avatar.jpg'");
    if (!names.has('email')) alters.push('ADD COLUMN email VARCHAR(255) NULL');
    if (!names.has('used_count')) alters.push('ADD COLUMN used_count INT DEFAULT 0');
    if (!names.has('chat_limit')) alters.push('ADD COLUMN chat_limit INT DEFAULT 0');
    if (!names.has('is_active')) alters.push('ADD COLUMN is_active TINYINT DEFAULT 1');
    if (!names.has('first_login_at')) alters.push('ADD COLUMN first_login_at DATETIME NULL');
    if (!names.has('expire_after_login_minutes')) alters.push('ADD COLUMN expire_after_login_minutes INT NULL');
    if (alters.length) await pool.query(`ALTER TABLE users ${alters.join(', ')}`);
  }
};

export const listUsers = async (q) => {
  audit('admin_service', { op: 'listUsers', q })
  await ensureUsersSchema();
  const where = q ? 'WHERE username LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const [rows] = await pool.query(
    `SELECT 
        id,
        username,
        nickname,
        avatar,
        email,
        used_count AS used,
        chat_limit AS chatLimit,
        is_active AS isActive,
        created_at,
        expire_after_login_minutes AS expireMinutes
     FROM users ${where} ORDER BY created_at ASC`,
    params
  );
  return rows;
};

export const createUser = async ({ username, nickname = null, avatar = null, email = null, password, chatLimit = 0, expireAfterMinutes = null }) => {
  audit('admin_service', { op: 'createUser', username, email })
  await ensureUsersSchema();
  const id = Date.now();
  const hash = password ? bcrypt.hashSync(password, 10) : null;
  try {
    if (typeof avatar === 'string' && avatar.length) {
      await pool.query(
        'INSERT INTO users (id, username, nickname, avatar, email, password_hash, chat_limit, used_count, is_active, expire_after_login_minutes) VALUES (?,?,?,?,?,?,?,0,1,?)',
        [id, username, nickname, avatar, email, hash, chatLimit, (typeof expireAfterMinutes === 'number' ? expireAfterMinutes : null)]
      );
    } else {
      await pool.query(
        'INSERT INTO users (id, username, nickname, email, password_hash, chat_limit, used_count, is_active, expire_after_login_minutes) VALUES (?,?,?,?,?,?,0,1,?)',
        [id, username, nickname, email, hash, chatLimit, (typeof expireAfterMinutes === 'number' ? expireAfterMinutes : null)]
      );
    }
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      const err = new Error('duplicate_username')
      err.code = e.code
      throw err
    }
    const err = new Error('db_error')
    err.code = e?.code
    err.message = e?.message || String(e)
    throw err
  }
  return id;
};

export const updateUser = async (id, { nickname, avatar, email, chatLimit, isActive, expireAfterMinutes }) => {
  audit('admin_service', { op: 'updateUser', id })
  await ensureUsersSchema();
  const sets = [];
  const params = [];
  if (typeof nickname === 'string') { sets.push('nickname=?'); params.push(nickname); }
  if (typeof avatar === 'string') { sets.push('avatar=?'); params.push(avatar); }
  if (typeof email === 'string') { sets.push('email=?'); params.push(email); }
  if (typeof chatLimit === 'number') { sets.push('chat_limit=?'); params.push(chatLimit); }
  if (typeof isActive === 'number') { sets.push('is_active=?'); params.push(isActive); }
  if (typeof expireAfterMinutes === 'number') { sets.push('expire_after_login_minutes=?'); params.push(expireAfterMinutes); }
  if (!sets.length) return false;
  params.push(id);
  const [res] = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=?`, params);
  return res.affectedRows > 0;
};

export const deleteUser = async (id) => {
  audit('admin_service', { op: 'deleteUser', id })
  await ensureUsersSchema();
  const [res] = await pool.query('DELETE FROM users WHERE id=?', [id]);
  return res.affectedRows > 0;
};

export const changePassword = async (id, password) => {
  audit('admin_service', { op: 'changeUserPassword', id })
  await ensureUsersSchema();
  const hash = bcrypt.hashSync(password, 10);
  const [res] = await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, id]);
  return res.affectedRows > 0;
};

// 标记首次登录时间（需在用户首次登录成功时调用）
export const markFirstLogin = async (id) => {
  await ensureUsersSchema();
  await pool.query('UPDATE users SET first_login_at = COALESCE(first_login_at, CURRENT_TIMESTAMP) WHERE id=?', [id]);
};

// 定时任务：自动禁用已到期的测试用户
export const startAutoDeactivate = () => {
  const intervalMs = 60 * 1000; // 每分钟检查一次
  const tick = async () => {
    try {
      await ensureUsersSchema();
      // 如果系统未在登录流程中显式标记首次登录，可在用户产生使用行为后补记首次登录时间
      const [mark] = await pool.query(`UPDATE users
                   SET first_login_at = COALESCE(first_login_at, NOW())
                   WHERE expire_after_login_minutes IS NOT NULL
                     AND expire_after_login_minutes > 0
                     AND first_login_at IS NULL
                     AND used_count > 0`);
      if (mark && mark.affectedRows) audit('auto_deactivate_mark_first_login', { affectedRows: mark.affectedRows });
      const [toDisable] = await pool.query(`SELECT id FROM users
                   WHERE is_active = 1
                     AND expire_after_login_minutes IS NOT NULL
                     AND expire_after_login_minutes > 0
                     AND first_login_at IS NOT NULL
                     AND TIMESTAMPDIFF(MINUTE, first_login_at, NOW()) >= expire_after_login_minutes`)
      const ids = Array.isArray(toDisable) ? toDisable.map((r) => r.id).filter(Boolean) : []
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',')
        const [res] = await pool.query(`UPDATE users SET is_active = 0 WHERE id IN (${placeholders})`, ids)
        try {
          const r = await getRedis()
          for (const uid of ids) { try { await r.set(`user:active:${uid}`, '0', { EX: 600 }) } catch {} }
        } catch {}
        if (res && res.affectedRows) audit('auto_deactivate', { affectedRows: res.affectedRows, ids })
      }
    } catch (e) {
      audit('auto_deactivate_error', { message: e?.message || String(e) });
    }
  };
  // 立即执行一次，然后按间隔执行
  tick();
  setInterval(tick, intervalMs);
};
