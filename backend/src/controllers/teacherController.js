const teacherModel = require('../models/teacherModel');
const { paginatedQuery, formatResponse } = require('../utils/queryHelper');

// 教师控制器
const teacherController = {
  // 获取所有教师
  getAllTeachers: async (req, res) => {
    try {
      const teachers = await teacherModel.getAllTeachers();
      return res.json({
        code: 200,
        data: teachers
      });
    } catch (error) {
      console.error('获取所有教师失败:', error);
      return res.status(500).json({
        code: 500,
        message: '获取所有教师失败',
        error: error.message
      });
    }
  },
  // 根据 query 查询教师
  queryTeachers: async (req, res) => {
    try {
      const { keyword, gender, current = 1, pageSize = 10 } = req.query;
      
      // 构建查询条件
      const where = {};
      if (keyword) where.name = `%${keyword}%`;
      if (gender !== undefined) where.gender = gender;
      
      // 使用通用查询函数
      const { list, total } = await paginatedQuery('teachers', {
        where,
        orderBy: 'created_at',
        orderDir: 'DESC',
        current: parseInt(current, 10),
        pageSize: parseInt(pageSize, 10)
      });
      
      // 返回格式化的响应
      return res.json(formatResponse(list, total, parseInt(current, 10), parseInt(pageSize, 10)));
    } catch (error) {
      console.error('获取教师列表失败:', error);
      return res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  },

  // 根据 ID 获取教师
  getTeacherById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const teacher = await teacherModel.getTeacherById(id);
      
      if (!teacher) {
        return res.status(404).json({
          code: 404,
          message: '教师不存在'
        });
      }
      
      res.json({
        code: 200,
        data: teacher
      });
    } catch (error) {
      console.error('获取教师详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取教师详情失败',
        error: error.message
      });
    }
  },

  // 创建教师
  createTeacher: async (req, res) => {
    const { name, logo, gender, website } = req.body;
    
    try {
      const teacherData = {
        name,
        logo,
        gender,
        website
      };
      
      const newTeacher = await teacherModel.createTeacher(teacherData);
      
      res.status(201).json({
        code: 200,
        data: newTeacher
      });
    } catch (error) {
      console.error('创建教师失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建教师失败',
        error: error.message
      });
    }
  },

  // 更新教师
  updateTeacher: async (req, res) => {
    const { id } = req.params;
    const { name, logo, gender, website } = req.body;
    
    try {
      // 检查教师是否存在
      const teacher = await teacherModel.getTeacherById(id);
      
      if (!teacher) {
        return res.status(404).json({
          code: 404,
          message: '教师不存在'
        });
      }
      
      const teacherData = {
        name,
        logo,
        gender,
        website
      };
      
      const updatedTeacher = await teacherModel.updateTeacher(id, teacherData);
      
      if (!updatedTeacher) {
        return res.status(400).json({
          code: 400,
          message: '没有提供要更新的数据'
        });
      }
      
      res.json({
        code: 200,
        data: updatedTeacher
      });
    } catch (error) {
      console.error('更新教师失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新教师失败',
        error: error.message
      });
    }
  },

  // 删除教师
  deleteTeacher: async (req, res) => {
    const { id } = req.params;
    
    try {
      // 检查教师是否存在
      const teacher = await teacherModel.getTeacherById(id);
      
      if (!teacher) {
        return res.status(404).json({
          code: 404,
          message: '教师不存在'
        });
      }
      
      // 删除教师
      await teacherModel.deleteTeacher(id);
      
      res.json({
        code: 200,
        data: true,
        message: '教师已成功删除'
      });
    } catch (error) {
      console.error('删除教师失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除教师失败',
        error: error.message
      });
    }
  }
};

module.exports = teacherController;
