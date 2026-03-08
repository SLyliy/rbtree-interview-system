-- 收藏表，默认会给用户一个默认收藏夹，因此收藏表中不设置 id，只通过 user_id + question_id + folder_id 唯一确定
CREATE TABLE user_collects (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES favorite_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id, folder_id) -- 防止重复收藏
);

-- 创建索引
CREATE INDEX idx_user_collects_user ON user_collects(user_id);
CREATE INDEX idx_user_collects_question ON user_collects(question_id);
CREATE INDEX idx_user_collects_folder ON user_collects(folder_id);