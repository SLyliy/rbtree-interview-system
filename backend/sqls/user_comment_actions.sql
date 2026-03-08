-- 用户评论互动状态表（记录用户当前对评论的操作状态）
CREATE TABLE user_comment_actions (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    action_type SMALLINT NOT NULL DEFAULT 1,               -- 操作类型：1 - 点赞，0 - 无操作
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, comment_id),
    CONSTRAINT user_comment_actions_action_check CHECK (action_type IN (1, 0))
);

-- 创建索引
CREATE INDEX idx_user_comment_actions_user ON user_comment_actions(user_id);
CREATE INDEX idx_user_comment_actions_comment ON user_comment_actions(comment_id);
CREATE INDEX idx_user_comment_actions_action ON user_comment_actions(action_type);