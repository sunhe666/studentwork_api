const express = require('express');
const router = express.Router();
const adminHandler = require('../router_handle/admin');

// 管理员登录接口
router.post('/login', adminHandler.login);

// 获取用户列表
router.get('/user/list', adminHandler.getUserList);

// 获取单个用户信息
router.get('/user/:id', adminHandler.getUserById);

// 更新用户信息
router.put('/user/:id', adminHandler.updateUser);

// 删除用户
router.delete('/user/:id', adminHandler.deleteUser);

module.exports = router;