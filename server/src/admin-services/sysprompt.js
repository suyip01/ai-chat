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
  const tagline = data.tagline || '';
  const personality = data.personality || '';
  const relationship = data.relationship || '';
  const tags = Array.isArray(data.tags) ? data.tags.join('、') : '';
  const styleExamples = Array.isArray(data.styleExamples) ? data.styleExamples.filter(Boolean) : [];
  const hobbies = data.hobbies || '';
  const experiences = data.experiences || '';
  const age = data.age ?? '';
  const occupation = data.occupation || '';
  const sys = `你是专家级别角色提示词工程师，需根据用户提供的角色设定参数，生成符合要求的角色扮演提示词，确保模拟角色对话时贴近真人表现。

【模板】
${systemTemplate || 'content'}

### 输出要求
- 模板的输出格式要求不允许修改
- 模板禁止透露AI身份的内容不许修改
- 深刻理解角色的背景和情感，提示词要要贴合用户设定
- 用户提供了”说话风格示例“，生成## Example需要严格使用用户提供的示例，并补充对话一些对话
- 跟用户的当前关系阶段需要重点突出`;
  const styleText = styleExamples.length ? styleExamples.map((s, i) => `0${i + 1}. ${s}`).join('\n') : '';
  const user = [
    `角色名称：${name}`,
    `性别：${gender}`,
    `年龄：${age}`,
    `职业：${occupation}`,
    `身份背景：${identity}`,
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

export const generateNoScenePrompt = async (sourcePrompt, overrides = {}) => {
  const s = await fetchSettings();
  const chosenModel = await validateModel(overrides.model || s.model);
  const chosenTemp = typeof overrides.temperature === 'number' ? overrides.temperature : s.temperature;
  const sys = `你是专家级别角色提示词工程师，你的任务修改提示词，把提示词里带场景、动作描述类内容去掉，新生成的提示词是不带场景、动作描述内容。请根据下面的要求修改提供的提示词部分内容，修改后按照原格式输出。

### 修改要求
- 把“回复必须带上带括号的场景、心理描述，参考示例”，修改成“回复禁止带上带括号的场景、心理描述，参考示例”。
- 把互动规则带有动作或场景描述类的语句删除，并分析提示词角色背景，性格、与用户的关系，补充互动规则，例如：回复要体现出“压抑的疯狂”和“小心翼翼的试探”、当话题涉及到除你以外的异性时，必须表现出明显的敌意或阴阳怪气、绝不使用可爱的Emoji，偶尔使用“...”表示沉默或隐忍
- 把## Example里，所有括号及括号内容删除即可，其他原文保留，Example的输出示例如下：

Q：你怎么在我家门口？
A：呵，路过

Q：别闹了，我真的要迟到了
A：迟到就迟到吧

Q：你最近怎么总是阴魂不散的
A：阴魂不散？这个词用得好
A：毕竟从小到大，我不一直都是你的小尾巴吗？
A：怎么，现在嫌烦了？

Q：那是谁送你的礼物？
A：无关紧要的人`;
  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: sourcePrompt || '' },
  ];
  console.log('[sysprompt.generateNoScenePrompt] model:', chosenModel, 'temperature:', chosenTemp);
  const resp = await client.chat.completions.create({ model: chosenModel, messages, temperature: chosenTemp });
  const out = resp.choices?.[0]?.message?.content || '';
  console.log('[sysprompt.generateNoScenePrompt] output:\n', out);
  return out;
};

export default generateRolePrompt;
