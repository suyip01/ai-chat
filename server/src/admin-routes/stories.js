import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { runWithAdminContext, audit } from '../utils/audit.js'
import { listStories, getStory, createStory, updateStory, deleteStory, setStoryStatus } from '../admin-services/stories.js'

const router = Router()
router.use(authRequired)
router.use((req, res, next) => { runWithAdminContext(req.admin?.id || null, () => { audit('admin_request', { method: req.method, path: req.originalUrl }); next(); }) })

router.get('/', async (req, res) => {
  try { const items = await listStories(); res.json({ items }) } catch { res.status(500).json({ error: 'server_error' }) }
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_id' })
  try { const data = await getStory(id); if (!data) return res.status(404).json({ error: 'not_found' }); res.json(data) } catch { res.status(500).json({ error: 'server_error' }) }
})

router.post('/', async (req, res) => {
  const { user_id, title, description, image, author, likes, content, status, tags, character_ids } = req.body || {}
  if (!title || !content) return res.status(400).json({ error: 'missing_fields' })
  try { const id = await createStory({ user_id, title, description, image, author, likes, content, status, tags, character_ids }); res.json({ id }) } catch (e) { req.log?.error?.('[admin.stories.create] failed', { error: e?.message }); res.status(500).json({ error: 'server_error' }) }
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_id' })
  const { title, description, image, author, likes, content, status, tags, character_ids } = req.body || {}
  if (!title || !content) return res.status(400).json({ error: 'missing_fields' })
  try { await updateStory(id, { title, description, image, author, likes, content, status, tags, character_ids }); res.json({ ok: true }) } catch (e) { req.log?.error?.('[admin.stories.update] failed', { id, error: e?.message }); res.status(500).json({ error: 'server_error' }) }
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_id' })
  try { const ok = await deleteStory(id); if (!ok) return res.status(404).json({ error: 'not_found' }); res.json({ ok: true }) } catch { res.status(500).json({ error: 'server_error' }) }
})

router.post('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_id' })
  const { status } = req.body || {}
  if (!status) return res.status(400).json({ error: 'missing_status' })
  try { const ok = await setStoryStatus(id, status); if (!ok) return res.status(404).json({ error: 'not_found' }); res.json({ ok: true }) } catch { res.status(500).json({ error: 'server_error' }) }
})

export default router
