const express = require('express');
const router = express.Router();
const uploadHandler = require('../router_handle/upload');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// 单张图片上传
router.post('/upload/single', upload.single('file'), uploadHandler.uploadSingle);
// 多张图片上传
router.post('/upload/multiple', upload.array('files', 10), uploadHandler.uploadMultiple);

module.exports = router; 