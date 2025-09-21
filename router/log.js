const express = require('express');
const router = express.Router();
const logHandler = require('../router_handle/log');

// 获取日志列表
router.get('/log/list', logHandler.getList);
// 获取日志详情
router.get('/log/detail/:id', logHandler.getDetail);
// 按条件搜索日志
router.get('/log/search', logHandler.search);
// 删除日志
router.delete('/log/delete/:id', logHandler.delete);
// 批量删除日志
router.delete('/log/batchDelete', logHandler.batchDelete);

module.exports = router;