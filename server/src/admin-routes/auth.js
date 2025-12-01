import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { pruneRefreshTokens } from '../admin-services/tokens.js';
import { getPublicKeyPem, decryptWithPrivateKey } from '../crypto.js';

const router = Router();

const ensureAdmin = async () => {
  const [rows] = await pool.query('SELECT id, username, password_hash, is_active FROM admins WHERE username=?', ['admin']);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    const id = Date.now();
    await pool.query('INSERT INTO admins (id, username, email, password_hash, is_active) VALUES (?,?,?,?,1)', [id, 'admin', 'admin@example.com', hash]);
  } else if (!rows[0].password_hash) {
    const hash = bcrypt.hashSync('admin', 10);
    await pool.query('UPDATE admins SET password_hash=? WHERE username=?', [hash, 'admin']);
  }
};

router.post('/login', async (req, res) => {
  const { username, password_encrypted } = req.body || {};
  if (!username || !password_encrypted) return res.status(400).json({ error: 'missing_credentials' });
  let password;
  try { password = decryptWithPrivateKey(password_encrypted); } catch { return res.status(400).json({ error: 'decrypt_failed' }); }
  try {
    await ensureAdmin();
    const [rows] = await pool.query('SELECT id, username, email, password_hash, is_active FROM admins WHERE username=?', [username]);
    if (rows.length === 0 || rows[0].is_active !== 1) return res.status(401).json({ error: 'invalid_account' });
    const ok = rows[0].password_hash ? bcrypt.compareSync(password, rows[0].password_hash) : password === 'admin';
    if (!ok) return res.status(401).json({ error: 'invalid_password' });
    const accessExp = process.env.ACCESS_EXPIRES || process.env.TOKEN_EXPIRES || '30m';
    const refreshExp = process.env.REFRESH_EXPIRES || '7d';
    const accessToken = jwt.sign({ id: rows[0].id, username: rows[0].username, type: 'access' }, process.env.JWT_SECRET, { expiresIn: accessExp });
    const refreshToken = jwt.sign({ id: rows[0].id, username: rows[0].username, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: refreshExp });
    await pool.query('INSERT INTO admin_refresh_tokens (admin_id, token, issued_at, expires_at, revoked) VALUES (?,?,NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 0)', [rows[0].id, refreshToken]);
    await pruneRefreshTokens(rows[0].id, 2);
    return res.json({ access_token: accessToken, refresh_token: refreshToken, expires_in: accessExp, admin: { id: rows[0].id, username: rows[0].username, email: rows[0].email } });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'missing_refresh_token' });
  try {
    let payload;
    try { payload = jwt.verify(refresh_token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'invalid_refresh_token' }); }
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'invalid_token_type' });
    const [rows] = await pool.query('SELECT id, admin_id, token, revoked, expires_at FROM admin_refresh_tokens WHERE token=? AND admin_id=?', [refresh_token, payload.id]);
    if (rows.length === 0) return res.status(401).json({ error: 'refresh_not_found' });
    const item = rows[0];
    if (item.revoked === 1) return res.status(401).json({ error: 'refresh_revoked' });
    const nowRes = await pool.query('SELECT NOW() as now');
    const now = new Date(nowRes[0][0].now);
    if (new Date(item.expires_at).getTime() <= now.getTime()) return res.status(401).json({ error: 'refresh_expired' });
    await pool.query('UPDATE admin_refresh_tokens SET revoked=1 WHERE id=?', [item.id]);
    const accessExp = process.env.ACCESS_EXPIRES || process.env.TOKEN_EXPIRES || '30m';
    const refreshExp = process.env.REFRESH_EXPIRES || '7d';
    const accessToken = jwt.sign({ id: payload.id, username: payload.username, type: 'access' }, process.env.JWT_SECRET, { expiresIn: accessExp });
    const newRefreshToken = jwt.sign({ id: payload.id, username: payload.username, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: refreshExp });
    await pool.query('INSERT INTO admin_refresh_tokens (admin_id, token, issued_at, expires_at, revoked) VALUES (?,?,NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 0)', [payload.id, newRefreshToken]);
    await pruneRefreshTokens(payload.id, 2);
    return res.json({ access_token: accessToken, refresh_token: newRefreshToken, expires_in: accessExp });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
});

router.get('/crypto/public-key', (req, res) => {
  res.type('text/plain').send(getPublicKeyPem());
});

export default router;
