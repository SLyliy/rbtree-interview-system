const db = require('../db');

// 用户模型
const userModel = {
  // 获取所有用户
  getAllUsers: async (query = {}) => {
    // 基础SQL
    let sql = 'SELECT * FROM users';
    const params = [];
    
    // 构建WHERE子句
    const whereConditions = [];
    
    // 用户名、昵称、邮箱模糊搜索
    if (query.keyword) {
      whereConditions.push('(name ILIKE $1 OR nickname ILIKE $2 OR email ILIKE $3)');
      params.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
    }
    
    // 角色精确匹配
    if (query.role) {
      const paramIndex = params.length + 1;
      whereConditions.push(`role = $${paramIndex}`);
      params.push(query.role);
    }
    
    // 添加WHERE子句
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // 获取总数的SQL
    const countSql = `SELECT COUNT(*) AS total FROM users${whereConditions.length ? ' WHERE ' + whereConditions.join(' AND ') : ''}`;
    
    // 构建排序子句
    if (query.sortField && query.sortOrder) {
      const order = query.sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      sql += ` ORDER BY "${query.sortField}" ${order}`;
    } else {
      // 默认排序
      sql += ' ORDER BY created_at DESC';
    }
    
    // 添加分页
    if (query.current && query.pageSize) {
      const current = parseInt(query.current);
      const pageSize = parseInt(query.pageSize);
      const offset = (current - 1) * pageSize;
      const paramIndex1 = params.length + 1;
      const paramIndex2 = params.length + 2;
      sql += ` OFFSET $${paramIndex1} LIMIT $${paramIndex2}`;
      params.push(offset, pageSize);
    }
    
    // 执行查询
    const countResult = await db.query(countSql, params.slice(0, whereConditions.length));
    const total = parseInt(countResult.rows[0].total);
    
    const dataResult = await db.query(sql, params);
    
    return {
      list: dataResult.rows,
      total
    };
  },

  // 根据 ID 获取用户
  getUserById: async (id) => {
    const query = `
      SELECT id, name, nickname, email, password, role, logo, major, description, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 根据邮箱获取用户
  getUserByEmail: async (email) => {
    const query = `
      SELECT id, name, nickname, email, password, role, logo, major, description, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    try {
      const result = await db.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 根据邮箱获取用户携带 Password
  getUserByEmailWithPassword: async (email) => {
    const query = `
      SELECT id, name, nickname, email, password, role, logo, major, description, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    try {
      const result = await db.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 创建用户
  createUser: async (userData) => {
    const { name, nickname, email, password, role = 1, logo, major, description } = userData;
    const query = `
      INSERT INTO users (name, nickname, email, password, role, logo, major, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, nickname, email, role, logo, major, description, created_at, updated_at
    `;
    try {
      const values = [name, nickname, email, password, role, logo, major, description];
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 更新用户
  updateUser: async (id, userData) => {
    // 构建动态更新查询
    const { name, nickname, email, role, logo, major, description } = userData;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // 添加需要更新的字段
    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIndex}`);
      values.push(nickname);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    if (logo !== undefined) {
      updates.push(`logo = $${paramIndex}`);
      values.push(logo);
      paramIndex++;
    }
    if (major !== undefined) {
      updates.push(`major = $${paramIndex}`);
      values.push(major);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    // 添加更新时间
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // 如果没有要更新的字段，则返回 null
    if (updates.length === 1) {
      return null;
    }

    // 构建查询
    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, nickname, email, role, logo, major, description, created_at, updated_at
    `;
    values.push(id);

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 删除用户
  deleteUser: async (id) => {
    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
    `;
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
};

module.exports = userModel;
