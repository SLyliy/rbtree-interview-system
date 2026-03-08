-- 用户积分表
CREATE TABLE user_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL, -- 可以是正数（获得）或负数（消费）
    description TEXT NOT NULL, -- 积分来源描述
    related_entity_type VARCHAR(50), -- 'question', 'comment', 'answer'
    related_entity_id INTEGER, -- 关联的实体ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_points_user ON user_points(user_id);
CREATE INDEX idx_points_time ON user_points(created_at);