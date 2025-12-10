export const BASE_URL = '/api';

export const userAuthAPI = {
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    let data = null;
    try { data = await res.json(); } catch { data = null }
    return { ok: res.ok, status: res.status, data };
  },
};
