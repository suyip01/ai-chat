export const BASE_URL = '/api/admin';

const getToken = () => localStorage.getItem('admin_access_token') || '';
const getRefresh = () => localStorage.getItem('admin_refresh_token') || '';
const saveTokens = (access, refresh) => {
  if (access) localStorage.setItem('admin_access_token', access);
  if (refresh) localStorage.setItem('admin_refresh_token', refresh);
};
const logout = () => {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  const url = '/super-admin/login';
  if (typeof window !== 'undefined' && window.location) {
    if (typeof window.location.replace === 'function') {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  }
};

const authHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
});

let refreshingPromise = null;
const refreshOnce = async () => {
  const rt = getRefresh();
  if (!rt) { logout(); throw new Error('unauthorized'); }
  const r = await fetch(`${BASE_URL}/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
  if (!r.ok) { logout(); throw new Error('refresh_failed'); }
  const data = await r.json();
  saveTokens(data.access_token, data.refresh_token);
  return data;
};

const request = async (path, options = {}) => {
  const opts = { ...options };
  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const baseHeaders = authHeaders();
  const jsonHeader = isFormData ? {} : { 'Content-Type': 'application/json' };
  opts.headers = { ...(opts.headers || {}), ...jsonHeader, ...baseHeaders };
  let res = await fetch(`${BASE_URL}${path}`, opts);
  if (res.status === 401) {
    if (!refreshingPromise) refreshingPromise = refreshOnce();
    try {
      await refreshingPromise;
    } finally {
      refreshingPromise = null;
    }
    const baseHeaders2 = authHeaders();
    const jsonHeader2 = isFormData ? {} : { 'Content-Type': 'application/json' };
    opts.headers = { ...(opts.headers || {}), ...jsonHeader2, ...baseHeaders2 };
    res = await fetch(`${BASE_URL}${path}`, opts);
    if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  }
  if (!res.ok) throw new Error('failed');
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    console.error('[admin.api.request] failed', { path, status: res.status, body });
    throw new Error('failed');
  }
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

export const charactersAPI = {
  async list(params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/characters${qs}`);
  },
  async get(id) { return request(`/characters/${id}`); },
  async create(payload) { return request('/characters', { method: 'POST', body: JSON.stringify(payload) }); },
  async update(id, payload) { return request(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); },
  async remove(id) { return request(`/characters/${id}`, { method: 'DELETE' }); },
  async setStatus(id, status) { return request(`/characters/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); },
};

export const modelsAPI = {
  async list() { return request('/models'); },
  async create(payload) { return request('/models', { method: 'POST', body: JSON.stringify(payload) }); },
  async remove(id) { return request(`/models/${id}`, { method: 'DELETE' }); },
};

export const settingsAPI = {
  async get() { return request('/settings'); },
  async save(payload) { return request('/settings', { method: 'PUT', body: JSON.stringify(payload) }); },
};

export const syspromptAPI = {
  async generate(payload) {
    return request('/sysprompt/generate', { method: 'POST', body: JSON.stringify(payload) });
  },
};

export const uploadAPI = {
  async avatar(file) {
    const fd = new FormData();
    fd.append('avatar', file);
    return request('/uploads/avatar', { method: 'POST', body: fd });
  },
};

export const usersAPI = {
  async list(q) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return request(`/users${qs}`);
  },
  async create({ username, email, password, chatLimit }) {
    return request('/users', { method: 'POST', body: JSON.stringify({ username, email, password, chatLimit }) });
  },
  async update(id, payload) {
    return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async remove(id) {
    return request(`/users/${id}`, { method: 'DELETE' });
  },
  async changePassword(id, password) {
    return request(`/users/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) });
  },
};

export const adminsAPI = {
  async list(q) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return request(`/admins${qs}`);
  },
  async create({ username, email, password }) {
    return request('/admins', { method: 'POST', body: JSON.stringify({ username, email, password }) });
  },
  async update(id, payload) {
    return request(`/admins/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async remove(id) {
    return request(`/admins/${id}`, { method: 'DELETE' });
  },
  async changePassword(id, password) {
    return request(`/admins/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) });
  },
};
