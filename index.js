// 加载环境变量
require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 测试数据库连接
const pool = require('./db');
console.log('开始测试数据库连接...');
pool.getConnection((err, connection) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    console.error('完整错误信息:', err);
  } else {
    console.log('数据库连接成功');
    connection.release();
  }
});

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 测试路由（暂时注释掉）
// const testRouter = require('./test_api');
// app.use(testRouter);

app.use(express.json());
// 允许所有域名跨域（生产环境建议指定具体域名）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})
// 路由模块
const adminRouter = require('./router/admin');
app.use(adminRouter);
const uploadRouter = require('./router/upload');
app.use(uploadRouter);
const bannerRouter = require('./router/banner');
app.use(bannerRouter);
const contentRouter = require('./router/content');
const categoryRouter = require('./router/category');
const commentRouter = require('./router/comment');
const userRouter = require('./router/user');
const announcementRouter = require('./router/announcement');
const thesisRouter = require('./router/thesis');
const aiRouter = require('./router/ai');
const cooperationRouter = require('./router/cooperation');
const employeeRouter = require('./router/employee');
const roleRouter = require('./router/role');
const menuRouter = require('./router/menu');
const logRouter = require('./router/log');
const dashboardRouter = require('./router/dashboard');
const recruitmentRouter = require('./router/recruitment');

app.use(contentRouter);
app.use('/ai', aiRouter);
app.use('/cooperation', cooperationRouter);
app.use('/employee', employeeRouter);
app.use('/role', roleRouter);
app.use('/menu', menuRouter);
app.use(logRouter);
app.use(dashboardRouter);
app.use('/recruitment', recruitmentRouter);

app.use('/category', categoryRouter);
app.use('/comment', commentRouter);
app.use('/user', userRouter);
app.use('/announcement', announcementRouter);
app.use('/thesis', thesisRouter);

// 健康检查端点（放在路由之前）
app.get('/', (req, res) => {
  console.log('收到根路径请求');
  res.json({
    message: '毕业设计项目API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 简单测试路由
app.get('/test', (req, res) => {
  console.log('收到test请求');
  res.json({
    message: 'test路由工作正常',
    timestamp: new Date().toISOString()
  });
});

// 数据库健康检查
app.get('/health', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: '数据库连接失败',
        error: err.message
      });
    }
    
    connection.release();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  });
});

// 路由已通过thesis路由模块处理

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理:', err);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});