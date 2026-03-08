-- 用户会员表
CREATE TABLE user_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type INTEGER NOT NULL DEFAULT 1, -- 1: 普通用户, 2: 月度VIP, 3: 年度VIP, 4: 终身VIP
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP WITH TIME ZONE, -- NULL表示永久有效（如终身会员）
  is_active BOOLEAN DEFAULT TRUE, -- 会员状态是否激活
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, start_date) -- 每个用户可以有多条记录，但是 start_date 不能重复，有可能只办了1个月，后续续了2个月，那么就有2条记录
);

-- 创建索引
CREATE INDEX idx_user_memberships_user ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_type ON user_memberships(membership_type);
CREATE INDEX idx_user_memberships_end_date ON user_memberships(end_date);
CREATE INDEX idx_user_memberships_active ON user_memberships(is_active);