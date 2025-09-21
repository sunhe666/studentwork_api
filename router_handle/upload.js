const path = require('path');
const fs = require('fs');
const { uploadToOSS } = require('../utils/oss');

// 单张图片上传
exports.uploadSingle = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '未上传文件' });
  }
  const filePath = req.file.path;
  const ossPath = `images/${Date.now()}_${req.file.originalname}`;
  try {
    const result = await uploadToOSS(filePath, ossPath);
    fs.unlinkSync(filePath); // 上传后删除本地文件
    res.json({ url: result.url });
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
    const filePath = file.path;
    const ossPath = `images/${Date.now()}_${file.originalname}`;
    try {
      const result = await uploadToOSS(filePath, ossPath);
      fs.unlinkSync(filePath);
      results.push({ url: result.url });
    } catch (err) {
      results.push({ error: err.message, file: file.originalname });
    }
  }
  res.json(results);
}; 