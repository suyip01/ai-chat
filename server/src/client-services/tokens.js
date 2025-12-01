import pool from '../db.js';

export const pruneRefreshTokens = async (userId, limit = 2) => {
  const [rows] = await pool.query(
    'SELECT id FROM user_refresh_tokens WHERE user_id=? AND revoked=0 ORDER BY issued_at ASC',
    [userId]
  );
  if (rows.length > limit) {
    const toRevoke = rows.slice(0, rows.length - limit).map(r => r.id);
    await pool.query('UPDATE user_refresh_tokens SET revoked=1 WHERE id IN (?)', [toRevoke]);
  }
};
