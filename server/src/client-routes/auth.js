import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { pruneRefreshTokens } from '../client-services/tokens.js';
import { getPublicKeyPem } from '../crypto.js';

const router = Router();

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('[POST /api/auth/login] username=', username)
  if (!username || !password) return res.status(400).json({ error: 'missing_credentials' });
  try {
    const [rows] = await pool.query('SELECT id, username, email, password_hash, is_active FROM users WHERE username=?', [username]);
    if (rows.length === 0 || rows[0].is_active !== 1) return res.status(401).json({ error: 'invalid_account' });
    const ok = rows[0].password_hash ? bcrypt.compareSync(password, rows[0].password_hash) : false;
    if (!ok) return res.status(401).json({ error: 'invalid_password' });
    const accessExp = process.env.ACCESS_EXPIRES || process.env.TOKEN_EXPIRES || '30m';
    const refreshExp = process.env.REFRESH_EXPIRES || '7d';
    const accessToken = jwt.sign({ id: rows[0].id, username: rows[0].username, type: 'access' }, process.env.JWT_SECRET, { expiresIn: accessExp });
    const refreshToken = jwt.sign({ id: rows[0].id, username: rows[0].username, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: refreshExp });
    await pool.query('INSERT INTO user_refresh_tokens (user_id, token, issued_at, expires_at, revoked) VALUES (?,?,NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 0)', [rows[0].id, refreshToken]);
    await pruneRefreshTokens(rows[0].id, 2);
    console.log('[POST /api/auth/login] login ok userId=', rows[0].id)
    return res.json({ access_token: accessToken, refresh_token: refreshToken, expires_in: accessExp, user: { id: rows[0].id, username: rows[0].username, email: rows[0].email } });
  } catch (e) {
    console.error('[POST /api/auth/login] error:', e?.message || e)
    return res.status(500).json({ error: 'server_error' });
  }
});

router.get('/crypto/public-key', (req, res) => {
  res.type('text/plain').send(getPublicKeyPem());
});

router.post('/auth/refresh', async (req, res) => {
  try {
    const rt = req.body?.refresh_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    console.log('[POST /api/auth/refresh] has_token=', !!rt)
    if (!rt) return res.status(400).json({ error: 'missing_refresh_token' });
    let payload
    try { payload = jwt.verify(rt, process.env.JWT_SECRET) } catch { return res.status(401).json({ error: 'invalid_token' }) }
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'invalid_token_type' });
    const userId = payload.id
    const [[row]] = await pool.query('SELECT id, revoked FROM user_refresh_tokens WHERE user_id=? AND token=? LIMIT 1', [userId, rt]);
    if (!row || row.revoked === 1) return res.status(401).json({ error: 'revoked_refresh_token' });
    const accessExp = process.env.ACCESS_EXPIRES || process.env.TOKEN_EXPIRES || '30m';
    const accessToken = jwt.sign({ id: userId, username: payload.username, type: 'access' }, process.env.JWT_SECRET, { expiresIn: accessExp });
    console.log('[POST /api/auth/refresh] issue new access_token for userId=', userId)
    return res.json({ access_token: accessToken, expires_in: accessExp });
  } catch (e) {
    console.error('[POST /api/auth/refresh] error:', e?.message || e)
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
