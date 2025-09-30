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
app.use('/api', uploadRouter);

// 添加通用代理路由（用于web前端）
app.use('/api/proxy', (req, res) => {
  const axios = require('axios');
  
  // 从请求路径中提取文件路径
  const filePath = req.path;
  
  if (!filePath) {
    return res.status(400).json({ message: '缺少文件路径参数' });
  }

  // 构建完整的OSS URL
  const targetUrl = `http://sunhe197428.oss-cn-beijing.aliyuncs.com${filePath}`;
  console.log('代理访问文件:', targetUrl);

  axios({
    method: 'GET',
    url: targetUrl,
    responseType: 'stream',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }).then(response => {
    // 设置响应头
    res.set({
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
      'Content-Length': response.headers['content-length'],
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // 如果是PDF文件，设置内联显示
    if (response.headers['content-type']?.includes('pdf')) {
      res.set('Content-Disposition', 'inline');
    }

    // 流式传输文件内容
    response.data.pipe(res);
  }).catch(error => {
    console.error('代理文件访问失败:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({ 
        message: '文件访问失败', 
        error: `HTTP ${error.response.status}: ${error.response.statusText}` 
      });
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      res.status(502).json({ message: '无法连接到文件服务器' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ message: '文件访问超时' });
    } else {
      res.status(500).json({ message: '服务器内部错误', error: error.message });
    }
  });
});
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