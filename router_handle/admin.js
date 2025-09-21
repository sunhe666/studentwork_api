const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { recordLog } = require('../utils/log');

const SECRET_KEY = 'your_secret_key'; // 建议放到环境变量

// 管理员登录
exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }
  const sql = 'SELECT * FROM admin WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      // 记录登录失败日志
      const loginFailedLog = {
        username: username,
        operation: '登录',
        resource_type: '管理员',
        ip_address: req.ip,
        operation_detail: { username, password: '******' },
        status: 0,
        error_message: err.message
      };
      recordLog(loginFailedLog);
      return res.status(500).json({ message: '数据库查询失败', error: err.message });
    }
    if (results.length > 0) {
      // 记录登录成功日志
      const loginSuccessLog = {
        username: username,
        operation: '登录',
        resource_type: '管理员',
        resource_id: results[0].id,
        resource_name: results[0].username,
        ip_address: req.ip,
        operation_detail: { username, password: '******' },
        status: 1
      };
      recordLog(loginSuccessLog);
      // 登录成功，生成token
      const token = jwt.sign(
        { username },
        SECRET_KEY,
        { expiresIn: '10h' }
      );
      res.json({ message: '登录成功', token });
    } else {
      // 记录登录失败日志 - 用户名或密码错误
      const loginFailedLog = {
        username: username,
        operation: '登录',
        resource_type: '管理员',
        ip_address: req.ip,
        operation_detail: { username, password: '******' },
        status: 0,
        error_message: '用户名或密码错误'
      };
      recordLog(loginFailedLog);
      res.status(401).json({ message: '用户名或密码错误' });
    }
  });
};

// 获取用户列表
exports.getUserList = (req, res) => {
  const sql = 'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: '获取用户列表失败', error: err.message });
    res.json({
      message: '获取用户列表成功',
      total: results.length,
      users: results
    });
  });
};

// 获取单个用户信息
exports.getUserById = (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: '无效的用户ID' });
  }
  const sql = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ message: '获取用户信息失败', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: '用户不存在' });
    res.json({
      message: '获取用户信息成功',
      user: results[0]
    });
  });
};

// 更新用户信息
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { username, email } = req.body;
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: '无效的用户ID' });
  }
  if (!username && !email) {
    return res.status(400).json({ message: '至少需要提供用户名或邮箱' });
  }

  // 检查用户名是否已存在（排除当前用户）
  const checkUsernameSql = username ? 'SELECT * FROM users WHERE username = ? AND id != ?' : null;
  if (checkUsernameSql) {
    db.query(checkUsernameSql, [username, id], (usernameErr, usernameResults) => {
      if (usernameErr) return res.status(500).json({ message: '查询失败', error: usernameErr.message });
      if (usernameResults.length > 0) return res.status(400).json({ message: '用户名已存在' });
      checkEmail();
    });
  } else {
    checkEmail();
  }

  function checkEmail() {
    if (!email) {
      updateUserInfo();
      return;
    }
    const checkEmailSql = 'SELECT * FROM users WHERE email = ? AND id != ?';
    db.query(checkEmailSql, [email, id], (emailErr, emailResults) => {
      if (emailErr) return res.status(500).json({ message: '查询失败', error: emailErr.message });
      if (emailResults.length > 0) return res.status(400).json({ message: '邮箱已被注册' });
      updateUserInfo();
    });
  }

  function updateUserInfo() {
    const fields = [];
    const values = [];
    if (username) { fields.push('username = ?'); values.push(username); }
    if (email) { fields.push('email = ?'); values.push(email); }

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.query(sql, values, (err, result) => {
      if (err) {
        // 记录更新用户失败日志
        const updateLog = {
          user_id: req.user?.id,
          username: req.user?.username,
          operation: '修改',
          resource_type: '用户',
          resource_id: id,
          resource_name: username,
          ip_address: req.ip,
          operation_detail: { id, username, email },
          status: 0,
          error_message: err.message
        };
        recordLog(updateLog);
        return res.status(500).json({ message: '更新用户失败', error: err.message });
      }
      if (result.affectedRows === 0) {
        // 记录更新用户失败日志 - 未找到用户
        const updateLog = {
          user_id: req.user?.id,
          username: req.user?.username,
          operation: '修改',
          resource_type: '用户',
          resource_id: id,
          resource_name: username || '',
          ip_address: req.ip,
          operation_detail: { id, username, email },
          status: 0,
          error_message: '用户不存在'
        };
        recordLog(updateLog);
        return res.status(404).json({ message: '用户不存在' });
      }
      // 记录更新用户成功日志
      const updateLog = {
        user_id: req.user?.id,
        username: req.user?.username,
        operation: '修改',
        resource_type: '用户',
        resource_id: id,
        resource_name: username,
        ip_address: req.ip,
        operation_detail: { id, username, email },
        status: 1
      };
      recordLog(updateLog);
      res.json({ message: '更新用户成功' });
    });
  }
};

// 删除用户
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: '无效的用户ID' });
  }
  const sql = 'DELETE FROM users WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
        // 记录删除用户失败日志
        const deleteLog = {
          user_id: req.user?.id,
          username: req.user?.username,
          operation: '删除',
          resource_type: '用户',
          resource_id: id,
          ip_address: req.ip,
          operation_detail: { id },
          status: 0,
          error_message: err.message
        };
        recordLog(deleteLog);
        return res.status(500).json({ message: '删除用户失败', error: err.message });
      }
      if (result.affectedRows === 0) {
        // 记录删除用户失败日志 - 未找到用户
        const deleteLog = {
          user_id: req.user?.id,
          username: req.user?.username,
          operation: '删除',
          resource_type: '用户',
          resource_id: id,
          ip_address: req.ip,
          operation_detail: { id },
          status: 0,
          error_message: '用户不存在'
        };
        recordLog(deleteLog);
        return res.status(404).json({ message: '用户不存在' });
      }
      // 记录删除用户成功日志
      const deleteLog = {
        user_id: req.user?.id,
        username: req.user?.username,
        operation: '删除',
        resource_type: '用户',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { id },
        status: 1
      };
      recordLog(deleteLog);
      res.json({ message: '删除用户成功' });
  });
};