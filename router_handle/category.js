const db = require('../db');
const { recordLog } = require('../utils/log');

// 获取分类列表
exports.getList = (req, res) => {
  const sql = 'SELECT * FROM category ORDER BY sort ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: '数据库查询失败', error: err.message });
    res.json(results);
  });
};

// 添加分类
exports.add = (req, res) => {
  const { name, sort = 0,create_by,create_name } = req.body;
  if (!name) return res.status(400).json({ message: '分类名称不能为空' });

  // 检查分类是否已存在
  const checkSql = 'SELECT * FROM category WHERE name = ?';
  db.query(checkSql, [name], (err, results) => {
    if (err) {
      // 记录检查分类失败日志
      const checkLog = {
        user_id: create_by || req.user?.id,
        username: create_name || req.user?.username,
        operation: '添加',
        resource_type: '分类',
        resource_name: name,
        ip_address: req.ip,
        operation_detail: { action: '添加分类', category_name: name, sort_order: sort },
        status: 0,
        error_message: err.message
      };
      recordLog(checkLog);
      return res.status(500).json({ message: '数据库查询失败', error: err.message });
    }
    if (results.length > 0) {
      // 记录添加分类失败日志 - 分类已存在
      const addLog = {
        user_id: create_by || req.user?.id,
        username: create_name || req.user?.username,
        operation: '添加',
        resource_type: '分类',
        resource_name: name,
        ip_address: req.ip,
        operation_detail: { action: '添加分类', category_name: name, sort_order: sort },
        status: 0,
        error_message: '分类已存在'
      };
      recordLog(addLog);
      return res.status(400).json({ message: '分类已存在' });
    }

    // 添加新分类
    const insertSql = 'INSERT INTO category (name, sort) VALUES (?, ?)';
    db.query(insertSql, [name, sort], (err, result) => {
      if (err) {
        // 记录添加分类失败日志
        const addLog = {
          user_id: create_by || req.user?.id,
          username: create_name || req.user?.username,
          operation: '添加',
          resource_type: '分类',
          resource_name: name,
          ip_address: req.ip,
          operation_detail: { name, sort },
          status: 0,
          error_message: err.message
        };
        recordLog(addLog);
        return res.status(500).json({ message: '数据库插入失败', error: err.message });
      }
      // 记录添加分类成功日志
      const addLog = {
        user_id: create_by || req.user?.id,
        username: create_name || req.user?.username,
        operation: '添加',
        resource_type: '分类',
        resource_id: result.insertId,
        resource_name: name,
        ip_address: req.ip,
        operation_detail: { name, sort },
        status: 1
      };
      recordLog(addLog);
      res.json({ message: '添加成功', id: result.insertId });
    });
  });
};

// 编辑分类
exports.edit = (req, res) => {
  const id = req.params.id;
  const { name, sort,update_by,update_name } = req.body;
  if (!name) return res.status(400).json({ message: '分类名称不能为空' });

  // 检查分类是否已存在（排除当前分类）
  const checkSql = 'SELECT * FROM category WHERE name = ? AND id != ?';
  db.query(checkSql, [name, id], (err, results) => {
    if (err) {
      // 记录检查分类失败日志
      const checkLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类',
        resource_id: id,
        resource_name: name,
        ip_address: req.ip,
        operation_detail: { action: '编辑分类', category_id: id, category_name: name, sort_order: sort },
        status: 0,
        error_message: err.message
      };
      recordLog(checkLog);
      return res.status(500).json({ message: '数据库查询失败', error: err.message });
    }
    if (results.length > 0) {
      // 记录编辑分类失败日志 - 分类已存在
      const editLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类',
        resource_id: id,
        resource_name: name,
        ip_address: req.ip,
        operation_detail: { action: '编辑分类', category_id: id, category_name: name, sort_order: sort },
        status: 0,
        error_message: '分类已存在'
      };
      recordLog(editLog);
      return res.status(400).json({ message: '分类已存在' });
    }

    // 更新分类
    const updateSql = 'UPDATE category SET name = ?, sort = ? WHERE id = ?';
    db.query(updateSql, [name, sort || 0, id], (err, result) => {
      if (err) {
        // 记录编辑分类失败日志
        const editLog = {
          user_id: update_by || req.user?.id,
          username: update_name || req.user?.username,
          operation: '修改',
          resource_type: '分类',
          resource_id: id,
          resource_name: name,
          ip_address: req.ip,
          operation_detail: { id, name, sort },
          status: 0,
          error_message: err.message
        };
        recordLog(editLog);
        return res.status(500).json({ message: '数据库更新失败', error: err.message });
      }
      if (result.affectedRows === 0) {
        // 记录编辑分类失败日志 - 分类不存在
        const editLog = {
          user_id: update_by || req.user?.id,
          username: update_name || req.user?.username,
          operation: '修改',
          resource_type: '分类',
          resource_id: id,
          resource_name: name,
          ip_address: req.ip,
          operation_detail: { id, name, sort },
          status: 0,
          error_message: '分类不存在'
        };
        recordLog(editLog);
        return res.status(404).json({ message: '分类不存在' });
      }
      // 记录编辑分类成功日志
      const editLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类',
        resource_id: id,
        resource_name: name,
        ip_address: req.ip,
        operation_detail: { id, name, sort },
        status: 1
      };
      recordLog(editLog);
      res.json({ message: '编辑成功' });
    });
  });
};

