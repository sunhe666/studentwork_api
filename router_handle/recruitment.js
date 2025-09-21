const db = require('../db');
const { logger } = require('../utils/log');

// 获取招聘职位列表
exports.getList = (req, res) => {
  const { page = 1, limit = 10, position_name = '', is_full_time, is_closed } = req.query;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let query = 'SELECT * FROM recruitment_position WHERE 1=1';
  const params = [];

  if (position_name) {
    query += ' AND position_name LIKE ?';
    params.push(`%${position_name}%`);
  }

  if (is_full_time !== undefined) {
    query += ' AND is_full_time = ?';
    params.push(is_full_time);
  }

  if (is_closed !== undefined) {
    query += ' AND is_closed = ?';
    params.push(is_closed);
  }

  // 添加分页
  query += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  // 获取总数
  let countQuery = 'SELECT COUNT(*) as total FROM recruitment_position WHERE 1=1';
  // 提取查询条件（如果有）
  const andIndex = query.indexOf('AND');
  const orderIndex = query.indexOf('ORDER');
  if (andIndex !== -1 && orderIndex !== -1) {
    countQuery += query.substring(andIndex, orderIndex);
  }
  const countParams = params.slice(0, params.length - 2);

  db.getConnection((err, connection) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      return res.json({ message: '服务器错误', error: err.message });
    }

    connection.query(countQuery, countParams, (countErr, countResult) => {
      if (countErr) {
        connection.release();
        logger.error('查询总数失败:', countErr);
        return res.json({ message: '获取职位列表失败', error: countErr.message });
      }

      const total = countResult[0].total;

      connection.query(query, params, (listErr, listResult) => {
        connection.release();

        if (listErr) {
          logger.error('查询列表失败:', listErr);
          return res.json({ message: '获取职位列表失败', error: listErr.message });
        }

        res.json({
          message: '获取职位列表成功',
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          list: listResult
        });
      });
    });
  });
};

// 获取招聘职位详情
exports.getDetail = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json({ message: '请提供职位ID' });
  }

  const query = 'SELECT * FROM recruitment_position WHERE id = ?';

  db.getConnection((err, connection) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      return res.json({ message: '服务器错误', error: err.message });
    }

    connection.query(query, [id], (err, result) => {
      connection.release();

      if (err) {
        logger.error('查询详情失败:', err);
        return res.json({ message: '获取职位详情失败', error: err.message });
      }

      if (result.length === 0) {
        return res.json({ message: '未找到该职位' });
      }

      res.json({
        message: '获取职位详情成功',
        data: result[0]
      });
    });
  });
};

// 创建招聘职位
exports.create = (req, res) => {
  const { position_name, is_full_time, content, requirements, publisher } = req.body;

  // 验证参数
  if (!position_name || is_full_time === undefined || !content || !requirements || !publisher) {
    return res.json({ message: '请填写完整的职位信息' });
  }

  // 确保requirements是数组
  if (!Array.isArray(requirements)) {
    return res.json({ message: '职位要求必须是数组格式' });
  }

  const query = 'INSERT INTO recruitment_position (position_name, is_full_time, content, requirements, publisher) VALUES (?, ?, ?, ?, ?)';
  const params = [position_name, is_full_time, content, JSON.stringify(requirements), publisher];

  db.getConnection((err, connection) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      return res.json({ message: '服务器错误', error: err.message });
    }

    connection.query(query, params, (err, result) => {
      connection.release();

      if (err) {
        logger.error('创建职位失败:', err);
        return res.json({ message: '创建职位失败', error: err.message });
      }

      res.json({
        message: '创建职位成功',
        id: result.insertId
      });
    });
  });
};

// 更新招聘职位
exports.update = (req, res) => {
  const { id } = req.params;
  const { position_name, is_full_time, content, requirements, publisher, is_closed } = req.body;

  if (!id) {
    return res.json({ message: '请提供职位ID' });
  }

  // 验证参数
  if (!position_name || is_full_time === undefined || !content || !requirements || !publisher) {
    return res.json({ message: '请填写完整的职位信息' });
  }

  // 确保requirements是数组
  if (!Array.isArray(requirements)) {
    return res.json({ message: '职位要求必须是数组格式' });
  }

  const query = 'UPDATE recruitment_position SET position_name = ?, is_full_time = ?, content = ?, requirements = ?, publisher = ?, is_closed = ? WHERE id = ?';
  const params = [position_name, is_full_time, content, JSON.stringify(requirements), publisher, is_closed || 0, id];

  db.getConnection((err, connection) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      return res.json({ message: '服务器错误', error: err.message });
    }

    connection.query(query, params, (err, result) => {
      connection.release();

      if (err) {
        logger.error('更新职位失败:', err);
        return res.json({ message: '更新职位失败', error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.json({ message: '未找到该职位' });
      }

      res.json({ message: '更新职位成功' });
    });
  });
};

// 删除招聘职位
exports.delete = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json({ message: '请提供职位ID' });
  }

  const query = 'DELETE FROM recruitment_position WHERE id = ?';

  db.getConnection((err, connection) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      return res.json({ message: '服务器错误', error: err.message });
    }

    connection.query(query, [id], (err, result) => {
      connection.release();

      if (err) {
        logger.error('删除职位失败:', err);
        return res.json({ message: '删除职位失败', error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.json({ message: '未找到该职位' });
      }

      res.json({ message: '删除职位成功' });
    });
  });
};

// 切换招聘状态
exports.toggleStatus = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json({ message: '请提供职位ID' });
  }

  // 先查询当前状态
  const getStatusQuery = 'SELECT is_closed FROM recruitment_position WHERE id = ?';

  db.getConnection((err, connection) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      return res.json({ message: '服务器错误', error: err.message });
    }

    connection.query(getStatusQuery, [id], (getStatusErr, getStatusResult) => {
      if (getStatusErr) {
        connection.release();
        logger.error('查询状态失败:', getStatusErr);
        return res.json({ message: '切换状态失败', error: getStatusErr.message });
      }

      if (getStatusResult.length === 0) {
        connection.release();
        return res.json({ message: '未找到该职位' });
      }

      const currentStatus = getStatusResult[0].is_closed;
      const newStatus = currentStatus === 1 ? 0 : 1;

      // 更新状态
      const updateQuery = 'UPDATE recruitment_position SET is_closed = ? WHERE id = ?';

      connection.query(updateQuery, [newStatus, id], (updateErr, updateResult) => {
        connection.release();

        if (updateErr) {
          logger.error('更新状态失败:', updateErr);
          return res.json({ message: '切换状态失败', error: updateErr.message });
        }

        res.json({
          message: '切换状态成功',
          is_closed: newStatus
        });
      });
    });
  });
};