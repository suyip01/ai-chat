import jwt from 'jsonwebtoken';

export const authRequired = (req, res, next) => {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(t, process.env.JWT_SECRET);
    if (payload.type !== 'access') return res.status(401).json({ error: 'invalid_token_type' });
    req.admin = { id: payload.id, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
};
