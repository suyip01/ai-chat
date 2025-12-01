import pool from '../db.js';

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
  if (alters.length) {
    await pool.query(`ALTER TABLE characters ${alters.join(', ')}`);
  }
  // ensure foreign key for scene_template_id
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
  await ensureCharacterSchema();
  const where = creatorRole ? 'WHERE c.creator_role = ?' : '';
  const params = creatorRole ? [creatorRole] : [];
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.gender, c.avatar, c.intro, c.creator, c.creator_role, c.template_id, c.scene_template_id, c.identity, c.tagline,
            c.personality, c.relationship, c.plot_theme, c.plot_summary, c.opening_line,
            c.system_prompt, c.system_prompt_scene, c.prompt_model_id, c.prompt_temperature, c.scene_model_id, c.scene_temperature,
            c.hobbies, c.experiences, c.status, c.created_at,
            t1.name AS template_name, t2.name AS scene_template_name,
            GROUP_CONCAT(ct.tag) AS tags
     FROM characters c
     LEFT JOIN character_tags ct ON ct.character_id = c.id
     LEFT JOIN templates t1 ON t1.id = c.template_id
     LEFT JOIN templates t2 ON t2.id = c.scene_template_id
     ${where}
     GROUP BY c.id
     ORDER BY c.status='published' DESC, c.created_at ASC`,
    params
  );
  // fetch style examples per character
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
    intro: r.intro,
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
    templateId: r.template_id,
    templateName: r.template_name || null,
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
  }));
};

export const getCharacter = async (id) => {
  const [rows] = await pool.query('SELECT * FROM characters WHERE id=?', [id]);
  if (!rows.length) return null;
  const c = rows[0];
  const [[tpl1]] = await pool.query('SELECT name FROM templates WHERE id=?', [c.template_id]);
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
    templateName: tpl1?.name || null,
    sceneTemplateName: tpl2?.name || null,
  };
};

export const createCharacter = async (payload) => {
  const id = Date.now();
  const {
    name, gender, avatar = null, intro = null, creator, creatorRole = 'admin_role', templateId = null, sceneTemplateId = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, systemPrompt = null,
    systemPromptScene = null,
    promptModelId = null, promptTemperature = null,
    sceneModelId = null, sceneTemperature = null,
    hobbies = null, experiences = null, status = 'draft', tags = [], styleExamples = [],
  } = payload;
  await pool.query(
    `INSERT INTO characters (id, name, gender, avatar, intro, creator, creator_role, template_id, scene_template_id, identity, tagline, personality,
      relationship, plot_theme, plot_summary, opening_line, system_prompt, system_prompt_scene,
      prompt_model_id, prompt_temperature, scene_model_id, scene_temperature,
      hobbies, experiences, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, gender, avatar, intro, creator, creatorRole, templateId, sceneTemplateId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine, systemPrompt, systemPromptScene,
     promptModelId, promptTemperature, sceneModelId, sceneTemperature,
     hobbies, experiences, status]
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
  const {
    name, gender, avatar = null, intro = null, creator, creatorRole = 'admin_role', templateId = null, sceneTemplateId = null,
    identity = null, tagline = null, personality = null, relationship = null,
    plotTheme = null, plotSummary = null, openingLine = null, systemPrompt = null, systemPromptScene = null,
    promptModelId = null, promptTemperature = null,
    sceneModelId = null, sceneTemperature = null,
    hobbies = null, experiences = null, status, tags = [], styleExamples = [],
  } = payload;
  await pool.query(
    `UPDATE characters SET name=?, gender=?, avatar=?, intro=?, creator=?, creator_role=?, template_id=?, scene_template_id=?, identity=?, tagline=?, personality=?,
      relationship=?, plot_theme=?, plot_summary=?, opening_line=?, system_prompt=?, system_prompt_scene=?,
      prompt_model_id=?, prompt_temperature=?, scene_model_id=?, scene_temperature=?,
      hobbies=?, experiences=?, status=?
     WHERE id=?`,
    [name, gender, avatar, intro, creator, creatorRole, templateId, sceneTemplateId, identity, tagline, personality,
     relationship, plotTheme, plotSummary, openingLine, systemPrompt, systemPromptScene,
     promptModelId, promptTemperature, sceneModelId, sceneTemperature,
     hobbies, experiences, status, id]
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
};

export const deleteCharacter = async (id) => {
  const [res] = await pool.query('DELETE FROM characters WHERE id=?', [id]);
  return res.affectedRows > 0;
};

export const setCharacterStatus = async (id, status) => {
  await pool.query('UPDATE characters SET status=? WHERE id=?', [status, id]);
};
