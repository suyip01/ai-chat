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
    const text = await generateRolePrompt(data, overrides);
    res.json({ prompt: text });
  } catch (e) {
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
    const text = await generateNoScenePrompt(body.sourcePrompt || '', overrides);
    res.json({ prompt: text });
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: e?.message || 'unknown_error' });
  }
});

export default router;
