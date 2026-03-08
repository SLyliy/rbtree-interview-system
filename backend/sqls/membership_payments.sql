-- 会员支付记录表
CREATE TABLE membership_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type INTEGER NOT NULL, -- 对应 user_memberships 的 membership_type
  duration_months INTEGER NOT NULL, -- 购买的月数
  amount DECIMAL(10, 2) NOT NULL, -- 支付金额
  payment_method INTEGER NOT NULL, -- 1: 兑换码, 2: 支付宝, 3: 微信支付
  transaction_id VARCHAR(100), -- 第三方支付平台的交易ID，如果是兑换码，那么就是对应的 code
  status INTEGER NOT NULL DEFAULT 1, -- 1: 待支付, 2: 已支付, 3: 已取消, 4: 支付失败
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_membership_payments_user ON membership_payments(user_id);
CREATE INDEX idx_membership_payments_status ON membership_payments(status);
CREATE INDEX idx_membership_payments_created ON membership_payments(created_at);