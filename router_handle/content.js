const db = require('../db');
const { recordLog } = require('../utils/log');

// 获取内容列表
exports.getList = (req, res) => {
  const { keyword, category, publisher } = req.query;
  let sql = 'SELECT id, title, time, category, cover, features, views, amount,publisher FROM content';
  const params = [];
  const conditions = [];

  if (keyword) {
    conditions.push('title LIKE ?');
    params.push(`%${keyword}%`);
  }

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  
  if (publisher) {
    conditions.push('publisher = ?');
    params.push(publisher);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }


  sql += ' ORDER BY time DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: '数据库查询失败', error: err.message });
    res.json(results);
  });
};

// 获取单条内容详情
exports.getDetail = (req, res) => {
  const id = req.params.id;
  
  // 更新浏览量
  const updateSql = 'UPDATE content SET views = views + 1 WHERE id = ?';
  db.query(updateSql, [id], (updateErr) => {
    if (updateErr) return res.status(500).json({ message: '更新浏览量失败', error: updateErr.message });
    
    // 查询内容详情
  const selectSql = 'SELECT *, publisher FROM content WHERE id = ?';
    db.query(selectSql, [id], (selectErr, results) => {
      if (selectErr) return res.status(500).json({ message: '数据库查询失败', error: selectErr.message });
      if (results.length === 0) return res.status(404).json({ message: '未找到内容' });
      
      // screenshots字段转为数组
      const data = results[0];
      if (data.screenshots) {
        try { data.screenshots = JSON.parse(data.screenshots); } catch { data.screenshots = []; }
      } else {
        data.screenshots = [];
      }
      
      res.json(data);
    });
  });
};

// 新增内容
exports.add = (req, res) => {
  const { create_by,create_name,title, time, category, content, features, thesis_file, project_file, technologies, screenshots, cover, views, amount, publisher } = req.body;
  if (!title || !time || !category || !content) return res.status(400).json({ message: '必填项缺失' });
  const sql = 'INSERT INTO content (title, time, category, content, features, thesis_file, project_file, technologies, screenshots, cover, views, amount, publisher) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [title, time, category, content, features || '', thesis_file || '', project_file || '', technologies || '', JSON.stringify(screenshots || []), cover || '', views || 0, amount || 0, publisher || ''], (err, result) => {
    if (err) {
      // 记录添加内容失败日志
      const addLog = {
        user_id: create_by || req.user?.id,
        username: create_name || req.user?.username,
        operation: '添加',
        resource_type: '内容',
        resource_name: title,
        ip_address: req.ip,
        operation_detail: { action: '添加内容', title, category, time, publisher },
        status: 0,
        error_message: err.message
      };
      recordLog(addLog);
      return res.status(500).json({ message: '数据库插入失败', error: err.message });
    }
    // 记录添加内容成功日志
    const addLog = {
      user_id: create_by || req.user?.id,
      username: create_name || req.user?.username,
      operation: '添加',
      resource_type: '内容',
      resource_id: result.insertId,
      resource_name: title,
      ip_address: req.ip,
      operation_detail: { action: '添加内容', title, category, time, publisher },
      status: 1
    };
    recordLog(addLog);
    res.json({ message: '添加成功', id: result.insertId });
  });
};

