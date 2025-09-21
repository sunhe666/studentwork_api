// 加载环境变量
require('dotenv').config();

const express = require('express');
const app = express();

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
  res.json({
    message: '毕业设计项目API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
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

// 处理所有路由
app.all('*', (req, res) => {
  res.status(404).json({
    message: 'API路由未找到',
    path: req.path,
    method: req.method
  });
});

module.exports = app;
