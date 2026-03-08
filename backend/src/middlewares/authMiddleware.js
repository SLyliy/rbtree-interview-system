const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * JWT 鉴权中间件
 * 验证请求头中的 token 是否有效
 */
const authMiddleware = (req, res, next) => {
  // 获取请求头中的 token
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌 Token' });
  }
  
  // 通常 token 格式为 "Bearer xxx"，需要提取 token 部分
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ code: 401, message: '认证令牌 Token 格式不正确' });
  }
  
  try {
    // 验证 token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // 将解码后的用户信息添加到请求对象中，以便后续处理
    req.user = decoded;
    
    // 继续处理请求
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: '认证令牌 Token 已过期，请重新登录' });
    }
    
    return res.status(401).json({ code: 401, message: '无效的认证令牌 Token' });
  }
};

module.exports = authMiddleware;
