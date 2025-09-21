const express = require('express');
const router = express.Router();
const cooperationHandle = require('../router_handle/cooperation');

// 提交合作申请
router.post('/apply', cooperationHandle.apply);

// 获取合作申请列表
router.get('/list', cooperationHandle.getList);

// 更新合作申请状态(是否联系)
router.put('/update/:id', cooperationHandle.updateStatus);

module.exports = router;