-- 用户对题目的行为记录表
CREATE TABLE user_actions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  action_type INTEGER NOT NULL,       -- '1 view', '2 collect', '3 recommend'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id, action_type) -- 每个用户对每个题目的每种操作类型只记录最新一次
);

-- 创建索引
CREATE INDEX idx_user_actions_user ON user_actions(user_id);
CREATE INDEX idx_user_actions_question ON user_actions(question_id);
CREATE INDEX idx_user_actions_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_created ON user_actions(created_at);