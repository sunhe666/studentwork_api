const express = require('express');
const router = express.Router();
const roleHandle = require('../router_handle/role');

// 添加角色
router.post('/add', roleHandle.addRole);

// 获取角色列表
router.get('/list', roleHandle.getRoleList);

// 获取角色详情
router.get('/detail/:id', roleHandle.getRoleDetail);

// 更新角色信息
router.put('/update/:id', roleHandle.updateRole);

// 删除角色
router.delete('/delete/:id', roleHandle.deleteRole);

// 获取所有菜单（用于权限分配）
router.get('/allMenus', roleHandle.getAllMenus);

// 分配菜单权限
router.post('/assignMenu', roleHandle.assignMenu);

// 获取角色的菜单权限
router.get('/menu/:id', roleHandle.getRoleMenus);

module.exports = router;