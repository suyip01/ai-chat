SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS admin_refresh_tokens;
DROP TABLE IF EXISTS user_refresh_tokens;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS character_style_examples;
DROP TABLE IF EXISTS character_tags;
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS user_chat_role;
DROP TABLE IF EXISTS template_tags;
DROP TABLE IF EXISTS templates;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  nickname VARCHAR(64),
  avatar VARCHAR(255) NOT NULL DEFAULT '/uploads/avatars/default_avatar.jpg',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  chat_limit INT NOT NULL DEFAULT 0,
  used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户自定义聊天角色表
CREATE TABLE user_chat_role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  age INT,
  gender ENUM('男','女','未透露') NOT NULL DEFAULT '未透露',
  profession VARCHAR(128),
  basic_info TEXT,
  personality TEXT,
  avatar VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_chat_role_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admins (
  id BIGINT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  nickname VARCHAR(64),
  avatar VARCHAR(255) NOT NULL DEFAULT '/uploads/avatars/default_admin.jpg',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE templates (
  id BIGINT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(64) NOT NULL,
  creator VARCHAR(64) NOT NULL,
  content TEXT,
  ref_count INT NOT NULL DEFAULT 0,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE template_tags (
  template_id BIGINT NOT NULL,
  tag VARCHAR(64) NOT NULL,
  PRIMARY KEY (template_id, tag),
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE characters (
  id BIGINT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  avatar VARCHAR(64),
  creator VARCHAR(64) NOT NULL,
  scene_template_id BIGINT,
  identity TEXT,
  tagline VARCHAR(255),
  personality TEXT,
  relationship VARCHAR(64),
  character_type ENUM('原创角色','二次创作','其他') NOT NULL DEFAULT '原创角色',
  age INT,
  occupation VARCHAR(128),
  plot_theme VARCHAR(255),
  plot_summary TEXT,
  opening_line VARCHAR(255),
  system_prompt TEXT,
  system_prompt_scene TEXT,
  prompt_model_id VARCHAR(64),
  prompt_temperature DECIMAL(3,2),
  scene_model_id VARCHAR(64),
  scene_temperature DECIMAL(3,2),
  hobbies TEXT,
  experiences TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creator_role ENUM('user_role','admin_role') NOT NULL,
  status ENUM('published','draft') NOT NULL DEFAULT 'draft',
  visibility ENUM('public','private') NOT NULL DEFAULT 'public',
  FOREIGN KEY (scene_template_id) REFERENCES templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE character_tags (
  character_id BIGINT NOT NULL,
  tag VARCHAR(64) NOT NULL,
  PRIMARY KEY (character_id, tag),
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE character_style_examples (
  character_id BIGINT NOT NULL,
  idx INT NOT NULL,
  content VARCHAR(255) NOT NULL,
  PRIMARY KEY (character_id, idx),
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE settings (
  id BIGINT PRIMARY KEY,
  selected_model VARCHAR(64) NOT NULL,
  selected_chat_model VARCHAR(64) NOT NULL,
  selected_story_model VARCHAR(64) NOT NULL,
  model_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.10,
  chat_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.10,
  story_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.10,
  default_template_id BIGINT,
  FOREIGN KEY (default_template_id) REFERENCES templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT NOT NULL,
  token VARCHAR(512) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_token (admin_id, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(512) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_token (user_id, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE models (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  model_id VARCHAR(64) NOT NULL UNIQUE,
  model_name VARCHAR(128) NOT NULL,
  model_nickname VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
INSERT INTO users (id, username, email, chat_limit, used) VALUES
(1, 'user_001', 'alice@example.com', 0, 12),
(2, 'star_chaser', 'bob@example.com', 100, 45),
(3, 'night_owl', 'carol@example.com', 50, 50);

INSERT INTO admins (id, username, email, password_hash, is_active) VALUES
(1, 'admin', 'admin@example.com', NULL, 1);

INSERT INTO templates (id, name, type, creator, content, ref_count, is_default) VALUES
(1, '霸道总裁模版', '恋爱', 'Admin', '你现在扮演 {{name}}。\n你的性别是 {{gender}}。\n\n【角色设定】\n{{identity}}\n\n【性格特征】\n{{tagline}}\n\n【对话规则】\n1. 请保持高冷霸道的语气。\n2. 你非常富有，通过金钱攻势解决问题。\n3. 不要轻易承认自己的感情。\n\n【开场白】\n{{opening}}', 124, 1),
(2, '修仙师尊模版', '玄幻', 'Editor_A', '你现在扮演 {{name}}，乃是修仙界第一人。\n你的性别是 {{gender}}。\n\n【背景故事】\n{{identity}}\n\n【人设标签】\n{{tags}}\n\n【说话风格】\n使用古风口吻，自称“本座”或“为师”。\n\n【初始情境】\n{{opening}}', 89, 0),
(3, '病娇弟弟模版', '悬疑', 'Admin', '角色：{{name}}\n性别：{{gender}}\n\n你是一个病娇弟弟。\n\n设定：\n{{identity}}\n\n特别注意：\n你对用户有极强的占有欲。如果用户提到其他人，你会生气。\n\n{{opening}}', 45, 0),
(4, '赛博雇佣兵', '科幻', 'User', NULL, 10, 0),
(5, '古代谋士', '历史', 'User', NULL, 20, 0),
(6, '女武神', '奇幻', 'User', NULL, 30, 0);

INSERT INTO template_tags (template_id, tag) VALUES
(1, '豪门'), (1, '甜宠'),
(2, '高冷'), (2, '师徒'),
(3, '年下'), (3, '反转'),
(4, '冷酷'), (4, '机械'),
(5, '腹黑'), (5, '智慧'),
(6, '战斗'), (6, '英勇');

INSERT INTO characters (id, name, gender, avatar, intro, template_id, identity, tagline, personality, relationship, plot_theme, plot_summary, opening_line, system_prompt, hobbies, experiences, status) VALUES
(101, '陆司野', '男', 'L', '只手遮天的商业帝王...', 1, '28岁，陆氏集团总裁。', '在这个城市，没人敢拒绝我。', '强势、占有欲强', '陌生人', '办公室对峙', '你因为工作失误被他叫进办公室，他手里拿着你的辞职信，眼神阴沉。', '“怎么，还需要我教你规矩吗？”', '（已生成的 Prompt 内容...）', '赛车、品酒', '年少时曾被绑架，因此极度缺乏安全感，控制欲极强。', 'published'),
(102, '谢无妄', '男', 'X', '清冷禁欲的修仙界魁首...', 2, '昆仑墟剑尊，活了三千年。', '断情绝爱，唯求大道。', '清冷、隐忍', '师徒', '师徒决裂前夕', '你修炼禁术被发现，他将你关在思过崖，今夜是他最后一次来问你是否知错。', '“徒儿，你的心乱了。”', '（已生成的 Prompt 内容...）', '', '', 'draft');

INSERT INTO character_tags (character_id, tag) VALUES
(101, '豪门'), (101, '腹黑'),
(102, '仙侠'), (102, '师徒');

INSERT INTO character_style_examples (character_id, idx, content) VALUES
(101, 1, '“闭嘴。”'),
(101, 2, '“我不喜欢重复第二遍。”'),
(101, 3, '“过来。”');

INSERT INTO settings (id, selected_model, selected_chat_model, selected_story_model, default_template_id) VALUES
(1, 'gpt-4o', 'gpt-4o', 'gpt-4o', 1);
