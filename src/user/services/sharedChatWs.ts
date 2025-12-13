import { UserPersona } from '../types'
import { putSession, addMessage } from './chatDb'
import { getSessionInfo } from './chatService'

type AssistantHandler = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void
type ControlHandler = (payload: any) => void

const token = () => localStorage.getItem('user_access_token') || ''
const refreshToken = () => localStorage.getItem('user_refresh_token') || ''
const refreshAccessToken = async (): Promise<boolean> => {
  const rt = refreshToken()
  if (!rt) return false
  try {
    const base = location.origin
    const rf = await fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) })
    if (!rf.ok) return false
    const data = await rf.json()
    const at = data?.access_token || ''
    if (!at) return false
    try { localStorage.setItem('user_access_token', at) } catch { }
    return true
  } catch {
    return false
  }
}

class SharedChatWs {
  private ws: WebSocket | null = null
  private manualClose = false
  private backoff = 1000
  private readonly maxBackoff = 10000
  private queue: any[] = []
  private serverReady = false
  private readyTimer: any = null
  private firstRetryTime = 0
  private subscribers: Map<string, Set<AssistantHandler>> = new Map()
  private controlSubscribers: Set<ControlHandler> = new Set()
  private lastPayloadBySid: Map<string, any> = new Map()
  private sessionMeta: Map<string, { userId: string; characterId: string }> = new Map()
  private chunkAccumulators: Map<string, string> = new Map()
  private decodeJwtExp(tk: string): number | null {
    try {
      const parts = tk.split('.')
      if (parts.length < 2) return null
      const json = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      const exp = json && typeof json.exp === 'number' ? json.exp : null
      return exp
    } catch { return null }
  }
  private async ensureFreshToken(minRemainingMs = 300000): Promise<boolean> {
    try {
      const tk = token()
      if (!tk) return await refreshAccessToken()
      const exp = this.decodeJwtExp(tk)
      if (!exp) return await refreshAccessToken()
      const remain = exp * 1000 - Date.now()
      if (remain < minRemainingMs) {
        const ok = await refreshAccessToken()
        return ok
      }
      return true
    } catch { return false }
  }

