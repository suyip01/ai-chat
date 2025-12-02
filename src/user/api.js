export const BASE_URL = '/api';

export const userAuthAPI = {
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('login_failed');
    return res.json();
  },
};

