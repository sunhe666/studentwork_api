const db = require('../db');


// 获取所有轮播图
exports.getList = (req, res) => {
  const sql = 'SELECT * FROM banner ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: '数据库查询失败', error: err.message });
    res.json(results);
  });
};

// 新增轮播图
exports.add = (req, res) => {
  const { image_url, link, title } = req.body;
  if (!image_url) return res.status(400).json({ message: '图片地址不能为空' });
  const sql = 'INSERT INTO banner (image_url, link, title) VALUES (?, ?, ?)';
  db.query(sql, [image_url, link || '', title || ''], (err, result) => {
    if (err) {
    return res.status(500).json({ message: '数据库插入失败', error: err.message });
  }
  res.json({ message: '添加成功', id: result.insertId });
  });
};

// 删除轮播图
exports.remove = (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM banner WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
    return res.status(500).json({ message: '数据库删除失败', error: err.message });
  }
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: '未找到该轮播图' });
  }
  res.json({ message: '删除成功' });
  });
};

// 编辑轮播图
exports.edit = (req, res) => {
  const id = req.params.id;
  const { image_url, link, title } = req.body;
  if (!image_url) return res.status(400).json({ message: '图片地址不能为空' });
  const sql = 'UPDATE banner SET image_url=?, link=?, title=? WHERE id=?';
  db.query(sql, [image_url, link || '', title || '', id], (err, result) => {
    if (err) {
    return res.status(500).json({ message: '数据库更新失败', error: err.message });
  }
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: '未找到该轮播图' });
  }
  res.json({ message: '编辑成功' });
  });
};

// 更新轮播图排序
exports.updateSort = (req, res) => {
  const { sortList } = req.body; // [{id:1, sort:1}, ...]
  if (!Array.isArray(sortList)) return res.status(400).json({ message: '参数格式错误' });
  const tasks = sortList.map(item => new Promise((resolve, reject) => {
    db.query('UPDATE banner SET sort=? WHERE id=?', [item.sort, item.id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  }));
  Promise.all(tasks)
    .then(() => {
      res.json({ message: '排序更新成功' });
    })
    .catch(err => {
      res.status(500).json({ message: '数据库更新失败', error: err.message });
    });
};

// 更新轮播图状态
exports.updateStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body; // 0/1
  if (typeof status !== 'number') return res.status(400).json({ message: '状态参数错误' });
  const sql = 'UPDATE banner SET status=? WHERE id=?';
  db.query(sql, [status, id], (err, result) => {
    if (err) {
    return res.status(500).json({ message: '数据库更新失败', error: err.message });
  }
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: '未找到该轮播图' });
  }
  res.json({ message: '状态更新成功' });
  });
};