export type MyStory = {
  id: number | string
  title: string
  description?: string
  image?: string
  status?: 'published' | 'draft'
  tags?: string[]
}

const mapListItem = (it: any): MyStory => ({
  id: typeof it?.mypage_id === 'number' ? it.mypage_id : (it?.id ?? Date.now()),
  title: it?.mypage_title ?? it?.title ?? '',
  description: it?.mypage_description ?? it?.description ?? '',
  image: it?.mypage_image ?? it?.image ?? '',
  status: it?.mypage_status ?? it?.status ?? undefined,
  tags: Array.isArray(it?.tags) ? it.tags : []
})

export const listUserStories = async (opts?: { includeDrafts?: boolean }) => {
  const qs = new URLSearchParams()
  if (opts && typeof opts.includeDrafts === 'boolean') qs.set('includeDrafts', String(opts.includeDrafts))
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/stories?${qs.toString()}`)
  if (!res.ok) throw new Error('failed')
  const data = await res.json()
  const items = Array.isArray(data?.items) ? data.items : []
  return items.map(mapListItem)
}

export const getUserStory = async (id: number | string) => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/stories/${id}`)
  if (!res.ok) throw new Error('failed')
  const data = await res.json()
  return {
    id: data?.id ?? id,
    title: data?.title ?? '',
    description: data?.description ?? '',
    image: data?.image ?? '',
    user_avatar: data?.user_avatar ?? '',
    status: data?.status ?? undefined,
    content: data?.content ?? '',
    publishDate: data?.publish_date ?? undefined,
    tags: Array.isArray(data?.tags) ? data.tags : [],
    characterIds: Array.isArray(data?.characterIds) ? data.characterIds : []
  }
}

export const createUserStory = async (payload: { title: string; description?: string; image?: string; status: 'published'|'draft'; content: string; tags?: string[]; characterIds?: Array<number|string> }) => {
  const { authFetch } = await import('./http')
  const res = await authFetch('/user/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('failed')
  const data = await res.json()
  return data?.id
}

export const updateUserStory = async (id: number | string, payload: { title: string; description?: string; image?: string; status?: 'published'|'draft'; content: string; tags?: string[]; characterIds?: Array<number|string> }) => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/stories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('failed')
  return true
}

export const deleteUserStory = async (id: number | string) => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/user/stories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('failed')
  return true
}
