const userModel = require('../models/userModel');
const { paginatedQuery, formatResponse } = require('../utils/queryHelper');

const bcrypt = require('bcryptjs');

// 用户控制器
const userController = {
  // 获取所有用户
  getAllUsers: async (req, res) => {
    try {
      const { keyword, role, current = 1, pageSize = 10 } = req.query;
      
      // 构建查询条件
      const where = {};
      if (keyword) where.email = `%${keyword}%`;
      if (role) where.role = role;
      
      // 使用通用查询函数
      const { list, total } = await paginatedQuery('users', {
        where,
        orderBy: 'created_at',
        orderDir: 'DESC',
        current: parseInt(current, 10),
        pageSize: parseInt(pageSize, 10)
      });
      
      // 返回格式化的响应
      return res.json(formatResponse(list, total, parseInt(current, 10), parseInt(pageSize, 10)));
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ code: 500, message: 'Internal server error' });
    }
  },

  // 根据 ID 获取用户
  getUserById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const user = await userModel.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }
      
      res.json({
        code: 200,
        data: user
      });
    } catch (error) {
      console.error('获取用户详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取用户详情失败',
        error: error.message
      });
    }
  },

  // 创建用户
  createUser: async (req, res) => {
    const { name, nickname, email, password, role = 1, logo, major, description } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名、邮箱和密码为必填项'
      });
    }
    
    try {
      // 检查邮箱是否已存在
      const existingUserByEmail = await userModel.getUserByEmail(email);
      
      if (existingUserByEmail) {
        return res.status(400).json({
          code: 400,
          message: '该邮箱已被注册'
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        name,
        nickname,
        email,
        password: hashedPassword, 
        role,
        logo,
        major,
        description
      };
      
      const newUser = await userModel.createUser(userData);
      
      res.status(201).json({
        code: 200,
        data: newUser
      });
    } catch (error) {
      console.error('创建用户失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建用户失败',
        error: error.message
      });
    }
  },

  // 更新用户
  updateUser: async (req, res) => {
    const { id } = req.params;
    const { name, nickname, email, password, role, logo, major, description } = req.body;
    
    try {
      // 检查用户是否存在
      const user = await userModel.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }
      
      // 如果更新邮箱，检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        const existingUser = await userModel.getUserByEmail(email);
        
        if (existingUser) {
          return res.status(400).json({ 
            code: 400,
            message: '该邮箱已被其他用户使用'
          });
        }
      }
      
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        req.body.password = hashedPassword;
      }
      
      const userData = {
        name,
        nickname,
        email,
        password: req.body.password, // 使用可能已经加密的密码
        role,
        logo,
        major,
        description
      };
      
      const updatedUser = await userModel.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(400).json({
          code: 400,
          message: '没有提供要更新的数据'
        });
      }
      
      res.json({
        code: 200,
        data: updatedUser
      });
    } catch (error) {
      console.error('更新用户失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新用户失败',
        error: error.message
      });
    }
  },

  // 删除用户
  deleteUser: async (req, res) => {
    const { id } = req.params;
    
    try {
      // 检查用户是否存在
      const user = await userModel.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }
      
      // 删除用户
      await userModel.deleteUser(id);
      
      res.json({
        code: 200,
        data: true,
        message: '用户已成功删除'
      });
    } catch (error) {
      console.error('删除用户失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除用户失败',
        error: error.message
      });
    }
  }
};

module.exports = userController;
