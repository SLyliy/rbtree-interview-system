-- 题目表
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,                           -- 题目标题
  description TEXT NOT NULL,                             -- 题目描述（富文本）
  difficulty_level SMALLINT NOT NULL,                    -- 难度级别：1-简单，2-中等，3-困难
  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 创建者
  is_public BOOLEAN DEFAULT TRUE,                        -- 是否公开
  is_featured BOOLEAN DEFAULT FALSE,                     -- 是否精选
  status SMALLINT DEFAULT 1,                             -- 状态：1-草稿，2-已发布
  tag_ids INTEGER[],                                     -- 标签ID数组
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
);

-- 创建索引
CREATE INDEX idx_questions_creator ON questions(creator_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_is_public ON questions(is_public);
CREATE INDEX idx_questions_is_featured ON questions(is_featured);
CREATE INDEX idx_questions_created_at ON questions(created_at);

-- 全文搜索索引
CREATE INDEX idx_questions_title_trgm ON questions USING gin (title gin_trgm_ops);
CREATE INDEX idx_questions_description_trgm ON questions USING gin (description gin_trgm_ops);