const BASE_URL = 'http://localhost:3001/api/admin';

const getToken = () => localStorage.getItem('admin_access_token') || '';
const getRefresh = () => localStorage.getItem('admin_refresh_token') || '';
const saveTokens = (access, refresh) => {
  if (access) localStorage.setItem('admin_access_token', access);
  if (refresh) localStorage.setItem('admin_refresh_token', refresh);
};
const logout = () => {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  if (window.history && window.history.replaceState) window.history.replaceState(null, '', '/super-admin/login');
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

const request = async (path, options = {}) => {
  const opts = { ...options };
  opts.headers = { ...(opts.headers || {}), ...authHeaders() };
  let res = await fetch(`${BASE_URL}${path}`, opts);
  if (res.status === 401) {
    const rt = getRefresh();
    if (!rt) { logout(); throw new Error('unauthorized'); }
    const r = await fetch(`${BASE_URL}/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
    if (!r.ok) { logout(); throw new Error('refresh_failed'); }
    const data = await r.json();
    saveTokens(data.access_token, data.refresh_token);
    opts.headers = { ...(opts.headers || {}), ...authHeaders() };
    res = await fetch(`${BASE_URL}${path}`, opts);
    if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  }
  if (!res.ok) throw new Error('failed');
  return res.json();
};

export const templatesAPI = {
  async list() { return request('/templates'); },
  async create(payload) { return request('/templates', { method: 'POST', body: JSON.stringify(payload) }); },
  async update(id, payload) { return request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); },
  async remove(id) { return request(`/templates/${id}`, { method: 'DELETE' }); },
  async copy(id) { return request(`/templates/${id}/copy`, { method: 'POST' }); },
  async setDefault(id) { return request(`/templates/${id}/default`, { method: 'POST' }); },
};
