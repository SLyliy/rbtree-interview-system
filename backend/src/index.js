const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

// 导入路由
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

// 加载环境变量
dotenv.config();

// 初始化 Express 应用
const app = express();
const PORT = process.env.PORT || 3006;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authRoutes); // 认证路由
app.use('/api/users', userRoutes); // 用户路由（需要认证）

// 根路由
app.get('/', (req, res) => {
  res.json({ message: '欢迎使用 IRB Forum API' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在: http://localhost:${PORT}`);
});
