const express = require('express');
const router = express.Router();
const menuHandle = require('../router_handle/menu');

// 添加菜单
router.post('/add', menuHandle.addMenu);

// 获取菜单列表
router.get('/list', menuHandle.getMenuList);

// 获取菜单详情
router.get('/detail/:id', menuHandle.getMenuDetail);

// 更新菜单信息
router.put('/update/:id', menuHandle.updateMenu);

// 删除菜单
router.delete('/delete/:id', menuHandle.deleteMenu);

// 更新菜单排序
router.put('/sort', menuHandle.updateMenuSort);

// 更新菜单显示状态
router.put('/show/:id', menuHandle.updateMenuShow);

module.exports = router;