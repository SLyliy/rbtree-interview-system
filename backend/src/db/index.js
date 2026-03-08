const { Pool } = require('pg');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 测试数据库连接
pool.connect((err, client, release) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
    return;
  }
  console.log('成功连接到 PostgreSQL 数据库');
  release();
});

// 封装查询方法
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool
};