// 删除分类
exports.delete = (req, res) => {
  const id = req.params.id;

  // 检查分类下是否有内容
  const checkSql = 'SELECT * FROM content WHERE category = (SELECT name FROM category WHERE id = ?)';
  db.query(checkSql, [id], (err, results) => {
    if (err) {
      // 记录检查分类内容失败日志
      const checkLog = {
        user_id: req.user?.id,
        username: req.user?.username,
        operation: '删除',
        resource_type: '分类',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { action: '删除分类', category_id: id },
        status: 0,
        error_message: err.message
      };
      recordLog(checkLog);
      return res.status(500).json({ message: '数据库查询失败', error: err.message });
    }
    if (results.length > 0) {
      // 记录删除分类失败日志 - 分类下存在内容
      const deleteLog = {
        user_id: req.user?.id,
        username: req.user?.username,
        operation: '删除',
        resource_type: '分类',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { action: '删除分类', category_id: id },
        status: 0,
        error_message: '该分类下存在内容，无法删除'
      };
      recordLog(deleteLog);
      return res.status(400).json({ message: '该分类下存在内容，无法删除' });
    }

    // 删除分类
    const deleteSql = 'DELETE FROM category WHERE id = ?';
    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        // 记录删除分类失败日志
        const deleteLog = {
          user_id: req.user?.id,
          username: req.user?.username,
          operation: '删除',
          resource_type: '分类',
          resource_id: id,
          ip_address: req.ip,
          operation_detail: { id },
          status: 0,
          error_message: err.message
        };
        recordLog(deleteLog);
        return res.status(500).json({ message: '数据库删除失败', error: err.message });
      }
      if (result.affectedRows === 0) {
        // 记录删除分类失败日志 - 分类不存在
        const deleteLog = {
          user_id: req.user?.id,
          username: req.user?.username,
          operation: '删除',
          resource_type: '分类',
          resource_id: id,
          ip_address: req.ip,
          operation_detail: { id },
          status: 0,
          error_message: '分类不存在'
        };
        recordLog(deleteLog);
        return res.status(404).json({ message: '分类不存在' });
      }
      // 记录删除分类成功日志
      const deleteLog = {
        user_id: req.user?.id,
        username: req.user?.username,
        operation: '删除',
        resource_type: '分类',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { id },
        status: 1
      };
      recordLog(deleteLog);
      res.json({ message: '删除成功' });
    });
  });
};

// 更新分类状态
exports.updateStatus = (req, res) => {
  const id = req.params.id;
  const { status,update_by,update_name } = req.body;

  const sql = 'UPDATE category SET status = ? WHERE id = ?';
  db.query(sql, [status, id], (err, result) => {
    if (err) {
      // 记录更新分类状态失败日志
      const statusLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类状态',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { action: '更新分类状态', category_id: id, new_status: status },
        status: 0,
        error_message: err.message
      };
      recordLog(statusLog);
      return res.status(500).json({ message: '数据库更新失败', error: err.message });
    }
    if (result.affectedRows === 0) {
      // 记录更新分类状态失败日志 - 分类不存在
      const statusLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类状态',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { action: '更新分类状态', category_id: id, new_status: status },
        status: 0,
        error_message: '分类不存在'
      };
      recordLog(statusLog);
      return res.status(404).json({ message: '分类不存在' });
    }
    // 记录更新分类状态成功日志
    const statusLog = {
      user_id: update_by || req.user?.id,
      username: update_name || req.user?.username,
      operation: '修改',
      resource_type: '分类状态',
      resource_id: id,
      ip_address: req.ip,
      operation_detail: { id, status },
      status: 1
    };
    recordLog(statusLog);
    res.json({ message: '状态更新成功' });
  });
};

// 更新分类排序
exports.updateSort = (req, res) => {
  const { sortList,update_by,update_name } = req.body;
  if (!Array.isArray(sortList)) return res.status(400).json({ message: '参数格式错误' });

  // 批量更新排序
  const sql = 'UPDATE category SET sort = ? WHERE id = ?';
  const promises = sortList.map(item => {
    return new Promise((resolve, reject) => {
      db.query(sql, [item.sort, item.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  Promise.all(promises)
    .then(() => {
      // 记录更新分类排序成功日志
      const sortLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类排序',
        ip_address: req.ip,
        operation_detail: { action: '更新分类排序', sort_list: sortList },
        status: 1
      };
      recordLog(sortLog);
      res.json({ message: '排序更新成功' });
    })
    .catch(err => {
      // 记录更新分类排序失败日志
      const sortLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '分类排序',
        ip_address: req.ip,
        operation_detail: { action: '更新分类排序', sort_list: sortList },
        status: 0,
        error_message: err.message
      };
      recordLog(sortLog);
      res.status(500).json({ message: '数据库更新失败', error: err.message });
    });
};