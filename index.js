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
// 路由模块（逐步启用）
// const adminRouter = require('./router/admin');
// app.use(adminRouter);
// const uploadRouter = require('./router/upload');
// app.use(uploadRouter);
// const bannerRouter = require('./router/banner');
// app.use(bannerRouter);
// const contentRouter = require('./router/content');
// const categoryRouter = require('./router/category');
// const commentRouter = require('./router/comment');
// const userRouter = require('./router/user');
// const announcementRouter = require('./router/announcement');

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

// 直接定义thesis路由进行测试
app.get('/thesis/list', (req, res) => {
  try {
    console.log('开始处理thesis/list请求');
    
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 查询论文总数
    const countSql = 'SELECT COUNT(*) AS total FROM thesis';
    pool.query(countSql, (err, countResult) => {
      if (err) {
        console.error('数据库查询错误:', err);
        return res.status(500).json({
          message: '数据库查询失败',
          error: err.message
        });
      }

      const total = countResult[0].total;
      console.log('查询到总数:', total);

      // 查询论文列表
      const listSql = 'SELECT * FROM thesis ORDER BY publish_time DESC LIMIT ? OFFSET ?';
      console.log('列表查询SQL:', listSql);
      console.log('列表查询参数:', [limit, offset]);
      
      pool.query(listSql, [limit, offset], (err, results) => {
        if (err) {
          console.error('数据库查询错误:', err);
          return res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          });
        }

        console.log('查询结果数量:', results.length);
        res.json({
          total,
          list: results,
          page,
          limit
        });
      });
    });
  } catch (error) {
    console.error('thesis/list异常:', error);
    res.status(500).json({
      message: '服务器内部错误',
      error: error.message
    });
  }
});

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