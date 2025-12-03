import { Router } from 'express'
import { userAuthRequired } from '../middleware/userAuth.js'
import { listUserCharacters, getUserCharacter, createUserCharacter, updateUserCharacter, deleteUserCharacter } from '../client-services/userCharacters.js'
import { generateRolePrompt, generateNoScenePrompt } from '../admin-services/sysprompt.js'

const router = Router()
router.use(userAuthRequired)

router.get('/', async (req, res) => {
  try {
    const items = await listUserCharacters(req.user.id)
    res.json({ items })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = await getUserCharacter(req.user.id, id)
    if (!data) return res.status(404).json({ error: 'not_found' })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.name || !body.gender) return res.status(400).json({ error: 'missing_fields' })
    const id = await createUserCharacter(req.user.id, req.user.username || 'User', body)
    res.json({ id })
    setImmediate(async () => {
      try {
        const data = await getUserCharacter(req.user.id, id)
        if (!data) return
        const promptScene = await generateRolePrompt({
          name: data.name,
          gender: data.gender,
          identity: data.identity,
          tagline: data.tagline,
          personality: data.personality,
          relationship: data.relationship,
          tags: [],
          styleExamples: [],
          hobbies: data.hobbies,
          experiences: data.experiences,
          age: data.age,
          occupation: data.occupation,
        })
        const promptNoScene = await generateNoScenePrompt(promptScene)
        await req.app.locals.pool.query('UPDATE characters SET system_prompt=?, system_prompt_scene=? WHERE id=?', [promptNoScene, promptScene, id])
      } catch (err) {
        console.error('[userCharacters] async prompt generation error:', err?.message || err)
      }
    })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const ok = await updateUserCharacter(req.user.id, id, req.body || {})
    if (!ok) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
    setImmediate(async () => {
      try {
        const data = await getUserCharacter(req.user.id, id)
        if (!data) return
        const promptScene = await generateRolePrompt({
          name: data.name,
          gender: data.gender,
          identity: data.identity,
          tagline: data.tagline,
          personality: data.personality,
          relationship: data.relationship,
          tags: [],
          styleExamples: [],
          hobbies: data.hobbies,
          experiences: data.experiences,
          age: data.age,
          occupation: data.occupation,
        })
        const promptNoScene = await generateNoScenePrompt(promptScene)
        await req.app.locals.pool.query('UPDATE characters SET system_prompt=?, system_prompt_scene=? WHERE id=?', [promptNoScene, promptScene, id])
      } catch (err) {
        console.error('[userCharacters] async prompt generation error:', err?.message || err)
      }
    })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const ok = await deleteUserCharacter(req.user.id, id)
    if (!ok) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

export default router
