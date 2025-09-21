const express = require('express');
const router = express.Router();
const bannerHandler = require('../router_handle/banner');

// 获取所有轮播图
router.get('/banner/list', bannerHandler.getList);
// 新增轮播图
router.post('/banner/add', bannerHandler.add);
// 删除轮播图
router.delete('/banner/delete/:id', bannerHandler.remove);
// 编辑轮播图
router.put('/banner/edit/:id', bannerHandler.edit);
// 更新轮播图排序
router.put('/banner/sort', bannerHandler.updateSort);
// 更新轮播图状态
router.put('/banner/status/:id', bannerHandler.updateStatus);

module.exports = router; 