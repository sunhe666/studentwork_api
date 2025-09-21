const mysql = require('mysql2');

// 支持DATABASE_URL环境变量（腾讯云等云数据库）
const createPool = () => {
  if (process.env.DATABASE_URL) {
    // 解析DATABASE_URL格式: mysql://user:password@host:port/database
    const url = new URL(process.env.DATABASE_URL);
    return mysql.createPool({
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // 移除开头的 /
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } else {
    // 传统的单独环境变量配置
    return mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'biyeshejiXM',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
};

const pool = createPool();

module.exports = pool; 