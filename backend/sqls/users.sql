-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role INTEGER NOT NULL DEFAULT 1, -- '1 user', '9 admin'
  status INTEGER NOT NULL DEFAULT 1, -- '1 active', '9 frozen'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);