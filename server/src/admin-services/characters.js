import pool from '../db.js';
import { audit } from '../utils/audit.js';

export const ensureCharacterSchema = async () => {
  const [rows] = await pool.query(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [process.env.DB_NAME, 'characters']
  );
  const names = new Set(rows.map(r => r.COLUMN_NAME));
  const alters = [];
  if (!names.has('prompt_model_id')) alters.push('ADD COLUMN prompt_model_id VARCHAR(64) NULL');
  if (!names.has('prompt_temperature')) alters.push('ADD COLUMN prompt_temperature DECIMAL(3,2) NULL');
  if (!names.has('scene_model_id')) alters.push('ADD COLUMN scene_model_id VARCHAR(64) NULL');
  if (!names.has('scene_temperature')) alters.push('ADD COLUMN scene_temperature DECIMAL(3,2) NULL');
  if (!names.has('scene_template_id')) alters.push('ADD COLUMN scene_template_id BIGINT NULL');
  if (!names.has('character_type')) alters.push('ADD COLUMN character_type ENUM("原创角色","二次创作","其他") NOT NULL DEFAULT "原创角色"');
  if (!names.has('age')) alters.push('ADD COLUMN age INT NULL');
  if (!names.has('occupation')) alters.push('ADD COLUMN occupation VARCHAR(128) NULL');
  if (!names.has('user_id')) alters.push('ADD COLUMN user_id BIGINT NULL');
  if (alters.length) {
    await pool.query(`ALTER TABLE characters ${alters.join(', ')}`);
  }
  const [fk] = await pool.query(
    'SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? AND REFERENCED_TABLE_NAME=?',
    [process.env.DB_NAME, 'characters', 'scene_template_id', 'templates']
  );
  if (!fk.length) {
    try {
      await pool.query('ALTER TABLE characters ADD CONSTRAINT fk_characters_scene_template FOREIGN KEY (scene_template_id) REFERENCES templates(id) ON DELETE SET NULL');
    } catch {}
  }
};

export const listCharacters = async (creatorRole) => {
  audit('admin_service', { op: 'listCharacters', creatorRole })
  await ensureCharacterSchema();
  const where = creatorRole ? 'WHERE c.creator_role = ?' : '';
  const params = creatorRole ? [creatorRole] : [];
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.gender, c.avatar, c.creator, c.creator_role, c.scene_template_id, c.identity, c.tagline,
            c.personality, c.relationship, c.plot_theme, c.plot_summary, c.opening_line,
            c.system_prompt, c.system_prompt_scene, c.prompt_model_id, c.prompt_temperature, c.scene_model_id, c.scene_temperature,
            c.hobbies, c.experiences, c.status, c.created_at,
            c.character_type, c.age, c.occupation,
            t2.name AS scene_template_name,
            GROUP_CONCAT(ct.tag) AS tags
     FROM characters c
     LEFT JOIN character_tags ct ON ct.character_id = c.id
     LEFT JOIN templates t2 ON t2.id = c.scene_template_id
     ${where}
     GROUP BY c.id
     ORDER BY c.status='published' DESC, c.created_at ASC`,
    params
  );
  const ids = rows.map(r => r.id);
  let styleMap = new Map();
  if (ids.length) {
    const [sx] = await pool.query('SELECT character_id, idx, content FROM character_style_examples WHERE character_id IN (?) ORDER BY idx ASC', [ids]);
    sx.forEach(r => {
      const arr = styleMap.get(r.character_id) || [];
      arr[r.idx - 1] = r.content;
      styleMap.set(r.character_id, arr);
    });
  }
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    gender: r.gender,
    avatar: r.avatar,
    creator: r.creator,
    creatorRole: r.creator_role,
    identity: r.identity,
    tagline: r.tagline,
    personality: r.personality,
    relationship: r.relationship,
    plotTheme: r.plot_theme,
    plotSummary: r.plot_summary,
    openingLine: r.opening_line,
    systemPrompt: r.system_prompt,
    systemPromptScene: r.system_prompt_scene,
    promptModelId: r.prompt_model_id,
    promptTemperature: r.prompt_temperature,
    sceneModelId: r.scene_model_id,
    sceneTemperature: r.scene_temperature,
    sceneTemplateId: r.scene_template_id,
    sceneTemplateName: r.scene_template_name || null,
    hobbies: r.hobbies,
    experiences: r.experiences,
    status: r.status,
    createdAt: r.created_at,
    tags: r.tags ? r.tags.split(',') : [],
    styleExamples: styleMap.get(r.id) || [],
    characterType: r.character_type,
    age: r.age,
    occupation: r.occupation,
  }));
};

export const getCharacter = async (id) => {
  audit('admin_service', { op: 'getCharacter', id })
  const [rows] = await pool.query('SELECT * FROM characters WHERE id=?', [id]);
  if (!rows.length) return null;
  const c = rows[0];
  const [[tpl2]] = await pool.query('SELECT name FROM templates WHERE id=?', [c.scene_template_id]);
  const [tags] = await pool.query('SELECT tag FROM character_tags WHERE character_id=?', [id]);
  const [styles] = await pool.query('SELECT idx, content FROM character_style_examples WHERE character_id=? ORDER BY idx ASC', [id]);
  return {
    ...c,
    tags: tags.map(t => t.tag),
    styleExamples: styles.map(s => s.content),
    systemPromptScene: c.system_prompt_scene,
    promptModelId: c.prompt_model_id,
    promptTemperature: c.prompt_temperature,
    sceneModelId: c.scene_model_id,
    sceneTemperature: c.scene_temperature,
    sceneTemplateId: c.scene_template_id,
    sceneTemplateName: tpl2?.name || null,
    characterType: c.character_type,
    age: c.age,
    occupation: c.occupation,
  };
};

export const createCharacter = async (payload) => {
  audit('admin_service', { op: 'createCharacter' })
  const id = Date.now();
  const {
    name, gender, avatar = null, creator, creatorRole = 'admin_role', sceneTemplateId = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, systemPrompt = null,
    systemPromptScene = null,
    promptModelId = null, promptTemperature = null,
    sceneModelId = null, sceneTemperature = null,
    hobbies = null, experiences = null, status = 'draft', tags = [], styleExamples = [],
    characterType = '原创角色', age = null, occupation = null,
  } = payload;
  await pool.query(
    `INSERT INTO characters (id, name, gender, avatar, creator, creator_role, scene_template_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line, system_prompt, system_prompt_scene,
      prompt_model_id, prompt_temperature, scene_model_id, scene_temperature,
      hobbies, experiences, status, character_type, age, occupation)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, gender, avatar, creator, creatorRole, sceneTemplateId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine, systemPrompt, systemPromptScene,
     promptModelId, promptTemperature, sceneModelId, sceneTemperature,
     hobbies, experiences, status, characterType, age, occupation]
  );
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag]);
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values]);
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || '']);
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values]);
  }
  return id;
};

