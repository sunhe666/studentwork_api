const OSS = require('ali-oss');

const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
});

/**
 * 上传文件到阿里云OSS
 * @param {string|Buffer} fileData 本地文件路径或Buffer数据
 * @param {string} ossPath OSS目标路径
 * @returns {Promise<object>} 上传结果
 */
async function uploadToOSS(fileData, ossPath) {
  try {
    // 支持文件路径和Buffer两种方式
    const result = await ossClient.put(ossPath, fileData);
    return result;
  } catch (err) {
    console.error('OSS上传错误:', err);
    throw err;
  }
}

module.exports = {
  ossClient,
  uploadToOSS
}; 