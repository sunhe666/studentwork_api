const express = require('express');
const router = express.Router();
const contentHandler = require('../router_handle/content');

// 获取内容列表
router.get('/content/list', contentHandler.getList);
// 获取单条内容详情
router.get('/content/:id', contentHandler.getDetail);
// 新增内容
router.post('/content/add', contentHandler.add);
// 编辑内容
router.put('/content/edit/:id', contentHandler.edit);
// 删除内容
router.delete('/content/delete/:id', contentHandler.remove);

module.exports = router; 