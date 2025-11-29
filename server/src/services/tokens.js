import pool from '../db.js';

export const pruneRefreshTokens = async (adminId, limit = 2) => {
  const [rows] = await pool.query(
    'SELECT id FROM admin_refresh_tokens WHERE admin_id=? AND revoked=0 ORDER BY issued_at ASC',
    [adminId]
  );
  if (rows.length > limit) {
    const toRevoke = rows.slice(0, rows.length - limit).map(r => r.id);
    // revoke oldest active tokens beyond the limit
    await pool.query('UPDATE admin_refresh_tokens SET revoked=1 WHERE id IN (?)', [toRevoke]);
  }
};

