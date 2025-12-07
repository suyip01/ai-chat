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
  } catch (err) {
    req.log.error('userStories.list.error', { message: err?.message, stack: err?.stack })
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
  } catch (err) {
    req.log.error('userStories.get.error', { id: req.params.id, message: err?.message, stack: err?.stack })
    res.status(500).json({ error: 'server_error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, description, image, status, content, tags, characterIds } = req.body || {}
    if (!title || !content) return res.status(400).json({ error: 'missing_fields' })
    req.log.info('userStories.create.payload', { title, status: status || 'draft', tags: Array.isArray(tags) ? tags.length : 0, characters: Array.isArray(characterIds) ? characterIds.length : 0 })
    const id = await createUserStory(req.user.id, { title, description, image, status, content, tags, characterIds })
    req.log.info('userStories.create', { id, status: status || 'draft' })
    res.json({ id })
  } catch (err) {
    req.log.error('userStories.create.error', { message: err?.message, stack: err?.stack, body: req.body })
    res.status(500).json({ error: 'server_error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_id' })
    const { title, description, image, status, content, tags, characterIds } = req.body || {}
    if (!title || !content) return res.status(400).json({ error: 'missing_fields' })
    req.log.info('userStories.update.payload', { id, status: status ?? 'unchanged', tags: Array.isArray(tags) ? tags.length : 0, characters: Array.isArray(characterIds) ? characterIds.length : 0 })
    const ok = await updateUserStory(req.user.id, id, { title, description, image, status, content, tags, characterIds })
    req.log.info('userStories.update', { id, ok })
    if (!ok) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch (err) {
    req.log.error('userStories.update.error', { id: req.params.id, message: err?.message, stack: err?.stack, body: req.body })
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
  } catch (err) {
    req.log.error('userStories.delete.error', { id: req.params.id, message: err?.message, stack: err?.stack })
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
