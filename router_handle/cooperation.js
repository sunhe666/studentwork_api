const pool = require('../db');


/**
 * 提交合作申请
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.apply = (req, res) => {
  const { name, phone, position } = req.body;

  // 验证参数
  if (!name || !phone || !position) {
    return res.status(400).json({
      message: '请填写完整的申请信息'
    });
  }

  // 插入数据库
  const sql = 'INSERT INTO cooperation (name, phone, position) VALUES (?, ?, ?)';
  pool.query(sql, [name, phone, position], (err, result) => {
    if (err) {
      console.error('提交合作申请失败:', err);
      return res.status(500).json({
        message: '提交合作申请失败',
        error: err.message
      });
    }
    res.status(201).json({
      message: '提交合作申请成功',
      id: result.insertId
    });
  });
};

/**
 * 获取合作申请列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getList = (req, res) => {
  const { page = 1, limit = 10, is_contacted, name } = req.query;
  // 将参数转换为数字类型
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  // 构建查询条件
  let where = '';
  const params = [];

  if (is_contacted !== undefined || name) {
    where = 'WHERE';
    
    if (is_contacted !== undefined) {
      where += ' is_contacted = ?';
      params.push(is_contacted);
      
      if (name) {
        where += ' AND name LIKE ?';
        params.push(`%${name}%`);
      }
    } else if (name) {
      where += ' name LIKE ?';
      params.push(`%${name}%`);
    }
  }

  // 查询总数
  const countSql = `SELECT COUNT(*) as total FROM cooperation ${where}`;
  pool.query(countSql, params, (countErr, countResult) => {
    if (countErr) {
      console.error('获取合作申请总数失败:', countErr);
      return res.status(500).json({
        message: '获取合作申请列表失败',
        error: countErr.message
      });
    }

    const total = countResult[0].total;

    // 查询列表
    const listSql = `SELECT * FROM cooperation ${where} ORDER BY application_time DESC LIMIT ? OFFSET ?`;
    pool.query(listSql, [...params, limitNum, offset], (listErr, listResult) => {
      if (listErr) {
        console.error('获取合作申请列表失败:', listErr);
        return res.status(500).json({
          message: '获取合作申请列表失败',
          error: listErr.message
        });
      }

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
 * 更新合作申请状态(是否联系)
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { is_contacted } = req.body;

  // 验证参数
  if (is_contacted === undefined) {
    return res.status(400).json({
      message: '请提供联系状态'
    });
  }

  // 更新数据库
  const sql = 'UPDATE cooperation SET is_contacted = ? WHERE id = ?';
  // 先查询合作申请名称，用于日志记录
  const selectSql = 'SELECT name FROM cooperation WHERE id = ?';
  pool.query(selectSql, [id], (selectErr, selectResults) => {
    if (selectErr) {
      console.error('查询合作申请失败:', selectErr);
      return res.status(500).json({
        message: '更新合作申请状态失败',
        error: selectErr.message
      });
    }
    if (selectResults.length === 0) {
      return res.status(404).json({
        message: '未找到该合作申请'
      });
    }
    const name = selectResults[0].name;
    // 执行更新操作
    const updateSql = 'UPDATE cooperation SET is_contacted = ? WHERE id = ?';
    pool.query(updateSql, [is_contacted, id], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('更新合作申请状态失败:', updateErr);
        return res.status(500).json({
          message: '更新合作申请状态失败',
          error: updateErr.message
        });
      }
      res.status(200).json({
        message: '更新合作申请状态成功'
      });
    });
  });
};