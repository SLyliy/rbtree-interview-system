const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// JWT 配置
module.exports = {
  secret: process.env.JWT_SECRET || 'irb-forum-jwt-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h' // 默认 24 小时过期
};
