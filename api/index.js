// 加载环境变量
require('dotenv').config();

const express = require('express');
const app = express();

// 添加调试日志
console.log('API启动中...');

// 中间件
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 数据库连接
const mysql = require('mysql2');
let pool;

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  pool = mysql.createPool({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// API路由
app.get('/', (req, res) => {
  console.log('收到根路径请求');
  res.json({
    message: '毕业设计项目API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  console.log('收到健康检查请求');
  if (!pool) {
    return res.status(500).json({
      status: 'error',
      message: 'DATABASE_URL未配置'
    });
  }

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

// 论文列表API
app.get('/thesis/list', async (req, res) => {
  try {
    console.log('收到thesis/list请求');
    
    if (!pool) {
      return res.status(500).json({
        message: 'DATABASE_URL未配置'
      });
    }
    
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log('查询参数:', { page, limit, offset });

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
          limit,
          timestamp: new Date().toISOString()
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

// 处理所有其他路由
app.all('*', (req, res) => {
  console.log('未找到路由:', req.method, req.path);
  res.status(404).json({
    message: 'API路由未找到',
    path: req.path,
    method: req.method,
    availableRoutes: ['/', '/health', '/thesis/list']
  });
});

// 简化导出，直接导出Express应用
module.exports = app;
