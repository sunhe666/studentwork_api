const OSS = require('ali-oss');

const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
});

/**
 * 上传文件到阿里云OSS
 * @param {string} filePath 本地文件路径
 * @param {string} ossPath OSS目标路径
 * @returns {Promise<object>} 上传结果
 */
async function uploadToOSS(filePath, ossPath) {
  try {
    const result = await ossClient.put(ossPath, filePath);
    return result;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  ossClient,
  uploadToOSS
}; 