const express = require('express');
const router = express.Router();
const uploadHandler = require('../router_handle/upload');
const multer = require('multer');

// 使用内存存储，避免在只读文件系统中创建目录
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

// 单张图片上传
router.post('/upload/single', upload.single('file'), uploadHandler.uploadSingle);
// 多张图片上传
router.post('/upload/multiple', upload.array('files', 10), uploadHandler.uploadMultiple);
// 文件代理访问（解决CORS问题）
router.get('/proxy', uploadHandler.proxyFile);

module.exports = router; 