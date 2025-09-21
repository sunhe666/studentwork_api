const express = require('express');
const router = express.Router();
const announcementHandle = require('../router_handle/announcement');

// 获取公告列表
router.get('/list', announcementHandle.getList);

// 获取公告详情
router.get('/:id', announcementHandle.getDetail);

// 创建公告
router.post('/add', announcementHandle.create);

// 更新公告
router.put('/edit/:id', announcementHandle.update);

// 删除公告
router.delete('/delete/:id', announcementHandle.delete);

module.exports = router;