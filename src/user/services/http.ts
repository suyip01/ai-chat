import { BASE_URL } from '../api'

const getAccessToken = () => localStorage.getItem('user_access_token') || ''
const getRefreshToken = () => localStorage.getItem('user_refresh_token') || ''

const setAccessToken = (t: string) => { if (t) localStorage.setItem('user_access_token', t) }

export const authFetch = async (path: string, init: RequestInit = {}) => {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers(init.headers || {})
  const at = getAccessToken()
  if (at) headers.set('Authorization', `Bearer ${at}`)
  const res = await fetch(url, { ...init, headers })
  if (res.status !== 401) return res
  const rt = getRefreshToken()
  if (!rt) {
    try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch {}
    try { window.location.reload() } catch {}
    return res
  }
  try {
    const rf = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    })
    if (rf.ok) {
      const data = await rf.json()
      if (data?.access_token) setAccessToken(data.access_token)
      const retryHeaders = new Headers(init.headers || {})
      retryHeaders.set('Authorization', `Bearer ${data.access_token}`)
      const retry = await fetch(url, { ...init, headers: retryHeaders })
      if (retry.status === 401) {
        try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch {}
        try { window.location.reload() } catch {}
      }
      return retry
    }
    if (rf.status === 401) {
      try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch {}
      try { window.location.reload() } catch {}
    }
  } catch {}
  return res
}
