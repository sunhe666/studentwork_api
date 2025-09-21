const path = require('path');
const fs = require('fs');
const { uploadToOSS } = require('../utils/oss');

// 单张图片上传
exports.uploadSingle = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '未上传文件' });
  }
  
  const ossPath = `images/${Date.now()}_${req.file.originalname}`;
  try {
    // 使用内存中的buffer直接上传到OSS
    if (req.file.buffer) {
      // 内存存储模式
      const result = await uploadToOSS(req.file.buffer, ossPath);
      res.json({ url: result.url });
    } else if (req.file.path) {
      // 磁盘存储模式（本地开发）
      const result = await uploadToOSS(req.file.path, ossPath);
      fs.unlinkSync(req.file.path); // 上传后删除本地文件
      res.json({ url: result.url });
    } else {
      res.status(400).json({ message: '文件数据不可用' });
    }
  } catch (err) {
    res.status(500).json({ message: '上传失败', error: err.message });
  }
};

// 多张图片上传
exports.uploadMultiple = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: '未上传文件' });
  }
  
  const results = [];
  for (const file of req.files) {
    const ossPath = `images/${Date.now()}_${file.originalname}`;
    try {
      // 兼容内存存储和磁盘存储
      if (file.buffer) {
        // 内存存储模式（Vercel）
        const result = await uploadToOSS(file.buffer, ossPath);
        results.push({ url: result.url });
      } else if (file.path) {
        // 磁盘存储模式（本地开发）
        const result = await uploadToOSS(file.path, ossPath);
        fs.unlinkSync(file.path);
        results.push({ url: result.url });
      } else {
        results.push({ error: '文件数据不可用', file: file.originalname });
      }
    } catch (err) {
      results.push({ error: err.message, file: file.originalname });
    }
  }
  res.json(results);
}; 