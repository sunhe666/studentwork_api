const express = require('express');
const router = express.Router();
const recruitmentHandler = require('../router_handle/recruitment');

// 路由前缀: /recruitment

// 获取招聘职位列表
router.get('/list', recruitmentHandler.getList);

// 获取招聘职位详情
router.get('/detail/:id', recruitmentHandler.getDetail);

// 创建招聘职位
router.post('/create', recruitmentHandler.create);

// 更新招聘职位
router.put('/update/:id', recruitmentHandler.update);

// 删除招聘职位
router.delete('/delete/:id', recruitmentHandler.delete);

// 切换招聘状态(停止/开始招聘)
router.put('/toggle/:id', recruitmentHandler.toggleStatus);

module.exports = router;