export const updateCharacter = async (id, payload) => {
  audit('admin_service', { op: 'updateCharacter', id })
  const {
    name, gender, avatar = null, creator, creatorRole = 'admin_role', sceneTemplateId = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, systemPrompt = null, systemPromptScene = null,
    promptModelId = null, promptTemperature = null,
    sceneModelId = null, sceneTemperature = null,
    hobbies = null, experiences = null, status, tags = [], styleExamples = [],
    characterType = '原创角色', age = null, occupation = null,
  } = payload;
  await pool.query(
    `UPDATE characters SET name=?, gender=?, avatar=?, creator=?, creator_role=?, scene_template_id=?, identity=?, tagline=?, personality=?,
      relationship=?, plot_theme=?, plot_summary=?, opening_line=?, system_prompt=?, system_prompt_scene=?,
      prompt_model_id=?, prompt_temperature=?, scene_model_id=?, scene_temperature=?,
      hobbies=?, experiences=?, status=?, character_type=?, age=?, occupation=?
     WHERE id=?`,
    [name, gender, avatar, creator, creatorRole, sceneTemplateId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine, systemPrompt, systemPromptScene,
     promptModelId, promptTemperature, sceneModelId, sceneTemperature,
     hobbies, experiences, status, characterType, age, occupation, id]
  );
  await pool.query('DELETE FROM character_tags WHERE character_id=?', [id]);
  await pool.query('DELETE FROM character_style_examples WHERE character_id=?', [id]);
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag]);
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values]);
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || '']);
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values]);
  }
  try {
    const { getRedis, keyCharacter } = await import('../client-services/redis.js')
    const rds = await getRedis()
    await rds.hSet(keyCharacter(id), {
      id: String(id),
      system_prompt: systemPrompt || '',
      system_prompt_scene: systemPromptScene || '',
      updated_at: String(Date.now())
    })
  } catch {}
};

export const updateCharacterPreserveOwner = async (id, payload) => {
  audit('admin_service', { op: 'updateCharacterPreserveOwner', id })
  const {
    name, gender, avatar = null, sceneTemplateId = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, systemPrompt = null, systemPromptScene = null,
    promptModelId = null, promptTemperature = null,
    sceneModelId = null, sceneTemperature = null,
    hobbies = null, experiences = null, status, tags = [], styleExamples = [],
    characterType = '原创角色', age = null, occupation = null,
  } = payload;
  await pool.query(
    `UPDATE characters SET name=?, gender=?, avatar=?, scene_template_id=?, identity=?, tagline=?, personality=?,
      relationship=?, plot_theme=?, plot_summary=?, opening_line=?, system_prompt=?, system_prompt_scene=?,
      prompt_model_id=?, prompt_temperature=?, scene_model_id=?, scene_temperature=?,
      hobbies=?, experiences=?, status=?, character_type=?, age=?, occupation=?
     WHERE id=?`,
    [name, gender, avatar, sceneTemplateId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine, systemPrompt, systemPromptScene,
     promptModelId, promptTemperature, sceneModelId, sceneTemperature,
     hobbies, experiences, status, characterType, age, occupation, id]
  );
  await pool.query('DELETE FROM character_tags WHERE character_id=?', [id]);
  await pool.query('DELETE FROM character_style_examples WHERE character_id=?', [id]);
  if (tags && tags.length) {
    const values = tags.map(tag => [id, tag]);
    await pool.query('INSERT INTO character_tags (character_id, tag) VALUES ?', [values]);
  }
  if (styleExamples && styleExamples.length) {
    const values = styleExamples.map((content, idx) => [id, idx + 1, content || '']);
    await pool.query('INSERT INTO character_style_examples (character_id, idx, content) VALUES ?', [values]);
  }
  try {
    const { getRedis, keyCharacter } = await import('../client-services/redis.js')
    const rds = await getRedis()
    await rds.hSet(keyCharacter(id), {
      id: String(id),
      system_prompt: systemPrompt || '',
      system_prompt_scene: systemPromptScene || '',
      updated_at: String(Date.now())
    })
  } catch {}
};

export const deleteCharacter = async (id) => {
  audit('admin_service', { op: 'deleteCharacter', id })
  const [res] = await pool.query('DELETE FROM characters WHERE id=?', [id]);
  return res.affectedRows > 0;
};

export const setCharacterStatus = async (id, status) => {
  audit('admin_service', { op: 'setCharacterStatus', id, status })
  await pool.query('UPDATE characters SET status=? WHERE id=?', [status, id]);
};
