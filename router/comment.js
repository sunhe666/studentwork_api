const express = require('express');
const router = express.Router();
const commentHandle = require('../router_handle/comment');

// 获取内容的评论列表
router.get('/list/:contentId', commentHandle.getComments);

// 添加评论
router.post('/add', commentHandle.addComment);

// 回复评论
router.post('/reply', commentHandle.replyComment);

// 删除评论
router.delete('/delete/:id', commentHandle.deleteComment);

// 更新评论状态
router.put('/status/:id', commentHandle.updateStatus);

module.exports = router;