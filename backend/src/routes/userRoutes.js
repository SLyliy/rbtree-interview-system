const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');

// 所有用户路由都需要认证
router.use(authMiddleware);

// 获取所有用户 - 仅管理员可访问
router.get('/', adminAuth, userController.getAllUsers);

// 获取单个用户 - 普通用户只能获取自己的信息，管理员可以获取任何用户信息
router.get('/:id', (req, res, next) => {
  // 如果用户请求的是自己的信息，则允许访问
  if (req.user.id === parseInt(req.params.id)) {
    return next();
  }
  // 否则需要管理员权限
  adminAuth(req, res, next);
}, userController.getUserById);

// 创建用户 - 仅管理员可访问
router.post('/', adminAuth, userController.createUser);

// 更新用户 - 普通用户只能更新自己的信息，管理员可以更新任何用户信息
router.put('/:id', (req, res, next) => {
  // 如果用户更新的是自己的信息，则允许访问
  if (req.user.id === parseInt(req.params.id)) {
    return next();
  }
  // 否则需要管理员权限
  adminAuth(req, res, next);
}, userController.updateUser);

// 删除用户 - 仅管理员可访问
router.delete('/:id', adminAuth, userController.deleteUser);

module.exports = router;
