const express = require('express');
const router = express.Router();
const userHandle = require('../router_handle/user');

// 用户注册
router.post('/register', userHandle.register);

// 用户登录
router.post('/login', userHandle.login);

// 获取用户信息
router.get('/info/:id', userHandle.getUserInfo);

// 更新用户资料
router.put('/update/:id', userHandle.updateUser);

// 修改密码
router.put('/changepassword/:id', userHandle.changePassword);

// 注销用户
router.delete('/delete/:id', userHandle.deleteUser);

module.exports = router;