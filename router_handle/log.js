const db = require('../db');
const { recordLog } = require('../utils/log');

// 获取日志列表
exports.getList = (req, res) => {
  const { page = 1, limit = 10, start_time, end_time, username, operation, resource_type } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM sys_log WHERE 1=1';
  const params = [];

  // 添加时间范围条件
  if (start_time && end_time) {
    sql += ' AND operation_time BETWEEN ? AND ?';
    params.push(start_time, end_time);
  } else if (start_time) {
    sql += ' AND operation_time >= ?';
    params.push(start_time);
  } else if (end_time) {
    sql += ' AND operation_time <= ?';
    params.push(end_time);
  }

  // 添加用户名条件
  if (username) {
    sql += ' AND username LIKE ?';
    params.push(`%${username}%`);
  }

  // 添加操作类型条件
  if (operation) {
    sql += ' AND operation = ?';
    params.push(operation);
  }

  // 添加资源类型条件
  if (resource_type) {
    sql += ' AND resource_type = ?';
    params.push(resource_type);
  }

  // 添加排序和分页
  sql += ' ORDER BY operation_time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  // 查询总记录数
  // 直接替换SELECT *为COUNT(*)
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total').split('ORDER BY')[0];
  const countParams = params.slice(0, params.length - 2);

  db.query(countSql, countParams, (countErr, countResult) => {
    if (countErr) {
      console.error('获取日志总数失败:', countErr);
      return res.status(500).json({ message: '获取日志总数失败', error: countErr.message });
    }

    const total = countResult[0].total;

    // 查询日志列表
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('获取日志列表失败:', err);
        return res.status(500).json({ message: '获取日志列表失败', error: err.message });
      }

      // 解析 operation_detail 字段
      results.forEach(item => {
        if (item.operation_detail) {
          try {
            item.operation_detail = JSON.parse(item.operation_detail);
          } catch (e) {
            console.error('解析日志详情失败:', e);
          }
        }
      });

      res.json({
        message: '获取日志列表成功',
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        list: results
      });
    });
  });
};

// 获取日志详情
exports.getDetail = (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: '无效的日志ID' });
  }

  const sql = 'SELECT * FROM sys_log WHERE id = ?';

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('获取日志详情失败:', err);
      return res.status(500).json({ message: '获取日志详情失败', error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '未找到该日志' });
    }

    const log = results[0];

    // 解析 operation_detail 字段
    if (log.operation_detail) {
      try {
        log.operation_detail = JSON.parse(log.operation_detail);
      }
      catch (e) {
        console.error('解析日志详情失败:', e);
      }
    }

    res.json({
      message: '获取日志详情成功',
      data: log
    });
  });
};

// 按条件搜索日志
exports.search = (req, res) => {
  // 搜索功能与获取列表功能类似，只是可能需要更复杂的条件
  // 这里可以复用 getList 函数的逻辑，或者根据需要进行扩展
  exports.getList(req, res);
};

// 删除日志
exports.delete = (req, res) => {


  const { id } = req.params;
  const { delete_by,delete_name } = req.query;
  console.log(delete_by,delete_name)
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: '无效的日志ID' });
  }

  const sql = 'DELETE FROM sys_log WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('删除日志失败:', err);
      // 记录删除日志失败的日志
      const deleteLog = {
        user_id: delete_by,
        username: delete_name,
        operation: '删除',
        resource_type: '日志',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { id },
        status: 0,
        error_message: err.message
      };
      recordLog(deleteLog);
      return res.status(500).json({ message: '删除日志失败', error: err.message });
    }

    if (result.affectedRows === 0) {
      // 记录删除日志失败的日志 - 日志不存在
      const deleteLog = {
        user_id: delete_by,
        username: delete_name,
        operation: '删除',
        resource_type: '日志',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { id },
        status: 0,
        error_message: '日志不存在'
      };
      recordLog(deleteLog);
      return res.status(404).json({ message: '未找到该日志' });
    }

    // 记录删除日志成功的日志
    const deleteLog = {
      user_id: delete_by,
      username: delete_name,
      operation: '删除',
      resource_type: '日志',
      resource_id: id,
      ip_address: req.ip,
      operation_detail: { id },
      status: 1
    };
    recordLog(deleteLog);

    res.json({ message: '删除日志成功' });
  });
};

// 批量删除日志
exports.batchDelete = (req, res) => {
  const { ids } = req.body;
  const { delete_by,delete_name } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '请选择要删除的日志' });
  }

  const sql = 'DELETE FROM sys_log WHERE id IN (?)';

  db.query(sql, [ids], (err, result) => {
    if (err) {
      console.error('批量删除日志失败:', err);
      // 记录批量删除日志失败的日志
      const batchDeleteLog = {
        user_id: delete_by,
        username: delete_name,
        operation: '批量删除',
        resource_type: '日志',
        ip_address: req.ip,
        operation_detail: { ids },
        status: 0,
        error_message: err.message
      };
      recordLog(batchDeleteLog);
      return res.status(500).json({ message: '批量删除日志失败', error: err.message });
    }

    if (result.affectedRows === 0) {
      // 记录批量删除日志失败的日志 - 没有日志被删除
      const batchDeleteLog = {
        user_id: delete_by,
        username: delete_name,
        operation: '批量删除',
        resource_type: '日志',
        ip_address: req.ip,
        operation_detail: { ids },
        status: 0,
        error_message: '没有日志被删除'
      };
      recordLog(batchDeleteLog);
      return res.status(404).json({ message: '没有找到要删除的日志' });
    }

    // 记录批量删除日志成功的日志
    const batchDeleteLog = {
      user_id: delete_by,
      username: delete_name,
      operation: '批量删除',
      resource_type: '日志',
      ip_address: req.ip,
      operation_detail: { ids },
      status: 1
    };
    recordLog(batchDeleteLog);

    res.json({ message: '批量删除日志成功', count: result.affectedRows });
  });
};