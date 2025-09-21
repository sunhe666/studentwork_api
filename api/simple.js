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
    
    if (url.startsWith('/thesis/list')) {
      // 论文列表接口
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
    
    // 404处理
    return res.status(404).json({
      message: 'API路由未找到',
      path: url,
      method: req.method,
      availableRoutes: ['/', '/health', '/thesis/list']
    });
    
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({
      message: '服务器内部错误',
      error: error.message
    });
  }
};
