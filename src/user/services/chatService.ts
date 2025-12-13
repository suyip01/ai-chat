import { UserPersona } from '../types'

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
  const { authFetch } = await import('./http')
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
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/chat-role/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('update_role_failed')
  return true
}



export const fetchUserChatRoles = async (): Promise<Array<{ id: number; name: string; age: number | null; gender: string; profession: string | null; basic_info: string | null; personality: string | null; avatar: string | null }>> => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/chat-role`, { method: 'GET' })
  if (!res.ok) throw new Error('fetch_roles_failed')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export const deleteUserChatRole = async (id: number) => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/chat-role/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete_role_failed')
  return true
}

export const createChatSession = async (characterId: string|number, userChatRoleId?: number): Promise<{ sessionId: string; model?: { id: string; nickname: string }; temperature?: number }> => {
  const payload: any = { character_id: Number(characterId) }
  if (typeof userChatRoleId === 'number') payload.user_chat_role_id = userChatRoleId
  const { authFetch } = await import('./http')
  const res = await authFetch(`/chat/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('create_session_failed')
  const data = await res.json()
  if (typeof data === 'string') return { sessionId: data }
  return { sessionId: data.sessionId, model: data.model, temperature: data.temperature }
}



// Deprecated: connectChatWs removed in favor of sharedChatWs

export const listModels = async (): Promise<Array<{ id: string; nickname: string }>> => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/chat/models`, { method: 'GET' })
  if (!res.ok) throw new Error('list_models_failed')
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}



const pendingSessionRequests = new Map<string, Promise<any>>();

export const getSessionInfo = async (sessionId: string): Promise<{ model?: { id: string; nickname: string }; temperature?: number; session?: { sid: string; userId: string; characterId: string; userRoleId?: string; created_at?: string } }> => {
  if (pendingSessionRequests.has(sessionId)) {
    return pendingSessionRequests.get(sessionId);
  }

  const promise = (async () => {
    try {
      const { authFetch } = await import('./http')
      const res = await authFetch(`/chat/sessions/${sessionId}`, { method: 'GET' })
      if (!res.ok) {
        if (res.status === 404) {
          const err: any = new Error('session_not_found')
          err.status = 404
          throw err
        }
        throw new Error('get_session_failed')
      }
      const data = await res.json()
      const sess = data?.session || {}
      return { model: (sess as any)?.model, temperature: (sess as any)?.temperature, session: sess }
    } finally {
      pendingSessionRequests.delete(sessionId)
    }
  })()

  pendingSessionRequests.set(sessionId, promise)
  return promise
}

export const closeSession = async (sessionId: string): Promise<boolean> => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/chat/sessions/${sessionId}/close`, { method: 'POST' })
  return !!res && res.ok
}
