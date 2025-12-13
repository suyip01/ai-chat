export type StoryPreview = {
  id: number | string
  title: string
  description?: string
  image?: string
  tags?: string[]
  author?: string
}

export const listStories = async (params?: { limit?: number; offset?: number; search?: string }) => {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.limit) qs.set('limit', String(params.limit))
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset))
  const { authFetch } = await import('./http')
  const res = await authFetch(`/stories?${qs.toString()}`)
  if (!res.ok) throw new Error('failed')
  const data = await res.json()
  const items = Array.isArray(data?.items) ? data.items : []
  return items as StoryPreview[]
}

export const getStory = async (id: string | number) => {
  const { authFetch } = await import('./http')
  const res = await authFetch(`/stories/${id}`)
  if (!res.ok) throw new Error('failed')
  const data = await res.json()
  return data as {
    id: number | string
    title: string
    description?: string
    image?: string
    author?: string
    content?: string
    publish_date?: string
    tags?: string[]
  }
}
