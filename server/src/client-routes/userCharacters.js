import { Router } from 'express'
import { userAuthRequired } from '../middleware/userAuth.js'
import { listUserCharacters, getUserCharacter, createUserCharacter, updateUserCharacter, deleteUserCharacter } from '../client-services/userCharacters.js'
import pool from '../db.js'
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
        console.log('[userCharacters][create] start llm for id=', id)
        const data = await getUserCharacter(req.user.id, id)
        if (!data) return
        const [[st]] = await pool.query('SELECT selected_model, model_temperature FROM settings LIMIT 1')
        const selected = st?.selected_model || null
        const temperature = typeof st?.model_temperature === 'number' ? st.model_temperature : null
        const [[tpl]] = await pool.query('SELECT id, content FROM templates WHERE is_default=1 ORDER BY created_at DESC LIMIT 1')
        const tplId = tpl?.id || null
        const tplContent = tpl?.content || null
        console.log('[userCharacters][create] using default template id=', tplId, 'preview=', (tplContent || '').slice(0, 60))
        const [[mrow]] = await pool.query('SELECT model_id FROM models WHERE model_id=? OR model_name=? OR model_nickname=? LIMIT 1', [selected, selected, selected])
        const modelId = mrow?.model_id || selected || null

        const [tagRows] = await pool.query('SELECT tag FROM character_tags WHERE character_id=?', [id])
        const [exRows] = await pool.query('SELECT content FROM character_style_examples WHERE character_id=? ORDER BY idx ASC', [id])
        const roleData = {
          name: data.name,
          gender: data.gender,
          identity: data.identity,
          tagline: data.tagline,
          personality: data.personality,
          relationship: data.relationship,
          tags: Array.isArray(tagRows) ? tagRows.map(r => r.tag).filter(Boolean) : [],
          styleExamples: Array.isArray(exRows) ? exRows.map(r => r.content).filter(Boolean) : [],
          hobbies: data.hobbies,
          experiences: data.experiences,
          age: data.age,
          occupation: data.occupation,
        }
        console.log('[userCharacters][create] tplId=', tplId, 'modelId=', modelId, 'temperature=', temperature)
        const promptScene = await generateRolePrompt(roleData, { systemTemplate: tplContent, model: modelId, temperature })
        await pool.query('UPDATE characters SET system_prompt_scene=?, scene_temperature=?, scene_model_id=?, scene_template_id=? WHERE id=?', [promptScene || '', temperature ?? null, modelId || null, tplId ?? null, id])
        console.log('[userCharacters][create] scene prompt len=', (promptScene || '').length)
        const promptNoScene = await generateNoScenePrompt(promptScene, { model: modelId, temperature })
        await pool.query('UPDATE characters SET system_prompt=?, prompt_temperature=?, prompt_model_id=?, status=? WHERE id=?', [promptNoScene || '', temperature ?? null, modelId || null, 'published', id])
        console.log('[userCharacters][create] no-scene prompt len=', (promptNoScene || '').length)
      } catch (err) {
        console.error('[userCharacters] async prompt generation error:', err?.message || err, err?.stack || '')
      }
    })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

// Save draft without triggering async LLM prompt generation
router.post('/draft', async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.name || !body.gender) return res.status(400).json({ error: 'missing_fields' })
    const id = await createUserCharacter(req.user.id, req.user.username || 'User', body)
    res.json({ id })
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
        console.log('[userCharacters][update] start llm for id=', id)
        const data = await getUserCharacter(req.user.id, id)
        if (!data) return
        const [[st]] = await pool.query('SELECT selected_model, model_temperature FROM settings LIMIT 1')
        const selected = st?.selected_model || null
        const temperature = typeof st?.model_temperature === 'number' ? st.model_temperature : null
        const [[tpl]] = await pool.query('SELECT id, content FROM templates WHERE is_default=1 ORDER BY created_at DESC LIMIT 1')
        const tplId = tpl?.id || null
        const tplContent = tpl?.content || null
        console.log('[userCharacters][update] using default template id=', tplId, 'preview=', (tplContent || '').slice(0, 60))
        const [[mrow]] = await pool.query('SELECT model_id FROM models WHERE model_id=? OR model_name=? OR model_nickname=? LIMIT 1', [selected, selected, selected])
        const modelId = mrow?.model_id || selected || null
        const [tagRows] = await pool.query('SELECT tag FROM character_tags WHERE character_id=?', [id])
        const [exRows] = await pool.query('SELECT content FROM character_style_examples WHERE character_id=? ORDER BY idx ASC', [id])
        const roleData = {
          name: data.name,
          gender: data.gender,
          identity: data.identity,
          tagline: data.tagline,
          personality: data.personality,
          relationship: data.relationship,
          tags: Array.isArray(tagRows) ? tagRows.map(r => r.tag).filter(Boolean) : [],
          styleExamples: Array.isArray(exRows) ? exRows.map(r => r.content).filter(Boolean) : [],
          hobbies: data.hobbies,
          experiences: data.experiences,
          age: data.age,
          occupation: data.occupation,
        }
        console.log('[userCharacters][update] tplId=', tplId, 'modelId=', modelId, 'temperature=', temperature)
        const promptScene = await generateRolePrompt(roleData, { systemTemplate: tplContent, model: modelId, temperature })
        await pool.query('UPDATE characters SET system_prompt_scene=?, scene_temperature=?, scene_model_id=?, scene_template_id=? WHERE id=?', [promptScene || '', temperature ?? null, modelId || null, tplId ?? null, id])
        console.log('[userCharacters][update] scene prompt len=', (promptScene || '').length)
        const promptNoScene = await generateNoScenePrompt(promptScene, { model: modelId, temperature })
        await pool.query('UPDATE characters SET system_prompt=?, prompt_temperature=?, prompt_model_id=?, status=? WHERE id=?', [promptNoScene || '', temperature ?? null, modelId || null, 'published', id])
        console.log('[userCharacters][update] no-scene prompt len=', (promptNoScene || '').length)
      } catch (err) {
        console.error('[userCharacters] async prompt generation error:', err?.message || err, err?.stack || '')
      }
    })
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' })
  }
})

// Update draft without triggering async LLM prompt generation
router.put('/:id/draft', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const ok = await updateUserCharacter(req.user.id, id, req.body || {})
    if (!ok) return res.status(404).json({ error: 'not_found' })
    res.json({ ok: true })
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
