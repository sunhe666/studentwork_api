// 加载环境变量
require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

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
});

// 简单的健康检查
app.get('/', (req, res) => {
  res.json({
    message: '毕业设计项目API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database_url_set: !!process.env.DATABASE_URL
  });
});

// 数据库连接测试
app.get('/db-test', (req, res) => {
  try {
    const mysql = require('mysql2');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL 环境变量未设置'
      });
    }

    const url = new URL(process.env.DATABASE_URL);
    const pool = mysql.createPool({
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    pool.getConnection((err, connection) => {
      if (err) {
        return res.status(500).json({
          error: '数据库连接失败',
          message: err.message
        });
      }
      
      connection.release();
      res.json({
        status: 'success',
        message: '数据库连接正常'
      });
    });
  } catch (error) {
    res.status(500).json({
      error: '数据库测试异常',
      message: error.message
    });
  }
});

// 简单的论文列表接口
app.get('/thesis/list', (req, res) => {
  try {
    const mysql = require('mysql2');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL 环境变量未设置'
      });
    }

    const url = new URL(process.env.DATABASE_URL);
    const pool = mysql.createPool({
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const sql = 'SELECT COUNT(*) as total FROM thesis';
    pool.query(sql, (err, results) => {
      if (err) {
        return res.status(500).json({
          error: '查询失败',
          message: err.message
        });
      }
      
      res.json({
        message: '查询成功',
        total: results[0].total,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    res.status(500).json({
      error: '接口异常',
      message: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`简化版API运行在端口 ${port}`);
});
