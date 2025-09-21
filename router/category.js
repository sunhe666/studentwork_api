const express = require('express');
const router = express.Router();
const categoryHandle = require('../router_handle/category');

// 获取分类列表
router.get('/list', categoryHandle.getList);

// 添加分类
router.post('/add', categoryHandle.add);

// 编辑分类
router.put('/edit/:id', categoryHandle.edit);

// 删除分类
router.delete('/delete/:id', categoryHandle.delete);

// 更新分类状态
router.put('/status/:id', categoryHandle.updateStatus);

// 更新分类排序
router.put('/sort', categoryHandle.updateSort);

module.exports = router;