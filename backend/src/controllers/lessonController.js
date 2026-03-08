const lessonModel = require('../models/lessonModel');
const teacherModel = require('../models/teacherModel');
const { formatResponse } = require('../utils/queryHelper');

// 课程控制器
const lessonController = {
  // 获取所有课程，不需要分页，也不需要查询参数
  getAllLessons: async (req, res) => {
    try { 
      // 使用课程模型查询数据
      const list = await lessonModel.getAllLessons();
      
      // 返回格式化的响应
      return res.json({
        code: 200,
        data: list,
      });
    } catch (error) {
      console.error('获取课程列表失败:', error);
      return res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  },
  // 根据查询参数获取课程列表
  queryLessons: async (req, res) => {
    try {
      const { keyword, teacherId, current = 1, pageSize = 10 } = req.query;
      
      // 构建查询参数
      const query = {
        keyword,
        teacherId,
        current,
        pageSize,
      };
      
      // 使用课程模型查询数据
      const { list, total } = await lessonModel.queryLessons(query);
      
      // 返回格式化的响应
      return res.json(formatResponse(list, total, parseInt(current, 10), parseInt(pageSize, 10)));
    } catch (error) {
      console.error('获取课程列表失败:', error);
      return res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  },

  // 根据 ID 获取课程
  getLessonById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const lesson = await lessonModel.getLessonById(id);
      
      if (!lesson) {
        return res.status(404).json({
          code: 404,
          message: '课程不存在'
        });
      }
      
      res.json({
        code: 200,
        data: lesson
      });
    } catch (error) {
      console.error('获取课程详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取课程详情失败',
        error: error.message
      });
    }
  },

  // 创建课程
  createLesson: async (req, res) => {
    const { code, name, teacher_id, prerequisites, description } = req.body;
    
    try {
      // 检查课程代码是否已存在
      const codeExists = await lessonModel.checkCodeExists(code);
      if (codeExists) {
        return res.status(400).json({
          code: 400,
          message: '课程代码已存在'
        });
      }
      
      // 检查教师是否存在
      if (teacher_id) {
        const teacher = await teacherModel.getTeacherById(teacher_id);
        if (!teacher) {
          return res.status(400).json({
            code: 400,
            message: '指定的教师不存在'
          });
        }
      }
      
      const lessonData = {
        code,
        name,
        teacher_id,
        prerequisites,
        description
      };
      
      const newLesson = await lessonModel.createLesson(lessonData);
      
      res.status(201).json({
        code: 200,
        data: newLesson
      });
    } catch (error) {
      console.error('创建课程失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建课程失败',
        error: error.message
      });
    }
  },

  // 更新课程
  updateLesson: async (req, res) => {
    const { id } = req.params;
    const { code, name, teacher_id, prerequisites, description } = req.body;
    
    try {
      // 检查课程是否存在
      const lesson = await lessonModel.getLessonById(id);
      
      if (!lesson) {
        return res.status(404).json({
          code: 404,
          message: '课程不存在'
        });
      }
      
      // 如果提供了课程代码，检查是否与其他课程冲突
      if (code && code !== lesson.code) {
        const codeExists = await lessonModel.checkCodeExists(code, id);
        if (codeExists) {
          return res.status(400).json({
            code: 400,
            message: '课程代码已被其他课程使用'
          });
        }
      }
      
      // 如果提供了教师ID，检查教师是否存在
      if (teacher_id) {
        const teacher = await teacherModel.getTeacherById(teacher_id);
        if (!teacher) {
          return res.status(400).json({
            code: 400,
            message: '指定的教师不存在'
          });
        }
      }
      
      const lessonData = {
        code,
        name,
        teacher_id,
        prerequisites,
        description
      };
      
      const updatedLesson = await lessonModel.updateLesson(id, lessonData);
      
      if (!updatedLesson) {
        return res.status(400).json({
          code: 400,
          message: '没有提供要更新的数据'
        });
      }
      
      res.json({
        code: 200,
        data: updatedLesson
      });
    } catch (error) {
      console.error('更新课程失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新课程失败',
        error: error.message
      });
    }
  },

  // 删除课程
  deleteLesson: async (req, res) => {
    const { id } = req.params;
    
    try {
      // 检查课程是否存在
      const lesson = await lessonModel.getLessonById(id);
      
      if (!lesson) {
        return res.status(404).json({
          code: 404,
          message: '课程不存在'
        });
      }
      
      // 删除课程
      await lessonModel.deleteLesson(id);
      
      res.json({
        code: 200,
        data: true,
        message: '课程已成功删除'
      });
    } catch (error) {
      console.error('删除课程失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除课程失败',
        error: error.message
      });
    }
  }
};

module.exports = lessonController;
