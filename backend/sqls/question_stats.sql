-- 问题统计表
CREATE TABLE question_stats (
  question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,           -- 浏览次数
  collect_count INTEGER DEFAULT 0,        -- 收藏次数
  recommend_count INTEGER DEFAULT 0,      -- 推荐次数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_question_stats_views ON question_stats(view_count);
CREATE INDEX idx_question_stats_collects ON question_stats(collect_count);
CREATE INDEX idx_question_stats_recommends ON question_stats(recommend_count);