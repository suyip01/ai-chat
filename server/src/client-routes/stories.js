import { Router } from 'express'
import { listStories, getStory } from '../admin-services/stories.js'
import { userAuthRequired } from '../middleware/userAuth.js'

const router = Router()
router.use(userAuthRequired)

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '12')
    const items = await listStories()
    const published = (items || []).filter(it => String(it.status || '') === 'published')
    const out = published.slice(0, limit).map(it => ({
      id: it.id,
      title: it.title,
      description: it.description,
      image: it.image,
      author: it.author,
      tags: Array.isArray(it.tags) ? it.tags : [],
      likes: it.likes,
      publish_date: it.publish_date,
    }))
    req.log.info('stories.list', { limit, count: out.length })
    res.json({ items: out })
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_id' })
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
    })
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
