const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

// 初始化数据库
const initDatabase = async () => {
  try {
    // 读取用户表 SQL 文件
    const usersSql = fs.readFileSync(
      path.join(__dirname, '../../sqls/03-users.sql'),
      'utf8'
    );

    // 执行 SQL 语句创建用户表
    await pool.query(usersSql);
    console.log('用户表创建成功');

    // 关闭连接池
    await pool.end();
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
};

// 执行初始化
initDatabase();