// 编辑内容
exports.edit = (req, res) => {
  const id = req.params.id;
  const { update_by,update_name,title, time, category, content, features, thesis_file, project_file, technologies, screenshots, cover, views, amount, publisher } = req.body;
  if (!title || !time || !category || !content) return res.status(400).json({ message: '必填项缺失' });
  const sql = 'UPDATE content SET title=?, time=?, category=?, content=?, features=?, thesis_file=?, project_file=?, technologies=?, screenshots=?, cover=?, views=?, amount=?, publisher=? WHERE id=?';
  db.query(sql, [title, time, category, content, features || '', thesis_file || '', project_file || '', technologies || '', JSON.stringify(screenshots || []), cover || '', views || 0, amount || 0, publisher || '', id], (err, result) => {
    if (err) {
      // 记录编辑内容失败日志
      const editLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '内容',
        resource_id: id,
        resource_name: title,
        ip_address: req.ip,
        operation_detail: { action: '编辑内容', id, title, category, time, publisher },
        status: 0,
        error_message: err.message
      };
      recordLog(editLog);
      return res.status(500).json({ message: '数据库更新失败', error: err.message });
    }
    if (result.affectedRows === 0) {
      // 记录编辑内容失败日志 - 未找到内容
      const editLog = {
        user_id: update_by || req.user?.id,
        username: update_name || req.user?.username,
        operation: '修改',
        resource_type: '内容',
        resource_id: id,
        resource_name: title,
        ip_address: req.ip,
        operation_detail: { action: '编辑内容', id, title, category, time, publisher },
        status: 0,
        error_message: '未找到内容'
      };
      recordLog(editLog);
      return res.status(404).json({ message: '未找到内容' });
    }
    // 记录编辑内容成功日志
    const editLog = {
      user_id: update_by || req.user?.id,
      username: update_name || req.user?.username,
      operation: '修改',
      resource_type: '内容',
      resource_id: id,
      resource_name: title,
      ip_address: req.ip,
      operation_detail: { action: '编辑内容', id, title, category, time, publisher },
      status: 1
    };
    recordLog(editLog);
    res.json({ message: '编辑成功' });
  });
};

// 删除内容
exports.remove = (req, res) => {
  const id = req.params.id;
  const { delete_by,delete_name } = req.body;
  const sql = 'DELETE FROM content WHERE id = ?';
  // 先查询内容标题，用于日志记录
  const selectSql = 'SELECT title, publisher FROM content WHERE id = ?';
  db.query(selectSql, [id], (selectErr, selectResults) => {
    if (selectErr) {
      // 记录查询内容失败日志
      const selectLog = {
        user_id: delete_by || req.user?.id,
        username: delete_name || req.user?.username,
        operation: '删除',
        resource_type: '内容',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { action: '删除内容', id },
        status: 0,
        error_message: selectErr.message
      };
      recordLog(selectLog);
      return res.status(500).json({ message: '查询内容失败', error: selectErr.message });
    }
    if (selectResults.length === 0) {
      // 记录删除内容失败日志 - 未找到内容
      const deleteLog = {
        user_id: delete_by || req.user?.id,
        username: delete_name || req.user?.username,
        operation: '删除',
        resource_type: '内容',
        resource_id: id,
        ip_address: req.ip,
        operation_detail: { action: '删除内容', id },
        status: 0,
        error_message: '未找到内容'
      };
      recordLog(deleteLog);
      return res.status(404).json({ message: '未找到内容' });
    }
    const { title, publisher } = selectResults[0];
    // 执行删除操作
    const deleteSql = 'DELETE FROM content WHERE id = ?';
    db.query(deleteSql, [id], (deleteErr, deleteResult) => {
      if (deleteErr) {
        // 记录删除内容失败日志
        const deleteLog = {
          user_id: delete_by || req.user?.id,
          username: delete_name || req.user?.username,
          operation: '删除',
          resource_type: '内容',
          resource_id: id,
          resource_name: title,
          ip_address: req.ip,
          operation_detail: { action: '删除内容', id, title, publisher },
          status: 0,
          error_message: deleteErr.message
        };
        recordLog(deleteLog);
        return res.status(500).json({ message: '数据库删除失败', error: deleteErr.message });
      }
      // 记录删除内容成功日志
      const deleteLog = {
        user_id: delete_by || req.user?.id,
        username: delete_name || req.user?.username,
        operation: '删除',
        resource_type: '内容',
        resource_id: id,
        resource_name: title,
        ip_address: req.ip,
        operation_detail: { action: '删除内容', id, title, publisher },
        status: 1
      };
      recordLog(deleteLog);
      res.json({ message: '删除成功' });
    });
  });
};