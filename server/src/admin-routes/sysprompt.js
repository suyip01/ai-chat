import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { generateRolePrompt, generateNoScenePrompt } from '../admin-services/sysprompt.js';

const router = Router();

router.use(authRequired);

router.post('/generate', async (req, res) => {
  const body = req.body || {};
  try {
    const data = {
      name: body.name,
      gender: body.gender,
      identity: body.identity,
      tagline: body.tagline,
      tags: Array.isArray(body.tags) ? body.tags : [],
      personality: body.personality,
      relationship: body.relationship,
      styleExamples: Array.isArray(body.styleExamples) ? body.styleExamples : [],
      hobbies: body.hobbies,
      experiences: body.experiences,
      age: body.age,
      occupation: body.occupation,
    };
    const overrides = {
      model: body.model,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      systemTemplate: body.templateContent,
    };
    req.log.info('sysprompt.generate.start', { tags_len: data.tags.length, style_len: data.styleExamples.length, model: overrides.model })
    const text = await generateRolePrompt(data, overrides, req.log);
    req.log.info('sysprompt.generate.ok', { out_len: (text || '').length })
    res.json({ prompt: text });
  } catch (e) {
    req.log.error('sysprompt.generate.error', { error: e?.message || e })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

router.post('/generate-noscene', async (req, res) => {
  const body = req.body || {};
  try {
    const overrides = {
      model: body.model,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
    };
    req.log.info('sysprompt.generateNoScene.start', { model: overrides.model })
    const text = await generateNoScenePrompt(body.sourcePrompt || '', overrides, req.log);
    req.log.info('sysprompt.generateNoScene.ok', { out_len: (text || '').length })
    res.json({ prompt: text });
  } catch (e) {
    req.log.error('sysprompt.generateNoScene.error', { error: e?.message || e })
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

export default router;
