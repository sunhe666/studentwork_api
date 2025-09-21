// 日志工具函数
const pool = require('../db');

/**
 * 记录操作日志
 * @param {Object} logInfo - 日志信息
 * @param {number} [logInfo.user_id] - 操作用户ID
 * @param {string} [logInfo.username] - 操作用户名
 * @param {string} logInfo.operation - 操作类型（如：登录、添加、修改、删除）
 * @param {string} [logInfo.resource_type] - 操作资源类型（如：员工、角色、菜单等）
 * @param {number} [logInfo.resource_id] - 操作资源ID
 * @param {string} [logInfo.resource_name] - 操作资源名称
 * @param {string} [logInfo.ip_address] - 操作IP地址
 * @param {Object} [logInfo.operation_detail] - 操作详情（请求参数等）
 * @param {number} logInfo.status - 操作状态（1-成功，0-失败）
 * @param {string} [logInfo.error_message] - 错误信息（如果操作失败）
 * @returns {Promise<void>} - 异步操作结果
 */
const recordLog = async (logInfo) => {
  try {
    const { 
      user_id, 
      username, 
      operation, 
      resource_type, 
      resource_id, 
      resource_name, 
      ip_address, 
      operation_detail, 
      status = 1, 
      error_message 
    } = logInfo;

    // 构建SQL参数
    const sql = `
      INSERT INTO sys_log (
        user_id, 
        username, 
        operation, 
        resource_type, 
        resource_id, 
        resource_name, 
        ip_address, 
        operation_detail, 
        status, 
        error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user_id || null,
      username || null,
      operation,
      resource_type || null,
      resource_id || null,
      resource_name || null,
      ip_address || null,
      operation_detail ? JSON.stringify(operation_detail) : null,
      status,
      error_message || null
    ];

    // 执行SQL
    await new Promise((resolve, reject) => {
      pool.query(sql, params, (err, result) => {
        if (err) {
          console.error('记录日志失败:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    console.error('记录日志异常:', error);
    // 记录日志失败不应影响主业务流程
  }
};

// 简易日志工具
const logger = {
  error: (message, error) => {
    console.error(message, error);
  },
  info: (message) => {
    console.info(message);
  },
  debug: (message) => {
    console.debug(message);
  }
};

module.exports = {
  recordLog,
  logger
};