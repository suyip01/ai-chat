import OpenAI from 'openai';
import pool from '../db.js';
import { getSettings } from './settings.js';

const apiKey = process.env.LLM_API_KEY || '';
const baseURL = process.env.LLM_BASE_URL || '';
const client = new OpenAI({ apiKey, baseURL });

const fetchSettings = async () => {
  const row = await getSettings();
  const selected = row?.selected_model || null;
  const temperature = typeof row?.model_temperature === 'number' ? row.model_temperature : null;
  const [m1] = await pool.query('SELECT model_id FROM models WHERE model_id=? OR model_name=? OR model_nickname=? LIMIT 1', [selected, selected, selected]);
  if (m1.length) return { model: m1[0].model_id, temperature };
  const [m2] = await pool.query('SELECT model_id FROM models ORDER BY created_at ASC LIMIT 1');
  if (m2.length) return { model: m2[0].model_id, temperature };
  throw new Error('no_model_available');
};

const validateModel = async (modelId) => {
  const [rows] = await pool.query('SELECT model_id FROM models WHERE model_id=? OR model_name=? OR model_nickname=? LIMIT 1', [modelId, modelId, modelId]);
  if (rows.length) return rows[0].model_id;
  const { model } = await fetchSettings();
  return model;
};

const fillTemplateContent = (tpl, data) => {
  if (!tpl || typeof tpl !== 'string') return '';
  const map = {
    name: data.name || '',
    gender: data.gender || '',
    identity: data.identity || '',
    tagline: data.tagline || '',
    tags: Array.isArray(data.tags) ? data.tags.join('、') : '',
    opening: '',
  };
  return tpl.replace(/{{(name|gender|identity|tagline|tags|opening)}}/g, (_, k) => map[k] ?? '');
};

const buildMessages = (data, systemTemplate) => {
  const name = data.name || '[角色名]';
  const gender = data.gender || '未知';
  const identity = data.identity || '';
  const intro = data.intro || '';
  const tagline = data.tagline || '';
  const personality = data.personality || '';
  const relationship = data.relationship || '';
  const tags = Array.isArray(data.tags) ? data.tags.join('、') : '';
  const styleExamples = Array.isArray(data.styleExamples) ? data.styleExamples.filter(Boolean) : [];
  const hobbies = data.hobbies || '';
  const experiences = data.experiences || '';
  const sys = `你是专家级别角色提示词工程师，需根据用户提供的角色设定参数，生成符合要求的角色扮演提示词，确保模拟角色对话时贴近真人表现。

【模板】
${systemTemplate || 'content'}

### 输出要求
- 模板的输出格式要求不允许修改
- 模板禁止透露AI身份的内容不许修改
- 深刻理解角色的背景和情感，提示词要要贴合用户设定
- 用户提供了”说话风格示例“，生成## Example要使用用户提供的示例，并补充对话一些对话
- 跟用户的当前关系阶段需要重点突出`;
  const styleText = styleExamples.length ? styleExamples.map((s, i) => `0${i + 1}. ${s}`).join('\n') : '';
  const user = [
    `角色名称：${name}`,
    `性别：${gender}`,
    `身份背景：${identity}`,
    `简介：${intro}`,
    `一句话人设：${tagline}`,
    `性格：${personality}`,
    `当下关系：${relationship}`,
    `角色标签：${tags}`,
    `进阶设定：`,
    `说话风格示例：${styleText}`,
    `爱好：${hobbies}`,
    `经历：${experiences}`,
  ].join('\n');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
};

export const generateRolePrompt = async (data, overrides = {}) => {
  const s = await fetchSettings();
  const chosenModel = await validateModel(overrides.model || s.model);
  const chosenTemp = typeof overrides.temperature === 'number' ? overrides.temperature : s.temperature;
  const messages = buildMessages(data, overrides.systemTemplate);
  const sysMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg = messages.find(m => m.role === 'user')?.content || '';
  console.log('[sysprompt.generateRolePrompt] model:', chosenModel, 'temperature:', chosenTemp);
  console.log('[sysprompt.generateRolePrompt] system_prompt:\n', sysMsg);
  console.log('[sysprompt.generateRolePrompt] user_prompt:\n', userMsg);
  const resp = await client.chat.completions.create({ model: chosenModel, messages, temperature: chosenTemp });
  const out = resp.choices?.[0]?.message?.content || '';
  console.log('[sysprompt.generateRolePrompt] output:\n', out);
  return out;
};

export default generateRolePrompt;
