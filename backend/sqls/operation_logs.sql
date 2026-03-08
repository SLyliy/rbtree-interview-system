-- 操作日志表
CREATE TABLE operation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'question', 'comment', etc.
    entity_id INTEGER, 
    details JSONB, -- 操作详情，使用JSON格式存储
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 

-- 创建索引
CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX idx_operation_logs_entity ON operation_logs(entity_type, entity_id);
CREATE INDEX idx_operation_logs_time ON operation_logs(created_at);