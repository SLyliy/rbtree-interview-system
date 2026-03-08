-- 评论统计表
CREATE TABLE comment_stats (
  comment_id INTEGER PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
  like_count INTEGER DEFAULT 0,                          -- 点赞总数
  dislike_count INTEGER DEFAULT 0,                       -- 踩的总数  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_comment_stats_like_count ON comment_stats(like_count);
