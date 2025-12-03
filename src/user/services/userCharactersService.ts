import { authFetch } from './http'

export const listUserCharacters = async () => {
  const res = await authFetch('/user-characters')
  if (!res.ok) throw new Error('failed')
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

export const getUserCharacter = async (id: number | string) => {
  const res = await authFetch(`/user-characters/${id}`)
  if (!res.ok) throw new Error('failed')
  return await res.json()
}

export const createUserCharacter = async (payload: any) => {
  const body = {
    name: payload?.name || '未命名',
    age: typeof payload?.age === 'number' ? payload.age : (typeof payload?.age === 'string' ? (parseInt(payload.age) || null) : null),
    gender: payload?.gender || '未透露',
    profession: payload?.profession ?? payload?.occupation ?? null,
    basic_info: payload?.basicInfo ?? null,
    personality: payload?.personality ?? null,
    avatar: payload?.avatar ?? null,
  }
  const res = await authFetch('/user/chat-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('create_failed')
  const data = await res.json()
  return data.id as number
}

export const createCharacter = async (payload: any) => {
  const res = await authFetch('/user-characters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('create_character_failed')
  const data = await res.json()
  return data.id as number
}

export const createUserCharacterDraft = async (payload: any) => {
  const res = await authFetch('/user-characters/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('create_draft_failed')
  const data = await res.json()
  return data.id as number
}

export const updateUserCharacterDraft = async (id: number | string, payload: any) => {
  const res = await authFetch(`/user-characters/${id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('update_draft_failed')
  return true
}

export const updateUserCharacter = async (id: number | string, payload: any) => {
  const res = await authFetch(`/user-characters/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('update_failed')
  return true
}

export const deleteUserCharacter = async (id: number | string) => {
  const res = await authFetch(`/user-characters/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete_failed')
  return true
}
