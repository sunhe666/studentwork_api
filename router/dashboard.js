const express = require('express');
const router = express.Router();
const dashboardHandler = require('../router_handle/dashboard');

// 系统概览数据接口
router.get('/dashboard/overview', dashboardHandler.getOverview);

// 业务数据接口
// 员工统计接口
router.get('/dashboard/employee/stats', dashboardHandler.getEmployeeStats);
// 合作申请统计接口
router.get('/dashboard/cooperation/stats', dashboardHandler.getCooperationStats);

// 热门内容接口
// 热门内容列表接口
router.get('/dashboard/popular/content', dashboardHandler.getPopularContent);
// 热门论文接口
router.get('/dashboard/popular/thesis', dashboardHandler.getPopularThesis);

module.exports = router;