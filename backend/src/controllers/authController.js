const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const jwtConfig = require('../config/jwt');

// 认证控制器
const authController = {
  // 用户注册
  register: async (req, res) => {
    const { name, nickname, email, password, role = 1, logo, major, description } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ code: 400, message: '用户名、邮箱和密码为必填项' });
    }
      
    try {
      
      // 检查邮箱是否已存在
      const existingUserByEmail = await userModel.getUserByEmail(email);
      
      if (existingUserByEmail) {
        return res.status(400).json({ code: 400, message: '该邮箱已被注册' });
      }
      
      // 对密码进行加密，这个过程称之为加盐
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const userData = {
        name,
        nickname,
        email,
        password: hashedPassword, // 存储加密后的密码
        role,
        logo,
        major,
        description
      };
      
      // 创建新用户
      const newUser = await userModel.createUser(userData);
      
      // 生成 JWT token
      const token = jwt.sign(
        { id: newUser.id, name: newUser.name, role: newUser.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );
      
      // 返回用户信息和 token
      res.status(201).json({
        code: 200,
        message: '注册成功',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
          },
          token
        }
      });
    } catch (error) {
      console.error('注册失败:', error);
      res.status(500).json({ code: 500, message: '注册失败', error: error.message });
    }
  },

  // 用户登录
  login: async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ code: 400, message: '邮箱和密码为必填项' });
    }
    
    try {
      // 查找用户
      const user = await userModel.getUserByEmailWithPassword(email);
      
      if (!user) {
        return res.status(400).json({ code: 400, message: '邮箱或密码不正确' });
      }
      
      // 添加调试信息
      console.log('登录用户信息:', {
        id: user.id,
        email: user.email,
        passwordExists: !!user.password,
        passwordType: typeof user.password,
        password: user.password
      });
      console.log(password)
      console.log(user.password)
      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ code: 400, message: '邮箱或密码不正确' });
      }
      
      // 检查用户数据完整性
      if (!user.id || !user.name || !user.role) {
        console.error('用户数据不完整:', { id: user.id, name: user.name, role: user.role });
        return res.status(500).json({ code: 500, message: '用户数据不完整' });
      }

      // 检查 JWT 配置
      if (!jwtConfig.secret) {
        console.error('JWT secret 未配置');
        return res.status(500).json({ code: 500, message: '服务器配置错误' });
      }

      // 生成 JWT token
      const tokenPayload = {
        id: user.id,
        name: user.name,
        role: user.role
      };
      
      console.log('生成 token 的数据:', tokenPayload);
      console.log('JWT 配置:', { secret: jwtConfig.secret ? '已配置' : '未配置', expiresIn: jwtConfig.expiresIn });

      const token = jwt.sign(tokenPayload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
      
      // 返回用户信息和 token
      res.json({
        code: 200,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('登录失败:', error);
      res.status(500).json({ 
        code: 500, 
        message: '登录失败', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // 获取当前用户信息
  getCurrentUser: async (req, res) => {
    try {
      // req.user 由 authMiddleware 中间件添加
      const user = await userModel.getUserById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ code: 404, message: '用户不存在' });
      }
      
      // 返回用户信息（不包含密码）
      res.json({
        code: 200,
        message: '获取当前用户信息成功',
        data: {
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
          logo: user.logo,
          major: user.major,
          description: user.description,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      res.status(500).json({ code: 500, message: '获取当前用户信息失败', error: error.message });
  }
  },
  
  // 添加管理员
  addAdmin: async (req, res) => {
    try {
      // 检查是否是命令行环境
      const isCommandLine = !req.headers.origin && !req.headers.referer;
      
      if (!isCommandLine) {
        return res.status(403).json({ 
          code: 403, 
          message: '该接口只能通过命令行调用' 
        });
      }
      
      const { name, nickname, email, password, secret_key } = req.body;
      
      if (!name || !email || !password || !secret_key || secret_key !== process.env.SYSTEM_NAME) {
        return res.status(400).json({ 
          code: 400, 
          message: '用户名、邮箱、密码和密钥为必填项' 
        });
      }
      
      // 检查邮箱是否已存在
      const existingUserByEmail = await userModel.getUserByEmail(email);
      
      if (existingUserByEmail) {
        return res.status(400).json({ 
          code: 400, 
          message: '该邮箱已被注册' 
        });
      }
      
      // 对密码进行加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const userData = {
        name,
        nickname,
        email,
        password: hashedPassword,
        role: 9, // 管理员角色值为 9
      };
      
      // 创建管理员用户
      const newAdmin = await userModel.createUser(userData);
      
      res.status(201).json({
        code: 200,
        message: '管理员创建成功',
        data: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
        }
      });
    } catch (error) {
      console.error('创建管理员失败:', error);
      res.status(500).json({ 
        code: 500, 
        message: '创建管理员失败', 
        error: error.message 
      });
    }
  }
};

module.exports = authController;