  ensureConnected() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this.open()
    try { localStorage.setItem('ws_autoconnect', 'true') } catch { }
  }

  private open() {
    this.manualClose = false
    if (this.ws) {
      try {
        this.ws.onclose = null
        this.ws.onmessage = null
        this.ws.onopen = null
        this.ws.close()
      } catch { }
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${location.host}/ws/chat`
    const tk = token()
    const withQuery = tk ? `${url}?token=${encodeURIComponent(tk)}` : url
    this.ws = new WebSocket(withQuery)
    this.ws.onmessage = (ev) => {
      let data: any = null
      try { data = JSON.parse(String(ev.data)) } catch { }
      if (!data || typeof data !== 'object') return

      if (data.type === 'assistant_message') {
        const sid = String(data.sessionId || '')
        if (!sid) return
        const full = String(data.content || '')
        const prev = this.chunkAccumulators.get(sid) || ''
        let part = full
        if (full.startsWith(prev)) part = full.slice(prev.length)
        this.chunkAccumulators.set(sid, full)
        const handlers = this.subscribers.get(sid)
        try { console.log('[WS] onmessage assistant', { sid, chunkIndex: data.chunkIndex, chunkTotal: data.chunkTotal, handlers: handlers?.size || 0, partLen: part.length }) } catch { }
        if (handlers && handlers.size) {
          if (part.length) {
            handlers.forEach(h => { try { h(part, data.quote, { chunkIndex: data.chunkIndex, chunkTotal: data.chunkTotal }) } catch { } })
          }
        }
        if (part.length) {
          try {
            this.ensureSessionMeta(sid).then(meta => {
              const uid = meta.userId || (localStorage.getItem('user_id') || '0')
              const cid = meta.characterId || ''
              addMessage({ sessionId: sid, userId: uid, senderId: cid || String(data.characterId || ''), text: part, quote: data.quote, timestamp: Date.now(), type: 'TEXT' })
            }).catch(() => { })
          } catch { }
        }
        if (typeof data.chunkIndex === 'number' && typeof data.chunkTotal === 'number' && data.chunkIndex >= data.chunkTotal) {
          this.chunkAccumulators.delete(sid)
        }
        return
      }

      if (data.type === 'force_logout' || data.type === 'refresh_required' || data.type === 'ws_ready' || data.type === 'user_ack') {
        if (data.type === 'ws_ready') {
          this.serverReady = true
          if (this.readyTimer) { try { clearTimeout(this.readyTimer) } catch { }; this.readyTimer = null }
          while (this.queue.length) {
            const p = this.queue.shift()
            try { this.ws?.send(JSON.stringify(p)) } catch { }
          }
        } else {
          this.controlSubscribers.forEach(cb => { try { cb(data) } catch { } })
        }
      }
    }
    this.ws.onerror = (e) => { try { console.error('[ws] error', e) } catch { } }
    this.ws.onopen = () => {
      this.backoff = 1000
      this.firstRetryTime = 0
      this.serverReady = false
      if (this.readyTimer) { try { clearTimeout(this.readyTimer) } catch { }; this.readyTimer = null }
      this.readyTimer = setTimeout(() => {
        if (this.serverReady) return
        while (this.queue.length) {
          const p = this.queue.shift()
          try { this.ws?.send(JSON.stringify(p)) } catch { }
        }
      }, 300)
    }
    this.ws.onclose = async (ev) => {
      if (this.manualClose) return
      const needRefresh = ev && (ev.code === 1008 || String(ev.reason || '').toLowerCase().includes('unauthorized'))
      if (needRefresh) {
        const ok = await refreshAccessToken()
        if (ok) { this.backoff = 1000; this.firstRetryTime = 0; this.open(); return }
        try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch { }
        try { window.location.reload() } catch { }
        return
      }
      
      if (this.firstRetryTime === 0) {
        this.firstRetryTime = Date.now()
      }

      const elapsed = Date.now() - this.firstRetryTime
      let delay = this.backoff

      // Strategy: < 3 mins -> frequent (exp backoff), > 3 mins -> slow (2 mins)
      if (elapsed >= 3 * 60 * 1000) {
        delay = 2 * 60 * 1000
      } else {
        this.backoff = Math.min(this.backoff * 2, this.maxBackoff)
      }

      setTimeout(() => this.open(), delay)
    }
  }

  addControlListener(cb: ControlHandler) { this.controlSubscribers.add(cb) }
  removeControlListener(cb: ControlHandler) { this.controlSubscribers.delete(cb) }

  subscribe(sessionId: string, handler: AssistantHandler) {
    const existing = this.subscribers.get(sessionId)
    const set = existing || new Set<AssistantHandler>()
    if (set.has(handler)) { return }
    if (set.size >= 1) { set.clear() }
    set.add(handler)
    this.subscribers.set(sessionId, set)
    try { console.log('[WS] subscribe', { sessionId, count: set.size }) } catch { }
    this.ensureConnected()
    const uid = localStorage.getItem('user_id') || '0'
    try {
      const key = `ws_active_sessions_${uid}`
      const raw = localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) as string[] : []
      if (!arr.includes(sessionId)) { arr.push(sessionId); localStorage.setItem(key, JSON.stringify(arr)) }
    } catch { }
  }

  unsubscribe(sessionId: string, handler: AssistantHandler) {
    const set = this.subscribers.get(sessionId)
    if (!set) return
    set.delete(handler)
    try { console.log('[WS] unsubscribe', { sessionId, count: set.size }) } catch { }
    if (set.size === 0) this.subscribers.delete(sessionId)
  }

  sendText(sessionId: string, text: string, chatMode?: 'daily' | 'scene', userRole?: UserPersona, modelId?: string, temperature?: number, clientMsgId?: string) {
    const payload: any = { sessionId, text, chatMode }
    if (userRole) {
      payload.userRole = {
        name: userRole.name,
        gender: (userRole.gender === 'male' ? '男' : userRole.gender === 'female' ? '女' : '未透露'),
        age: userRole.age || '',
        profession: userRole.profession || '',
        basic_info: userRole.basicInfo || '',
        personality: userRole.personality || '',
        avatar: userRole.avatar || ''
      }
    }
    if (modelId) payload.model_id = modelId
    if (typeof temperature === 'number') payload.temperature = temperature
    if (clientMsgId) payload.client_msg_id = clientMsgId
    this.lastPayloadBySid.set(sessionId, payload)
    // Removed immediate DB write for user message
    ;(async () => {
      const ok = await this.ensureFreshToken()
      if (!ok) { try { console.warn('[WS] token refresh failed before send') } catch {} }
      const data = JSON.stringify(payload)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(data)
      else this.queue.push(payload)
    })()
  }

  sendTyping(sessionId: string, typing: boolean) {
    const payload = { type: 'typing', sessionId, typing }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload))
    else this.queue.push(payload)
  }

  close() { this.manualClose = true; try { this.ws?.close() } catch { } }

  cleanup() {
    this.manualClose = true
    if (this.readyTimer) { try { clearTimeout(this.readyTimer) } catch { } }
    if (this.ws) {
      try {
        this.ws.onclose = null
        this.ws.onmessage = null
        this.ws.onopen = null
        this.ws.close()
      } catch { }
    }
    this.subscribers.clear()
    this.controlSubscribers.clear()
  }

  private async ensureSessionMeta(sid: string): Promise<{ userId: string; characterId: string }> {
    const cached = this.sessionMeta.get(sid)
    if (cached) return cached
    try {
      const info: any = await getSessionInfo(sid)
      const userId = String(info?.session?.userId || localStorage.getItem('user_id') || '0')
      const characterId = String(info?.session?.characterId || '')
      const meta = { userId, characterId }
      this.sessionMeta.set(sid, meta)
      if (characterId && userId) { try { await putSession({ sessionId: sid, userId, characterId }) } catch { } }
      return meta
    } catch {
      const meta = { userId: localStorage.getItem('user_id') || '0', characterId: '' }
      this.sessionMeta.set(sid, meta as any)
      return meta as any
    }
  }
}
const GLOBAL_KEY = '__SHARED_CHAT_WS_INSTANCE__'
if ((window as any)[GLOBAL_KEY]) {
  try {
    (window as any)[GLOBAL_KEY].cleanup()
  } catch (e) {
    try { console.warn('[SharedChatWs] cleanup failed', e) } catch {}
  }
}

const instance = new SharedChatWs()
;(window as any)[GLOBAL_KEY] = instance
export const sharedChatWs = instance
