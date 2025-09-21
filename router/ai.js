const express = require('express');
const router = express.Router();
const aiHandle = require('../router_handle/ai');

// AI聊天接口
router.post('/chat', aiHandle.chat);

module.exports = router;