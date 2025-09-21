module.exports = async (req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    // 简单的路由处理
    const url = req.url || '';
    
    if (url === '/' || url === '') {
      return res.json({
        message: '毕业设计项目API',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    }
    
    if (url === '/health') {
      // 检查数据库连接
      if (!process.env.DATABASE_URL) {
        return res.status(500).json({
          status: 'error',
          message: 'DATABASE_URL未配置'
        });
      }
      
      const mysql = require('mysql2');
      const dbUrl = new URL(process.env.DATABASE_URL);
      const pool = mysql.createPool({
        host: dbUrl.hostname,
        port: dbUrl.port || 3306,
        user: dbUrl.username,
        password: dbUrl.password,
        database: dbUrl.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      return new Promise((resolve) => {
        pool.getConnection((err, connection) => {
          if (err) {
            resolve(res.status(500).json({
              status: 'error',
              message: '数据库连接失败',
              error: err.message
            }));
          } else {
            connection.release();
            resolve(res.json({
              status: 'healthy',
              database: 'connected',
              timestamp: new Date().toISOString()
            }));
          }
        });
      });
    }
    
    // 论文相关路由
    if (url.startsWith('/thesis/')) {
      return handleThesisRoutes(req, res, url);
    }
    
    // 用户相关路由
    if (url.startsWith('/user/')) {
      return handleUserRoutes(req, res, url);
    }
    
    // 分类相关路由
    if (url.startsWith('/category/')) {
      return handleCategoryRoutes(req, res, url);
    }
    
    // 404处理
    return res.status(404).json({
      message: 'API路由未找到',
      path: url,
      method: req.method,
      availableRoutes: ['/', '/health', '/thesis/list', '/user/info', '/category/list']
    });
    
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 论文路由处理函数
async function handleThesisRoutes(req, res, url) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      message: 'DATABASE_URL未配置'
    });
  }
  
  const mysql = require('mysql2');
  const dbUrl = new URL(process.env.DATABASE_URL);
  const pool = mysql.createPool({
    host: dbUrl.hostname,
    port: dbUrl.port || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  if (url === '/thesis/list' || url.startsWith('/thesis/list?')) {
    // 解析查询参数
    const urlObj = new URL(url, `http://${req.headers.host}`);
    const page = parseInt(urlObj.searchParams.get('page')) || 1;
    const limit = parseInt(urlObj.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    return new Promise((resolve) => {
      // 查询论文总数
      pool.query('SELECT COUNT(*) AS total FROM thesis', (err, countResult) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }

        const total = countResult[0].total;
        
        // 查询论文列表
        pool.query('SELECT * FROM thesis ORDER BY publish_time DESC LIMIT ? OFFSET ?', 
          [limit, offset], (err, results) => {
          if (err) {
            resolve(res.status(500).json({
              message: '数据库查询失败',
              error: err.message
            }));
            return;
          }

          resolve(res.json({
            total,
            list: results,
            page,
            limit,
            timestamp: new Date().toISOString()
          }));
        });
      });
    });
  }
  
  // 其他论文路由
  return res.status(404).json({
    message: '论文API路由未找到',
    path: url,
    availableRoutes: ['/thesis/list']
  });
}

// 用户路由处理函数
async function handleUserRoutes(req, res, url) {
  // 简单的用户路由示例
  if (url === '/user/info') {
    return res.json({
      message: '用户信息接口',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(404).json({
    message: '用户API路由未找到',
    path: url,
    availableRoutes: ['/user/info']
  });
}

// 分类路由处理函数
async function handleCategoryRoutes(req, res, url) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      message: 'DATABASE_URL未配置'
    });
  }
  
  const mysql = require('mysql2');
  const dbUrl = new URL(process.env.DATABASE_URL);
  const pool = mysql.createPool({
    host: dbUrl.hostname,
    port: dbUrl.port || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  if (url === '/category/list' || url.startsWith('/category/list?')) {
    return new Promise((resolve) => {
      pool.query('SELECT * FROM category ORDER BY id ASC', (err, results) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }

        resolve(res.json({
          list: results,
          total: results.length,
          timestamp: new Date().toISOString()
        }));
      });
    });
  }
  
  return res.status(404).json({
    message: '分类API路由未找到',
    path: url,
    availableRoutes: ['/category/list']
  });
}
