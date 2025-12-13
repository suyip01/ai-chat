import { BASE_URL } from '../api'

const getAccessToken = () => localStorage.getItem('user_access_token') || ''
const getRefreshToken = () => localStorage.getItem('user_refresh_token') || ''

const setAccessToken = (t: string) => { if (t) localStorage.setItem('user_access_token', t) }

let refreshPromise: Promise<string | null> | null = null

export const authFetch = async (path: string, init: RequestInit = {}) => {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers(init.headers || {})
  let at = getAccessToken()
  if (at) headers.set('Authorization', `Bearer ${at}`)

  let res = await fetch(url, { ...init, headers })

  if (res.status === 401) {
    const rt = getRefreshToken()
    if (!rt) {
      try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch { }
      try { window.location.reload() } catch { }
      return res
    }

    // Reuse existing refresh promise or create new one
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const rf = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: rt })
          })
          if (rf.ok) {
            const data = await rf.json()
            if (data?.access_token) {
              setAccessToken(data.access_token)
              return data.access_token as string
            }
          }
          // Refresh failed
          try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch { }
          try { window.location.reload() } catch { }
          return null
        } catch {
          return null
        } finally {
          refreshPromise = null
        }
      })()
    }

    const newAt = await refreshPromise
    if (newAt) {
      const retryHeaders = new Headers(init.headers || {})
      retryHeaders.set('Authorization', `Bearer ${newAt}`)
      res = await fetch(url, { ...init, headers: retryHeaders })
    }
  }

  return res
}
