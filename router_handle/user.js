const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 生成JWT令牌
generateToken = (userId) => {
  return jwt.sign({ id: userId }, 'your_secret_key', { expiresIn: '24h' });
};

// 用户注册
exports.register = (req, res) => {
  const { username, email, password } = req.body;
  
  // 验证必填字段
  if (!username || !email || !password) {
    return res.status(400).json({ message: '用户名、邮箱和密码不能为空' });
  }
  
  // 验证用户名是否已存在
  const checkUsernameSql = 'SELECT * FROM users WHERE username = ?';
  db.query(checkUsernameSql, [username], (usernameErr, usernameResults) => {
    if (usernameErr) return res.status(500).json({ message: '数据库查询失败', error: usernameErr.message });
    if (usernameResults.length > 0) return res.status(400).json({ message: '用户名已存在' });
    
    // 验证邮箱是否已存在
    const checkEmailSql = 'SELECT * FROM users WHERE email = ?';
    db.query(checkEmailSql, [email], (emailErr, emailResults) => {
      if (emailErr) return res.status(500).json({ message: '数据库查询失败', error: emailErr.message });
      if (emailResults.length > 0) return res.status(400).json({ message: '邮箱已被注册' });
      
      // 密码加密
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      
      // 插入新用户
      const insertSql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      db.query(insertSql, [username, email, hashedPassword], (insertErr, insertResult) => {
        if (insertErr) return res.status(500).json({ message: '注册失败', error: insertErr.message });
        
        // 生成令牌
        const token = generateToken(insertResult.insertId);
        
        res.json({
          message: '注册成功',
          user: {
            id: insertResult.insertId,
            username,
            email
          },
          token
        });
      });
    });
  });
};

// 用户登录
exports.login = (req, res) => {
  const { email, password } = req.body;
  
  // 验证必填字段
  if (!email || !password) {
    return res.status(400).json({ message: '邮箱和密码不能为空' });
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: '请输入有效的邮箱地址' });
  }
  
  
  // 查询用户
  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: '数据库查询失败', error: err.message });
    if (results.length === 0) return res.status(401).json({ message: '邮箱或密码错误' });
    
    const user = results[0];
    // 验证密码
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: '邮箱或密码错误' });
    
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  });
};

// 获取用户信息
exports.getUserInfo = (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT id, username, email FROM users WHERE id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc('用户不存在');
    res.send({
      status: 0,
      message: '获取用户信息成功',
      data: results[0]
    });
  });
};

// 更新用户资料
exports.updateUser = (req, res) => {
  const userId = req.params.id;
const userInfo = req.body;
const { username, email } = req.body;

    // 验证参数
  if (!username && !email) {
    return res.status(400).json({ message: '至少需要提供用户名或邮箱' });
  }
  
  // 检查用户名是否已存在（如果修改了用户名）
  const checkUsernameSql = username ? 'SELECT * FROM users WHERE username = ? AND id != ?' : null;
  
  if (checkUsernameSql) {
    db.query(checkUsernameSql, [username, userId], (usernameErr, usernameResults) => {
      if (usernameErr) return res.status(500).json({ message: '查询失败', error: usernameErr.message });
      if (usernameResults.length > 0) return res.status(400).json({ message: '用户名已存在' });
      
      // 检查邮箱是否已存在（如果修改了邮箱）
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
    db.query(checkEmailSql, [email, userId], (emailErr, emailResults) => {
      if (emailErr) return res.status(500).json({ message: '查询失败', error: emailErr.message });
      if (emailResults.length > 0) return res.status(400).json({ message: '邮箱已被注册' });
      
      updateUserInfo();
    });
  }
  
  function updateUserInfo() {
    const fields = [];
    const values = [];
    
    if (username) {
      fields.push('username = ?');
      values.push(username);
    }
    if (email) {
      fields.push('email = ?');
      values.push(email);
    }
    
    const updateSql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    values.push(userId);
    
    db.query(updateSql, values, (updateErr, updateResult) => {
      if (updateErr) return res.status(500).json({ message: '更新失败', error: updateErr.message });
      
      res.json({
        message: '更新成功',
        user: {
          id: userId,
          username: username || req.user.username,
          email: email || req.user.email
        }
      });
    });
  }
};

// 修改密码
exports.changePassword = (req, res) => {
  const userId = req.params.id;
const { oldPassword, newPassword } = req.body;

    // 验证参数
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '旧密码和新密码不能为空' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码长度不能少于6位' });
  }
  
  // 查询用户当前密码
  const sql = 'SELECT password FROM users WHERE id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: '查询失败', error: err.message });
    
    // 验证旧密码
    const isPasswordValid = bcrypt.compareSync(oldPassword, results[0].password);
    if (!isPasswordValid) return res.status(400).json({ message: '旧密码错误' });
    
    // 加密新密码
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);
    
    // 更新密码
    const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
    db.query(updateSql, [hashedPassword, userId], (updateErr, updateResult) => {
      if (updateErr) return res.status(500).json({ message: '更新密码失败', error: updateErr.message });
      
      res.json({ message: '密码修改成功' });
    });
  });
};

// 注销用户
exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM users WHERE id = ?';
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: '注销失败', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: '用户不存在' });
    
    res.json({ message: '注销成功' });
  });
};