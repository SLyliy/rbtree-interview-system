-- 兑换码表
CREATE TABLE redeem_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE, -- 兑换码
  membership_type INTEGER NOT NULL, -- 对应的会员类型
  duration_months INTEGER NOT NULL, -- 有效期(月)
  is_used BOOLEAN DEFAULT FALSE, -- 是否已使用
  used_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 使用者
  used_at TIMESTAMP WITH TIME ZONE, -- 使用时间
  expires_at TIMESTAMP WITH TIME ZONE, -- 兑换码过期时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL -- 创建者(管理员)
);

-- 创建索引
CREATE INDEX idx_redeem_codes_used ON redeem_codes(is_used);
CREATE INDEX idx_redeem_codes_expires ON redeem_codes(expires_at);