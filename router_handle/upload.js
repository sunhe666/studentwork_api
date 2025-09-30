const path = require('path');
const fs = require('fs');
const axios = require('axios');
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

// 文件代理访问（解决CORS问题）
exports.proxyFile = async (req, res) => {
  try {
    // 从查询参数获取文件URL
    const fileUrl = req.query.url;
    
    if (!fileUrl) {
      return res.status(400).json({ message: '缺少文件URL参数' });
    }

    // 验证URL格式
    let targetUrl;
    try {
      // 如果是相对路径，构建完整的OSS URL
      if (fileUrl.startsWith('http')) {
        targetUrl = fileUrl;
      } else {
        // 假设是OSS的相对路径
        targetUrl = `http://sunhe197428.oss-cn-beijing.aliyuncs.com/${fileUrl}`;
      }
      new URL(targetUrl); // 验证URL格式
    } catch (error) {
      return res.status(400).json({ message: '无效的文件URL' });
    }

    console.log('代理访问文件:', targetUrl);

    // 使用axios获取文件
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      timeout: 30000, // 30秒超时
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // 设置响应头
    res.set({
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
      'Content-Length': response.headers['content-length'],
      'Cache-Control': 'public, max-age=3600', // 缓存1小时
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // 如果是PDF文件，设置内联显示
    if (response.headers['content-type']?.includes('pdf')) {
      res.set('Content-Disposition', 'inline');
    }

    // 流式传输文件内容
    response.data.pipe(res);

  } catch (error) {
    console.error('代理文件访问失败:', error.message);
    
    if (error.response) {
      // HTTP错误
      res.status(error.response.status).json({ 
        message: '文件访问失败', 
        error: `HTTP ${error.response.status}: ${error.response.statusText}` 
      });
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      // 网络错误
      res.status(502).json({ message: '无法连接到文件服务器' });
    } else if (error.code === 'ECONNABORTED') {
      // 超时错误
      res.status(504).json({ message: '文件访问超时' });
    } else {
      // 其他错误
      res.status(500).json({ message: '服务器内部错误', error: error.message });
    }
  }
}; 