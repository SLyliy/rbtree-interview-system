const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 注册路由 - 公开接口
router.post('/register', authController.register);

// 登录路由 - 公开接口
router.post('/login', authController.login);

// 添加管理员
router.post('/add-admin', authController.addAdmin);

module.exports = router;
