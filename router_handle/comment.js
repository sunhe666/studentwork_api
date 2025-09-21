const db = require('../db');


// 获取内容的评论列表
exports.getComments = (req, res) => {
  const { contentId } = req.params;
  const sql = `
    SELECT c.*, 
           (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
    FROM comments c
    WHERE c.content_id = ? AND c.status = 1
    ORDER BY c.time DESC
  `;
  
  db.query(sql, [contentId], (err, results) => {
    if (err) return res.status(500).json({ message: '获取评论列表失败', error: err.message });
    
    // 获取每条评论的回复
    const getReplies = (commentId) => {
      return new Promise((resolve, reject) => {
        const replySql = `
          SELECT * FROM comments 
          WHERE parent_id = ? AND status = 1
          ORDER BY time ASC
        `;
        db.query(replySql, [commentId], (replyErr, replyResults) => {
          if (replyErr) reject(replyErr);
          resolve(replyResults);
        });
      });
    };
    
    // 递归获取所有评论的回复
    const buildCommentTree = async () => {
      const commentTree = [];
      for (const comment of results) {
        const replies = await getReplies(comment.id);
        comment.replies = replies;
        commentTree.push(comment);
      }
      return commentTree;
    };
    
    buildCommentTree()
      .then(commentTree => res.json(commentTree))
      .catch(replyErr => res.status(500).json({ message: '获取回复列表失败', error: replyErr.message }));
  });
};

// 添加评论
exports.addComment = (req, res) => {
  const { content_id, user_name, content, time, parent_id = null } = req.body;
  
  if (!content_id || !user_name || !content || !time) {
    return res.status(400).json({ message: '评论内容、用户名和时间不能为空' });
  }
  
  // 格式化时间
  const formattedTime = new Date(time).toISOString().slice(0, 19).replace('T', ' ');
  
  const sql = `
    INSERT INTO comments (content_id, user_name, content, time, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [content_id, user_name, content, formattedTime, parent_id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: '添加评论失败', error: err.message });
    }
    res.json({ message: '评论添加成功', id: result.insertId });
  });
};

// 回复评论
exports.replyComment = (req, res) => {
  // 回复评论与添加评论逻辑类似，只是parent_id不为空
  const { content_id, user_name, content, time, parent_id } = req.body;
  
  if (!content_id || !user_name || !content || !time || parent_id === undefined) {
    return res.status(400).json({ message: '缺少必要的回复参数' });
  }
  
  // 格式化时间
  const formattedTime = new Date(time).toISOString().slice(0, 19).replace('T', ' ');
  
  const sql = `
    INSERT INTO comments (content_id, user_name, content, time, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [content_id, user_name, content, formattedTime, parent_id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: '回复评论失败', error: err.message });
    }
    res.json({ message: '回复添加成功', id: result.insertId });
  });
};

// 删除评论
exports.deleteComment = (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM comments WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: '删除评论失败', error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }
    res.json({ message: '评论删除成功' });
  });
};

// 更新评论状态
exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (status === undefined) {
    return res.status(400).json({ message: '请提供评论状态' });
  }
  
  const sql = 'UPDATE comments SET status = ? WHERE id = ?';
  
  db.query(sql, [status, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: '更新评论状态失败', error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }
    res.json({ message: '评论状态更新成功' });
  });
};