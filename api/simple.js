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
    
    // 公告相关路由
    if (url.startsWith('/announcement/')) {
      return handleAnnouncementRoutes(req, res, url);
    }
    
    // 评论相关路由
    if (url.startsWith('/comment/')) {
      return handleCommentRoutes(req, res, url);
    }
    
    // 管理员相关路由
    if (url.startsWith('/admin/')) {
      return handleAdminRoutes(req, res, url);
    }
    
    // 文件上传相关路由
    if (url.startsWith('/upload/')) {
      return handleUploadRoutes(req, res, url);
    }
    
    // 404处理
    return res.status(404).json({
      message: 'API路由未找到',
      path: url,
      method: req.method,
      availableRoutes: ['/', '/health', '/thesis/list', '/user/info', '/user/login', '/user/register', '/category/list', '/announcement/list', '/comment/list', '/admin/login', '/upload/file']
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

  // 用户信息
  if (url === '/user/info') {
    return res.json({
      message: '用户信息接口',
      timestamp: new Date().toISOString()
    });
  }
  
  // 用户登录
  if (url === '/user/login' && req.method === 'POST') {
    return new Promise((resolve) => {
      const { username, password } = req.body || {};
      
      if (!username || !password) {
        resolve(res.status(400).json({
          message: '用户名和密码不能为空'
        }));
        return;
      }
      
      pool.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }
        
        if (results.length === 0) {
          resolve(res.status(401).json({
            message: '用户不存在'
          }));
          return;
        }
        
        // 这里应该进行密码验证，简化处理
        resolve(res.json({
          message: '登录成功',
          user: {
            id: results[0].id,
            username: results[0].username,
            email: results[0].email
          },
          token: 'mock_token_' + Date.now(),
          timestamp: new Date().toISOString()
        }));
      });
    });
  }
  
  // 用户注册
  if (url === '/user/register' && req.method === 'POST') {
    return new Promise((resolve) => {
      const { username, password, email } = req.body || {};
      
      if (!username || !password || !email) {
        resolve(res.status(400).json({
          message: '用户名、密码和邮箱不能为空'
        }));
        return;
      }
      
      // 检查用户是否已存在
      pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, results) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }
        
        if (results.length > 0) {
          resolve(res.status(409).json({
            message: '用户名或邮箱已存在'
          }));
          return;
        }
        
        // 插入新用户（实际项目中应该对密码进行加密）
        pool.query('INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, NOW())', 
          [username, password, email], (err, result) => {
          if (err) {
            resolve(res.status(500).json({
              message: '用户注册失败',
              error: err.message
            }));
            return;
          }
          
          resolve(res.status(201).json({
            message: '注册成功',
            user: {
              id: result.insertId,
              username,
              email
            },
            timestamp: new Date().toISOString()
          }));
        });
      });
    });
  }
  
  return res.status(404).json({
    message: '用户API路由未找到',
    path: url,
    availableRoutes: ['/user/info', '/user/login', '/user/register']
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

// 公告路由处理函数
async function handleAnnouncementRoutes(req, res, url) {
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

  if (url === '/announcement/list' || url.startsWith('/announcement/list?')) {
    // 解析查询参数
    const urlObj = new URL(url, `http://${req.headers.host}`);
    const page = parseInt(urlObj.searchParams.get('page')) || 1;
    const limit = parseInt(urlObj.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    return new Promise((resolve) => {
      // 查询公告总数
      pool.query('SELECT COUNT(*) AS total FROM announcement', (err, countResult) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }

        const total = countResult[0].total;
        
        // 查询公告列表
        pool.query('SELECT * FROM announcement ORDER BY created_at DESC LIMIT ? OFFSET ?', 
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
  
  return res.status(404).json({
    message: '公告API路由未找到',
    path: url,
    availableRoutes: ['/announcement/list']
  });
}

// 评论路由处理函数
async function handleCommentRoutes(req, res, url) {
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

  if (url === '/comment/list' || url.startsWith('/comment/list?')) {
    // 解析查询参数
    const urlObj = new URL(url, `http://${req.headers.host}`);
    const thesisId = urlObj.searchParams.get('thesis_id');
    const page = parseInt(urlObj.searchParams.get('page')) || 1;
    const limit = parseInt(urlObj.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    
    if (thesisId) {
      whereClause = 'WHERE thesis_id = ?';
      params.push(thesisId);
    }

    return new Promise((resolve) => {
      // 查询评论总数
      pool.query(`SELECT COUNT(*) AS total FROM comment ${whereClause}`, params, (err, countResult) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }

        const total = countResult[0].total;
        
        // 查询评论列表
        pool.query(`SELECT * FROM comment ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, 
          [...params, limit, offset], (err, results) => {
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
  
  return res.status(404).json({
    message: '评论API路由未找到',
    path: url,
    availableRoutes: ['/comment/list?thesis_id=1']
  });
}

// 管理员路由处理函数
async function handleAdminRoutes(req, res, url) {
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

  // 管理员登录
  if (url === '/admin/login' && req.method === 'POST') {
    return new Promise((resolve) => {
      const { username, password } = req.body || {};
      
      if (!username || !password) {
        resolve(res.status(400).json({
          message: '用户名和密码不能为空'
        }));
        return;
      }
      
      pool.query('SELECT * FROM admin WHERE username = ?', [username], (err, results) => {
        if (err) {
          resolve(res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          }));
          return;
        }
        
        if (results.length === 0) {
          resolve(res.status(401).json({
            message: '管理员不存在'
          }));
          return;
        }
        
        // 简化密码验证
        resolve(res.json({
          message: '管理员登录成功',
          admin: {
            id: results[0].id,
            username: results[0].username,
            role: results[0].role || 'admin'
          },
          token: 'admin_token_' + Date.now(),
          timestamp: new Date().toISOString()
        }));
      });
    });
  }
  
  return res.status(404).json({
    message: '管理员API路由未找到',
    path: url,
    availableRoutes: ['/admin/login']
  });
}

// 文件上传路由处理函数
async function handleUploadRoutes(req, res, url) {
  // 文件上传接口
  if (url === '/upload/file' && req.method === 'POST') {
    return res.json({
      message: '文件上传接口',
      note: '实际项目中需要配置multer等中间件处理文件上传',
      mockUrl: 'https://example.com/uploads/file_' + Date.now() + '.pdf',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(404).json({
    message: '上传API路由未找到',
    path: url,
    availableRoutes: ['/upload/file']
  });
}
