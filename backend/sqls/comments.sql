CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,                                          -- 评论内容
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 评论者ID
    
    -- 多态关联设计：明确表示评论的目标类型和ID
    target_type VARCHAR(20) NOT NULL,                               -- 评论目标类型：'question', 'answer'
    target_id INTEGER NOT NULL,                                     -- 评论目标ID
    
    -- 回复关系设计
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,    -- 父评论ID（用于回复）
    root_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,      -- 根评论ID（用于快速定位评论树）
    reply_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 回复的用户ID（用于@功能）
    
    -- 评论层级和路径
    level INTEGER NOT NULL DEFAULT 0,                              -- 评论层级：0-顶级评论，1-一级回复，2-二级回复
    path TEXT,                                                      -- 评论路径，格式：1/23/456（便于查询整个评论树）
    
    -- 状态和统计
    status SMALLINT DEFAULT 1,                                      -- 状态：1-正常，2-已删除，3-已隐藏
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束条件
    CONSTRAINT comment_target_type_check CHECK (target_type IN ('question', 'answer')),
    CONSTRAINT comment_level_check CHECK (level >= 0 AND level <= 2), -- 限制回复层级
    CONSTRAINT comment_parent_logic_check CHECK (
        (parent_id IS NULL AND level = 0) OR 
        (parent_id IS NOT NULL AND level > 0)
    )
);

-- 创建索引
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id); -- 多态关联索引
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_root ON comments(root_id);
CREATE INDEX idx_comments_level ON comments(level);
CREATE INDEX idx_comments_path ON comments(path); -- 用于评论树查询
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- 复合索引，优化常见查询
CREATE INDEX idx_comments_target_status_created ON comments(target_type, target_id, status, created_at);
CREATE INDEX idx_comments_root_level_created ON comments(root_id, level, created_at);