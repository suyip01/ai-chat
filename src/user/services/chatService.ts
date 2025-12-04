import { BASE_URL } from '../api'
import { authFetch } from './http'
import { Message, MessageType, UserPersona } from '../types'

const token = () => localStorage.getItem('user_access_token') || ''

const genderMap = (g?: 'male'|'female'|'secret') => {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return '未透露'
}

export const ensureUserChatRole = async (persona?: UserPersona) => {
  const body = {
    name: persona?.name || '未命名',
    age: parseInt(persona?.age || '0') || null,
    gender: genderMap(persona?.gender),
    profession: persona?.profession || null,
    basic_info: persona?.basicInfo || null,
    personality: persona?.personality || null,
    avatar: persona?.avatar || null,
  }
  const res = await authFetch(`/user/chat-role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('create_role_failed')
  const data = await res.json()
  return data.id as number
}

export const updateUserChatRole = async (id: number, persona?: UserPersona) => {
  const body = {
    name: persona?.name || '未命名',
    age: parseInt(persona?.age || '0') || null,
    gender: genderMap(persona?.gender),
    profession: persona?.profession || null,
    basic_info: persona?.basicInfo || null,
    personality: persona?.personality || null,
    avatar: persona?.avatar || null,
  }
  const res = await authFetch(`/user/chat-role/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('update_role_failed')
  return true
}

export const upsertUserChatRole = async (persona?: UserPersona) => {
  const existing = localStorage.getItem('user_chat_role_id')
  const body = {
    name: persona?.name || '未命名',
    age: parseInt(persona?.age || '0') || null,
    gender: genderMap(persona?.gender),
    profession: persona?.profession || null,
    basic_info: persona?.basicInfo || null,
    personality: persona?.personality || null,
    avatar: persona?.avatar || null,
  }
  if (existing) {
    const id = parseInt(existing)
    const res = await fetch(`${BASE_URL}/user/chat-role/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error('update_role_failed')
    return id
  }
  const id = await ensureUserChatRole(persona)
  localStorage.setItem('user_chat_role_id', String(id))
  return id
}

export const fetchUserChatRoles = async (): Promise<Array<{ id: number; name: string; age: number | null; gender: string; profession: string | null; basic_info: string | null; personality: string | null; avatar: string | null }>> => {
  const res = await authFetch(`/user/chat-role`, { method: 'GET' })
  if (!res.ok) throw new Error('fetch_roles_failed')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export const createChatSession = async (characterId: string|number, userChatRoleId?: number): Promise<{ sessionId: string; model?: { id: string; nickname: string }; temperature?: number }> => {
  const payload: any = { character_id: Number(characterId) }
  if (typeof userChatRoleId === 'number') payload.user_chat_role_id = userChatRoleId
  const res = await authFetch(`/chat/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('create_session_failed')
  const data = await res.json()
  if (typeof data === 'string') return { sessionId: data }
  return { sessionId: data.sessionId, model: data.model, temperature: data.temperature }
}

export const fetchHistory = async (_sessionId: string, _limit = 100): Promise<Message[]> => {
  return []
}

export const connectChatWs = (sessionId: string, onAssistantMessage: (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void) => {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const wsOrigin = `${proto}://${location.host}`
  const url = `${wsOrigin}/ws/chat`
  console.log('[ws] connecting', url)
  let ws: WebSocket | null = null
  let manualClose = false
  let backoff = 1000
  const maxBackoff = 10000
  const queue: any[] = []

  const open = () => {
    ws = new WebSocket(url)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data))
        if (data && data.type === 'assistant_message' && typeof data.content === 'string') onAssistantMessage(data.content, data.quote, { chunkIndex: data.chunkIndex, chunkTotal: data.chunkTotal })
      } catch {}
    }
    ws.onerror = (e) => { console.error('[ws] error', e) }
    ws.onopen = () => {
      console.log('[ws] open')
      backoff = 1000
      while (queue.length) {
        const p = queue.shift()
        try { ws?.send(JSON.stringify(p)) } catch {}
      }
      const typingFalse = { type: 'typing', sessionId, typing: false }
      try { ws?.send(JSON.stringify(typingFalse)) } catch {}
    }
    ws.onclose = () => {
      console.log('[ws] closed')
      if (!manualClose) {
        setTimeout(open, backoff)
        backoff = Math.min(backoff * 2, maxBackoff)
      }
    }
  }
  open()
  const sendText = (text: string, chatMode?: 'daily'|'scene', userRole?: UserPersona) => {
    const payload: any = { sessionId, text, chatMode }
    if (userRole) {
      payload.userRole = {
        name: userRole.name,
        gender: genderMap(userRole.gender),
        age: userRole.age || '',
        profession: userRole.profession || '',
        basic_info: userRole.basicInfo || '',
        personality: userRole.personality || '',
        avatar: userRole.avatar || ''
      }
    }
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
    else queue.push(payload)
  }
  const sendTyping = (typing: boolean) => {
    const payload = { type: 'typing', sessionId, typing }
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
    else queue.push(payload)
  }
  const close = () => { manualClose = true; try { ws?.close() } catch {} }
  return { ws, sendText, sendTyping, close }
}

export const listModels = async (): Promise<Array<{ id: string; nickname: string }>> => {
  const res = await authFetch(`/chat/models`, { method: 'GET' })
  if (!res.ok) throw new Error('list_models_failed')
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

export const updateSessionConfig = async (sessionId: string, cfg: { modelId?: string; temperature?: number }) => {
  const body: any = {}
  if (cfg.modelId) body.model_id = cfg.modelId
  if (typeof cfg.temperature === 'number') body.temperature = cfg.temperature
  const res = await authFetch(`/chat/sessions/${sessionId}/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('update_session_config_failed')
  return true
}

export const getSessionInfo = async (sessionId: string): Promise<{ model?: { id: string; nickname: string }; temperature?: number }> => {
  const res = await authFetch(`/chat/sessions/${sessionId}`, { method: 'GET' })
  if (!res.ok) throw new Error('get_session_failed')
  const data = await res.json()
  const sess = data?.session || {}
  return { model: sess?.model, temperature: sess?.temperature }
}
