const pool = require('../db');
const { recordLog } = require('../utils/log');


/**
 * 员工登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.loginEmployee = (req, res) => {
  const { username, password } = req.body;
 

  // 验证参数
  if (!username || !password) {
    // 记录登录失败日志
    const failLog = {
      user_id: req.user?.id || null,
      username: username || '匿名',
      operation: '登录',
      resource_type: '员工',
      ip_address: req.ip,
      operation_detail: { action: '员工登录请求', username },
      status: 0,
      error_message: '用户名或密码为空'
    };
    recordLog(failLog);
    return res.status(400).json({
      message: '请输入用户名和密码'
    });
  }

  // 根据用户名查询用户
  const sql = 'SELECT * FROM sys_user WHERE username = ?';
  pool.query(sql, [username], (err, result) => {
    if (err) {
      // 记录数据库查询失败日志
      const dbLog = {
        user_id: req.user?.id || null,
        username: username,
        operation: '登录',
        resource_type: '员工',
        ip_address: req.ip,
        operation_detail: { action: '员工登录数据库查询', username, sql },
        status: 0,
        error_message: err.message
      };
      recordLog(dbLog);
      return res.status(500).json({
        message: '登录失败',
        error: err.message
      });
    }

    if (result.length === 0) {
        // 记录用户名不存在日志
        const notFoundLog = {
          user_id: req.user?.id || null,
          username: username,
          operation: '登录',
          resource_type: '员工',
          ip_address: req.ip,
          operation_detail: { action: '员工登录验证', username },
          status: 0,
          error_message: '用户名不存在'
        };
        recordLog(notFoundLog);
        return res.status(401).json({
          message: '用户名不存在'
        });
      }

      const user = result[0];

      // 验证密码
      // 注意：实际项目中应该使用加密比较，这里简化处理
      if (user.password !== password) {
        // 记录密码错误日志
        const pwdLog = {
          user_id: user.id,
          username: username,
          operation: '登录',
          resource_type: '员工',
          ip_address: req.ip,
          operation_detail: { action: '员工登录密码验证', username, userId: user.id },
          status: 0,
          error_message: '密码错误'
        };
        recordLog(pwdLog);
        return res.status(401).json({
          message: '密码错误'
        });
      }

      // 检查用户状态
      if (user.status === 0) {
        // 记录账号禁用日志
        const disabledLog = {
          user_id: user.id,
          username: username,
          operation: '登录',
          resource_type: '员工',
          ip_address: req.ip,
          operation_detail: { action: '员工登录状态检查', username, userId: user.id, status: user.status },
          status: 0,
          error_message: '账号已禁用'
        };
        recordLog(disabledLog);
        return res.status(403).json({
          message: '账号已禁用'
        });
      }

      // 登录成功，可以生成token等操作
      // 这里简化处理，只返回用户信息
      const successLog = {
        user_id: user.id,
        username: username,
        operation: '登录',
        resource_type: '员工',
        resource_id: user.id,
        ip_address: req.ip,
        operation_detail: { action: '员工登录成功', username, userId: user.id, roleId: user.role_id },
        status: 1
      };
      recordLog(successLog);
      res.status(200).json({
        message: '登录成功',
        user: {
          id: user.id,
          username: user.username,
          real_name: user.real_name,
          role_id: user.role_id,
          status: user.status
        }
      });
  });
};

/**
 * 添加员工
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.addEmployee = (req, res) => {
  const { create_by, create_name, username, password, real_name, role_id, status = 1 } = req.body;
  // 记录添加员工请求日志
  const addLog = {
    user_id: create_by || req.user?.id || null,
    username: create_name || req.user?.username || '匿名',
    operation: '添加',
    resource_type: '员工',
    resource_name: username,
    ip_address: req.ip,
    operation_detail: { action: '添加员工请求', username, role_id, status },
    status: 1
  };
  recordLog(addLog);

  // 验证参数
  if (!username || !password || !real_name || !role_id) {
    // 记录参数不完整日志
    const paramLog = {
      user_id: create_by || req.user?.id || null,
      username: create_name || req.user?.username || '匿名',
      operation: '添加',
      resource_type: '员工',
      resource_name: username || '未提供',
      ip_address: req.ip,
      operation_detail: { action: '添加员工参数验证', username, role_id },
      status: 0,
      error_message: '参数不完整'
    };
    recordLog(paramLog);
    return res.status(400).json({
      message: '请填写完整的员工信息'
    });
  }

  // 检查用户名是否已存在
  const checkSql = 'SELECT * FROM sys_user WHERE username = ?';
  pool.query(checkSql, [username], (checkErr, checkResult) => {
    if (checkErr) {
      // 记录检查用户名失败日志
      const checkLog = {
        user_id: create_by || req.user?.id || null,
        username: create_name || req.user?.username || '匿名',
        operation: '添加',
        resource_type: '员工',
        resource_name: username,
        ip_address: req.ip,
        operation_detail: { action: '添加员工用户名检查', username, sql: checkSql },
        status: 0,
        error_message: checkErr.message
      };
      recordLog(checkLog);
      return res.status(500).json({
        message: '添加员工失败',
        error: checkErr.message
      });
    }

    if (checkResult.length > 0) {
      // 记录用户名已存在日志
      const existsLog = {
        user_id: create_by || req.user?.id || null,
        username: create_name || req.user?.username || '匿名',
        operation: '添加',
        resource_type: '员工',
        resource_name: username,
        ip_address: req.ip,
        operation_detail: { action: '添加员工用户名检查', username },
        status: 0,
        error_message: '用户名已存在'
      };
      recordLog(existsLog);
      return res.status(400).json({
        message: '用户名已存在'
      });
    }

    // 插入数据库
      const sql = 'INSERT INTO sys_user (username, password, real_name, role_id, status) VALUES (?, ?, ?, ?, ?)';
      pool.query(sql, [username, password, real_name, role_id, status], (err, result) => {
      if (err) {
        // 记录插入失败日志
        const insertLog = {
          user_id: create_by || req.user?.id || null,
          username: create_name || req.user?.username || '匿名',
          operation: '添加',
          resource_type: '员工',
          resource_name: username,
          ip_address: req.ip,
          operation_detail: { action: '添加员工数据库插入', username, role_id, status },
          status: 0,
          error_message: err.message
        };
        recordLog(insertLog);
        return res.status(500).json({
          message: '添加员工失败',
          error: err.message
        });
      }

      // 记录添加成功日志
      const successLog = {
        user_id: create_by || req.user?.id || null,
        username: create_name || req.user?.username || '匿名',
        operation: '添加',
        resource_type: '员工',
        resource_id: result.insertId,
        resource_name: username,
        ip_address: req.ip,
        operation_detail: { action: '添加员工成功', username, role_id, status, userId: result.insertId },
        status: 1
      };
      recordLog(successLog);
      res.status(201).json({
        message: '添加员工成功',
        id: result.insertId
      });
    });
  });
};

/**
 * 获取员工列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getEmployeeList = (req, res) => {
  const { page = 1, limit = 10, username, role_id, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;
  // 记录获取员工列表请求日志
  const listLog = {
    user_id: req.user?.id || null,
    username: req.user?.username || '匿名',
    operation: '查询',
    resource_type: '员工列表',
    ip_address: req.ip,
    operation_detail: { action: '获取员工列表请求', page: pageNum, limit: limitNum, username, role_id, status },
    status: 1
  };
  recordLog(listLog);

  // 构建查询条件
  let where = '';
  const params = [];

  if (username || role_id !== undefined || status !== undefined) {
    where = 'WHERE';
    let hasCondition = false;

    if (username) {
      where += ' username LIKE ?';
      params.push(`%${username}%`);
      hasCondition = true;
    }

    if (role_id !== undefined) {
      where += hasCondition ? ' AND role_id = ?' : ' role_id = ?';
      params.push(role_id);
      hasCondition = true;
    }

    if (status !== undefined) {
      where += hasCondition ? ' AND status = ?' : ' status = ?';
      params.push(status);
    }
  }

  // 查询总数
  const countSql = `SELECT COUNT(*) as total FROM sys_user ${where}`;
  pool.query(countSql, params, (countErr, countResult) => {
    if (countErr) {
      // 记录查询总数失败日志
      const countLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '查询',
        resource_type: '员工列表',
        ip_address: req.ip,
        operation_detail: { action: '获取员工列表总数', sql: countSql, params },
        status: 0,
        error_message: countErr.message
      };
      recordLog(countLog);
      return res.status(500).json({
        message: '获取员工列表失败',
        error: countErr.message
      });
    }

    const total = countResult[0].total;

    // 查询列表
    const listSql = `SELECT u.*, r.role_name FROM sys_user u LEFT JOIN sys_role r ON u.role_id = r.id ${where} ORDER BY u.create_time DESC LIMIT ? OFFSET ?`;
    pool.query(listSql, [...params, limitNum, offset], (listErr, listResult) => {
    if (listErr) {
      // 记录查询列表数据失败日志
      const dataLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '查询',
        resource_type: '员工列表',
        ip_address: req.ip,
        operation_detail: { action: '获取员工列表数据', sql: listSql, params: [...params, limitNum, offset] },
        status: 0,
        error_message: listErr.message
      };
      recordLog(dataLog);
      return res.status(500).json({
        message: '获取员工列表失败',
        error: listErr.message
      });
    }

    // 记录获取列表成功日志
    const successLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '查询',
      resource_type: '员工列表',
      ip_address: req.ip,
      operation_detail: { action: '获取员工列表成功', total, page: pageNum, limit: limitNum, count: listResult.length },
      status: 1
    };
    recordLog(successLog);

      res.status(200).json({
        total,
        list: listResult,
        page: pageNum,
        limit: limitNum
      });
    });
  });
};

/**
 * 获取员工详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getEmployeeDetail = (req, res) => {
  const { id } = req.params;
  // 记录获取员工详情请求日志
  const detailLog = {
    user_id: req.user?.id || null,
    username: req.user?.username || '匿名',
    operation: '查询',
    resource_type: '员工详情',
    ip_address: req.ip,
    operation_detail: { action: '获取员工详情请求', id },
    status: 1
  };
  recordLog(detailLog);

  const sql = 'SELECT u.*, r.role_name FROM sys_user u LEFT JOIN sys_role r ON u.role_id = r.id WHERE u.id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) {
      // 记录获取详情失败日志
      const errorLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '查询',
        resource_type: '员工详情',
        ip_address: req.ip,
        operation_detail: { action: '获取员工详情', sql, params: [id] },
        status: 0,
        error_message: err.message
      };
      recordLog(errorLog);
      return res.status(500).json({
        message: '获取员工详情失败',
        error: err.message
      });
    }

    if (result.length === 0) {
      // 记录员工不存在日志
      const notFoundLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '查询',
        resource_type: '员工详情',
        ip_address: req.ip,
        operation_detail: { action: '获取员工详情', id },
        status: 0,
        error_message: '未找到该员工'
      };
      recordLog(notFoundLog);
      return res.status(404).json({
        message: '未找到该员工'
      });
    }

    // 记录获取详情成功日志
    const successLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '查询',
      resource_type: '员工详情',
      ip_address: req.ip,
      operation_detail: { action: '获取员工详情成功', id, username: result[0].username },
      status: 1
    };
    recordLog(successLog);
    res.status(200).json({
      message: '获取员工详情成功',
      employee: result[0]
    });
  });
};

/**
 * 更新员工信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateEmployee = (req, res) => {
  const { id } = req.params;
  const { username, password, real_name, role_id, status } = req.body;
  // 记录更新员工信息请求日志
  const updateLog = {
    user_id: req.user?.id || null,
    username: req.user?.username || '匿名',
    operation: '更新',
    resource_type: '员工信息',
    ip_address: req.ip,
    operation_detail: { action: '更新员工信息请求', id, username, real_name, role_id, status },
    status: 1
  };
  recordLog(updateLog);

  // 验证参数
  if (!username || !real_name || !role_id) {
    // 记录参数验证失败日志
    const validateLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '更新',
      resource_type: '员工信息',
      ip_address: req.ip,
      operation_detail: { action: '参数验证', id, username: req.body.username, real_name: req.body.real_name, role_id: req.body.role_id },
      status: 0,
      error_message: '参数不完整'
    };
    recordLog(validateLog);
    return res.status(400).json({
      message: '请填写完整的员工信息'
    });
  }

  // 构建更新字段
  let fields = [];
  const params = [];

  fields.push('username = ?');
  params.push(username);

  if (password) {
    fields.push('password = ?');
    params.push(password);
  }

  fields.push('real_name = ?');
  params.push(real_name);

  fields.push('role_id = ?');
  params.push(role_id);

  fields.push('status = ?');
  params.push(status);

  // 添加更新时间
  fields.push('update_time = CURRENT_TIMESTAMP');
  fields.push('update_by = ?');
  params.push(req.user?.username || 'system');

  params.push(id);

  const sql = `UPDATE sys_user SET ${fields.join(', ')} WHERE id = ?`;
  pool.query(sql, params, (err, result) => {
    if (err) {
      // 记录更新失败日志
      const errorLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '更新',
        resource_type: '员工信息',
        ip_address: req.ip,
        operation_detail: { action: '更新员工信息', sql, params },
        status: 0,
        error_message: err.message
      };
      recordLog(errorLog);
      return res.status(500).json({
        message: '更新员工信息失败',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      // 记录未找到员工日志
      const notFoundLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '更新',
        resource_type: '员工信息',
        ip_address: req.ip,
        operation_detail: { action: '更新员工信息', id },
        status: 0,
        error_message: '未找到该员工'
      };
      recordLog(notFoundLog);
      return res.status(404).json({
        message: '未找到该员工'
      });
    }

    // 记录更新成功日志
    const successLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '更新',
      resource_type: '员工信息',
      ip_address: req.ip,
      operation_detail: { action: '更新员工成功', id, username },
      status: 1
    };
    recordLog(successLog);
    res.status(200).json({
      message: '更新员工信息成功'
    });
  });
};

/**
 * 删除员工
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteEmployee = (req, res) => {
  const { id } = req.params;
  // 记录删除员工请求日志
  const deleteLog = {
    user_id: req.user?.id || null,
    username: req.user?.username || '匿名',
    operation: '删除',
    resource_type: '员工信息',
    ip_address: req.ip,
    operation_detail: { action: '删除员工请求', id },
    status: 1
  };
  recordLog(deleteLog);

  const sql = 'DELETE FROM sys_user WHERE id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) {
      // 记录删除失败日志
      const errorLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '删除',
        resource_type: '员工信息',
        ip_address: req.ip,
        operation_detail: { action: '删除员工', sql, params: [id] },
        status: 0,
        error_message: err.message
      };
      recordLog(errorLog);
      return res.status(500).json({
        message: '删除员工失败',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      // 记录未找到员工日志
      const notFoundLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '删除',
        resource_type: '员工信息',
        ip_address: req.ip,
        operation_detail: { action: '删除员工', id },
        status: 0,
        error_message: '未找到该员工'
      };
      recordLog(notFoundLog);
      return res.status(404).json({
        message: '未找到该员工'
      });
    }

    // 记录删除成功日志
    const successLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '删除',
      resource_type: '员工信息',
      ip_address: req.ip,
      operation_detail: { action: '删除员工成功', id },
      status: 1
    };
    recordLog(successLog);
    res.status(200).json({
      message: '删除员工成功'
    });
  });
};

/**
 * 更新员工状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateEmployeeStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  // 记录更新员工状态请求日志
  const statusLog = {
    user_id: req.user?.id || null,
    username: req.user?.username || '匿名',
    operation: '更新',
    resource_type: '员工状态',
    ip_address: req.ip,
    operation_detail: { action: '更新员工状态请求', id, status },
    status: 1
  };
  recordLog(statusLog);

  // 验证参数
  if (status === undefined) {
    // 记录参数验证失败日志
    const validateLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '更新',
      resource_type: '员工状态',
      ip_address: req.ip,
      operation_detail: { action: '参数验证', id },
      status: 0,
      error_message: '未提供状态'
    };
    recordLog(validateLog);
    return res.status(400).json({
      message: '请提供员工状态'
    });
  }

  const sql = `UPDATE sys_user SET status = ?, update_time = CURRENT_TIMESTAMP, update_by = ? WHERE id = ?`;
  const params = [status, req.user?.username || 'system', id];
  pool.query(sql, params, (err, result) => {
    if (err) {
      // 记录更新状态失败日志
      const errorLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '更新',
        resource_type: '员工状态',
        ip_address: req.ip,
        operation_detail: { action: '更新员工状态', sql, params },
        status: 0,
        error_message: err.message
      };
      recordLog(errorLog);
      return res.status(500).json({
        message: '更新员工状态失败',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      // 记录未找到员工日志
      const notFoundLog = {
        user_id: req.user?.id || null,
        username: req.user?.username || '匿名',
        operation: '更新',
        resource_type: '员工状态',
        ip_address: req.ip,
        operation_detail: { action: '更新员工状态', id, status },
        status: 0,
        error_message: '未找到该员工'
      };
      recordLog(notFoundLog);
      return res.status(404).json({
        message: '未找到该员工'
      });
    }

    // 记录更新状态成功日志
    const successLog = {
      user_id: req.user?.id || null,
      username: req.user?.username || '匿名',
      operation: '更新',
      resource_type: '员工状态',
      ip_address: req.ip,
      operation_detail: { action: '更新员工状态成功', id, status },
      status: 1
    };
    recordLog(successLog);
    res.status(200).json({
      message: '更新员工状态成功'
    });
  });
};