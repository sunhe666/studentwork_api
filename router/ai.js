const express = require('express');
const router = express.Router();
const aiHandle = require('../router_handle/ai');
const multer = require('multer');
const path = require('path');

// 注意：在无服务器环境中使用内存存储，不需要创建本地目录
// 所有文件处理都在内存中进行，然后直接上传到OSS

// 配置文件上传 - 使用内存存储
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  },
  fileFilter: function (req, file, cb) {
    // 检查文件类型
    const allowedTypes = /\.(docx|doc|pdf|txt)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，请上传 DOCX、DOC、PDF 或 TXT 文件'));
    }
  }
});

// AI聊天接口
router.post('/chat', aiHandle.chat);

// 文档降重接口
router.post('/document-reduction', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: '文件大小超过50MB限制' });
        }
        return res.status(400).json({ message: '文件上传失败: ' + err.message });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, aiHandle.documentReduction);

// 获取用户降重历史记录
router.get('/reduction-history', aiHandle.getReductionHistory);

// 删除降重记录
router.delete('/reduction-history/:id', aiHandle.deleteReductionRecord);

// 管理员接口
// 获取所有用户的降重历史记录（管理员）
router.get('/admin/reduction-history', aiHandle.getAdminReductionHistory);

// 删除降重记录（管理员）
router.delete('/admin/reduction-history/:id', aiHandle.deleteAdminReductionRecord);

// 获取降重记录详情（管理员）
router.get('/admin/reduction-history-detail/:id', aiHandle.getAdminReductionDetail);

// 获取文件内容（管理员）
router.get('/admin/file-content/:id/:type', aiHandle.getFileContent);

// 获取文件下载链接（管理员）
router.get('/admin/download-url/:id/:type', aiHandle.getDownloadUrl);

// 传递到论文表（管理员）
router.post('/admin/transfer-to-thesis', aiHandle.transferToThesis);

module.exports = router;