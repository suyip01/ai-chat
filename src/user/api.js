export const BASE_URL = '/api/client';

const getToken = () => localStorage.getItem('user_access_token') || '';
const getRefresh = () => localStorage.getItem('user_refresh_token') || '';

const logout = () => {
    localStorage.removeItem('user_access_token');
    localStorage.removeItem('user_refresh_token');
    if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/login';
    }
};

const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
});

let refreshingPromise = null;
const refreshOnce = async () => {
    const r = await fetch(`${BASE_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: getRefresh() })
    });
    if (!r.ok) throw new Error('refresh_failed');
    const d = await r.json();
    if (d.access_token) localStorage.setItem('user_access_token', d.access_token);
    if (d.refresh_token) localStorage.setItem('user_refresh_token', d.refresh_token);
    return d.access_token;
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
        } catch (e) {
            logout();
            throw e;
        } finally {
            refreshingPromise = null;
        }
        const baseHeaders2 = authHeaders();
        const jsonHeader2 = isFormData ? {} : { 'Content-Type': 'application/json' };
        opts.headers = { ...(opts.headers || {}), ...jsonHeader2, ...baseHeaders2 };
        res = await fetch(`${BASE_URL}${path}`, opts);
        if (res.status === 401) { logout(); throw new Error('unauthorized'); }
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'request_failed');
    }
    return res.json();
};

export const userAuthAPI = {
    async getPublicKey() {
        const r = await fetch(`${BASE_URL}/crypto/public-key`);
        return r.text();
    },
    async login(username, passwordEncrypted) {
        const res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password_encrypted: passwordEncrypted })
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    }
};
