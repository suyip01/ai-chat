import { Router } from 'express'
import { listStories, getStory } from '../admin-services/stories.js'
import { listPublishedCharacters, listPublicCharactersExcludeUser } from '../client-services/characters.js'
import { listUserCharacters } from '../client-services/userCharacters.js'
import { userAuthRequired } from '../middleware/userAuth.js'

const router = Router()
router.use(userAuthRequired)

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '12')
    const offset = parseInt(req.query.offset || '0')
    const search = (req.query.search || '').trim().toLowerCase()
    req.log.debug('stories.list.debug', { limit, offset, search })
    const items = await listStories()
    let published = (items || []).filter(it => String(it.status || '') === 'published')
    if (search) {
      published = published.filter(it =>
        (it.title && it.title.toLowerCase().includes(search)) ||
        (it.author && it.author.toLowerCase().includes(search)) ||
        (Array.isArray(it.tags) && it.tags.some(tag => String(tag).toLowerCase().includes(search)))
      )
    }
    const publishedSorted = published.sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime()
      const tb = new Date(b?.created_at || 0).getTime()
      return tb - ta
    })
    const paged = publishedSorted.slice(offset, offset + limit)
    const out = paged.map(it => ({
      id: it.id,
      title: it.title,
      description: it.description,
      image: it.image,
      author: it.author,
      created_at: it.created_at,
      tags: Array.isArray(it.tags) ? it.tags : [],
      likes: it.likes,
      publish_date: it.publish_date,
    }))
    req.log.info('stories.list', { limit, offset, count: out.length })
    res.json({ items: out })
  } catch (err) {
    req.log.error('stories.list.error', { message: err?.message, stack: err?.stack, ctx: { params: req.params, query: req.query } })
    res.status(500).json({ error: 'server_error' })
  }
})

// Combined roles for story creation: public published + user's private published
router.get('/combine', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10')
    const offset = parseInt(req.query.offset || '0')
    const search = req.query.search || ''
    req.log.debug('stories.combine.debug', { userId: req.user.id, username: req.user.username, limit, offset, search })

    let items = []

    // Only fetch user characters on the first page
    if (offset === 0) {
      const mineAll = await listUserCharacters(req.user.id, search)
      const myPublished = (mineAll || []).filter(it => String(it.mypage_status) === 'published')
      const mapMine = (c) => ({ character_id: String(c.mypage_id), character_name: c.mypage_name, character_avatar: c.mypage_avatar || '', desc: c.mypage_tagline || '', isPrivate: String(c.mypage_visibility) === 'private', isMine: true })
      items = [...myPublished.map(mapMine)]
    }

    // Fetch public characters excluding current user
    const pub = await listPublicCharactersExcludeUser(req.user.username, {
      limit,
      offset,
      search,
      excludeUserId: req.user.id,
      excludeNickname: req.user.nickname
    })
    const mapPub = (c) => ({ character_id: String(c.id), character_name: c.name, character_avatar: c.avatar, desc: c.tagline || c.plot_summary || '', isPrivate: false, isMine: false })

    items = [...items, ...pub.map(mapPub)]

    req.log.info('stories.combine.roles', { count: items.length })
    res.json({ items })
  } catch (err) {
    req.log.error('stories.combine.error', { message: err?.message, stack: err?.stack })
    res.status(500).json({ error: 'server_error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_id' })
    req.log.debug('stories.get.debug', { id })
    const data = await getStory(id)
    if (!data || String(data.status || '') !== 'published') return res.status(404).json({ error: 'not_found' })
    req.log.info('stories.get', { id, found: !!data })
    res.json({
      id: data.id,
      title: data.title,
      description: data.description,
      image: data.image,
      author: data.author,
      likes: data.likes,
      content: data.content,
      publish_date: data.publish_date,
      tags: Array.isArray(data.tags) ? data.tags : [],
      roles: Array.isArray(data.roles) ? data.roles : [],
      user_avatar: data.user_avatar || ''
    })
  } catch (err) {
    req.log.error('stories.get.error', { message: err?.message, stack: err?.stack, ctx: { id: req.params.id } })
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
