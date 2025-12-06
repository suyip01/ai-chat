import { Router } from 'express'
import { userAuthRequired } from '../middleware/userAuth.js'
import { listUserStories, getUserStory, createUserStory, updateUserStory, deleteUserStory } from '../client-services/userStories.js'

const router = Router()
router.use(userAuthRequired)

router.get('/', async (req, res) => {
  try {
    const includeDrafts = String(req.query.includeDrafts || '').toLowerCase() === 'true'
    const items = await listUserStories(req.user.id, { includeDrafts })
    req.log.info('userStories.list', { includeDrafts, count: items?.length || 0 })
    res.json({ items })
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_id' })
    const data = await getUserStory(req.user.id, id)
    req.log.info('userStories.get', { id, found: !!data })
    if (!data) return res.status(404).json({ error: 'not_found' })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, description, image, status, content, tags, characterIds } = req.body || {}
    if (!title || !content) return res.status(400).json({ error: 'missing_fields' })
    const id = await createUserStory(req.user.id, { title, description, image, status, content, tags, characterIds })
    req.log.info('userStories.create', { id, status: status || 'draft' })
    res.json({ id })
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_id' })
    const { title, description, image, status, content, tags, characterIds } = req.body || {}
    if (!title || !content) return res.status(400).json({ error: 'missing_fields' })
    const ok = await updateUserStory(req.user.id, id, { title, description, image, status, content, tags, characterIds })
    req.log.info('userStories.update', { id, ok })
    if (!ok) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_id' })
    const ok = await deleteUserStory(req.user.id, id)
    req.log.info('userStories.delete', { id, ok })
    if (!ok) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
