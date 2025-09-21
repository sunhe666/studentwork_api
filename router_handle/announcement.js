const db = require('../db');


// 获取公告列表
exports.getList = (req, res) => {
  const sql = 'SELECT * FROM announcements ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: '查询失败', error: err.message });
    res.json({
      status: 0,
      message: '获取成功',
      data: results
    });
  });
};

// 获取公告详情
exports.getDetail = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM announcements WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ message: '查询失败', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: '公告不存在' });
    res.json({
      status: 0,
      message: '获取成功',
      data: results[0]
    });
  });
};

// 创建公告
exports.create = (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: '标题和内容不能为空' });
  }
  const sql = 'INSERT INTO announcements (title, content, created_at) VALUES (?, ?, NOW())';
  db.query(sql, [title, content], (err, results) => {
    if (err) {
        return res.status(500).json({ message: '创建失败', error: err.message });
      }
      res.json({
      status: 0,
      message: '创建成功',
      data: {
        id: results.insertId,
        title,
        content
      }
    });
  });
};

// 更新公告
exports.update = (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: '标题和内容不能为空' });
  }
  const sql = 'UPDATE announcements SET title = ?, content = ?, updated_at = NOW() WHERE id = ?';
  db.query(sql, [title, content, id], (err, results) => {
    if (err) {
        return res.status(500).json({ message: '更新失败', error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: '公告不存在' });
      }
      res.json({
      status: 0,
      message: '更新成功',
      data: {
        id,
        title,
        content
      }
    });
  });
};

// 删除公告
exports.delete = (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM announcements WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
        return res.status(500).json({ message: '删除失败', error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: '公告不存在' });
      }
      res.json({
      status: 0,
      message: '删除成功'
    });
  });
};