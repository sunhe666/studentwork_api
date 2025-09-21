// 加载环境变量
require('dotenv').config();

const mysql = require('mysql2');

// 数据库连接
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

module.exports = async (req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    console.log('开始处理thesis/list请求');
    
    if (!pool) {
      return res.status(500).json({
        message: 'DATABASE_URL未配置'
      });
    }
    
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
};
