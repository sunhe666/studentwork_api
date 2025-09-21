const express = require('express');
const router = express.Router();
const employeeHandle = require('../router_handle/employee');

// 员工登录
router.post('/login', employeeHandle.loginEmployee);

// 添加员工
router.post('/add', employeeHandle.addEmployee);

// 获取员工列表
router.get('/list', employeeHandle.getEmployeeList);

// 获取员工详情
router.get('/detail/:id', employeeHandle.getEmployeeDetail);

// 更新员工信息
router.put('/update/:id', employeeHandle.updateEmployee);

// 删除员工
router.delete('/delete/:id', employeeHandle.deleteEmployee);

// 更新员工状态
router.put('/status/:id', employeeHandle.updateEmployeeStatus);

module.exports = router;