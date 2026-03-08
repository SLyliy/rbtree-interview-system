/**
 * 管理员权限验证中间件
 * 该中间件应该在 JWT 验证中间件之后使用
 * 用于验证已登录用户是否具有管理员权限
 */
const adminAuth = (req, res, next) => {
  // req.user 是由 JWT 中间件解析并添加的用户信息
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: '未授权，请先登录'
    });
  }

  // 检查用户角色是否为管理员（role = 9）
  if (req.user.role !== 9) {
    return res.status(403).json({
      code: 403,
      message: '权限不足，需要管理员权限'
    });
  }

  // 如果是管理员，则继续执行下一个中间件或路由处理函数
  next();
};

module.exports = adminAuth;
