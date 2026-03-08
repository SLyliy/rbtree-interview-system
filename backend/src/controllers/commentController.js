const commentModel = require('../models/commentModel');
const lessonModel = require('../models/lessonModel');
const { formatResponse } = require('../utils/queryHelper');

const commentController = {
  // 添加评论
  addComment: async (req, res) => {
    try {
      const { lesson_id, difficulty_score, assignment_score, grading_score, harvest_score, content, parent_id } = req.body;
      const user_id = req.user.id;

      // 验证课程是否存在
      const lesson = await lessonModel.getLessonById(lesson_id);
      if (!lesson) {
        return res.status(404).json({
          code: 404,
          message: '课程不存在'
        });
      }

      // 验证评分范围 (1-5)
      if (![difficulty_score, assignment_score, grading_score, harvest_score].every(score => score >= 1 && score <= 5)) {
        return res.status(400).json({
          code: 400,
          message: '评分必须在1-5之间'
        });
      }

      // 验证父评论是否存在（如果提供）
      if (parent_id) {
        const parentComment = await commentModel.getCommentById(parent_id);
        if (!parentComment) {
          return res.status(404).json({
            code: 404,
            message: '父评论不存在'
          });
        }
      }

      const commentData = {
        lesson_id,
        user_id,
        difficulty_score,
        assignment_score,
        grading_score,
        harvest_score,
        content,
        parent_id
      };

      const newComment = await commentModel.addComment(commentData);

      res.status(201).json({
        code: 200,
        data: newComment,
        message: '评论已提交，等待审核'
      });
    } catch (error) {
      console.error('添加评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '添加评论失败',
        error: error.message
      });
    }
  },

  // 更新评论（只有评论作者可以更新）
  updateComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { difficulty_score, assignment_score, grading_score, harvest_score, content } = req.body;
      const user_id = req.user.id;

      // 验证评分范围 (1-5)
      if (![difficulty_score, assignment_score, grading_score, harvest_score].every(score => score >= 1 && score <= 5)) {
        return res.status(400).json({
          code: 400,
          message: '评分必须在1-5之间'
        });
      }

      const commentData = {
        difficulty_score,
        assignment_score,
        grading_score,
        harvest_score,
        content
      };

      const updatedComment = await commentModel.updateComment(id, user_id, commentData);

      if (!updatedComment) {
        return res.status(404).json({
          code: 404,
          message: '评论不存在或您无权更新此评论'
        });
      }

      res.json({
        code: 200,
        data: updatedComment,
        message: '评论已更新，等待审核'
      });
    } catch (error) {
      console.error('更新评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新评论失败',
        error: error.message
      });
    }
  },

  // 获取课程的所有评论
  getCommentsByLessonId: async (req, res) => {
    try {
      const { lesson_id } = req.params;
      const { current = 1, pageSize = 10 } = req.query;
      const user_id = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // 验证课程是否存在
      const lesson = await lessonModel.getLessonById(lesson_id);
      if (!lesson) {
        return res.status(404).json({
          code: 404,
          message: '课程不存在'
        });
      }

      const options = {
        includeUnapproved: isAdmin,
        userId: user_id,
        current: parseInt(current, 10),
        pageSize: parseInt(pageSize, 10)
      };

      const { list, total } = await commentModel.getCommentsByLessonId(lesson_id, options);

      return res.json(formatResponse(list, total, options.current, options.pageSize));
    } catch (error) {
      console.error('获取评论列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取评论列表失败',
        error: error.message
      });
    }
  },

  // 删除评论（评论作者或管理员可以删除）
  deleteComment: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // 获取评论信息
      const comment = await commentModel.getCommentById(id);
      if (!comment) {
        return res.status(404).json({
          code: 404,
          message: '评论不存在'
        });
      }

      // 检查权限：只有评论作者或管理员可以删除
      if (comment.user_id !== user_id && !isAdmin) {
        return res.status(403).json({
          code: 403,
          message: '您无权删除此评论'
        });
      }

      // 删除评论
      await commentModel.deleteComment(id);

      // 如果评论已审核通过，需要更新课程统计
      if (comment.status === 1) {
        const db = require('../db');
        await db.query('SELECT update_lesson_stats($1)', [comment.lesson_id]);
      }

      res.json({
        code: 200,
        message: '评论已成功删除'
      });
    } catch (error) {
      console.error('删除评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除评论失败',
        error: error.message
      });
    }
  },

  // 更新评论状态（仅管理员可操作）
  updateCommentStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // 验证状态值
      if (![0, 1, 2].includes(status)) {
        return res.status(400).json({
          code: 400,
          message: '无效的状态值，必须是 0(未审核), 1(已通过) 或 2(未通过)'
        });
      }

      // 获取评论信息
      const comment = await commentModel.getCommentById(id);
      if (!comment) {
        return res.status(404).json({
          code: 404,
          message: '评论不存在'
        });
      }

      // 更新评论状态
      const updatedComment = await commentModel.updateCommentStatus(id, status);

      res.json({
        code: 200,
        data: updatedComment,
        message: '评论状态已更新'
      });
    } catch (error) {
      console.error('更新评论状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新评论状态失败',
        error: error.message
      });
    }
  },

  // 获取用户的所有评论
  getUserComments: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { current = 1, pageSize = 10 } = req.query;

      const options = {
        current: parseInt(current, 10),
        pageSize: parseInt(pageSize, 10)
      };

      const { list, total } = await commentModel.getUserComments(user_id, options);

      return res.json(formatResponse(list, total, options.current, options.pageSize));
    } catch (error) {
      console.error('获取用户评论列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取用户评论列表失败',
        error: error.message
      });
    }
  }
};

module.exports = commentController;
