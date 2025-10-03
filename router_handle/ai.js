// 导入AI聊天流处理函数
const { createAIChatCompletion, processStreamingResponse } = require('../ai_chat_stream');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const pool = require('../db'); // 数据库连接池
const { uploadToOSS, deleteFromOSS, generateSignedUrl, generateOSSPath, ossClient } = require('../utils/oss');

/**
 * AI聊天处理函数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function chat(req, res) {
  try {
    // 从请求体中获取消息和API密钥
    const { messages, apiKey } = req.body;

    // 验证必要的参数
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        message: '消息列表不能为空'
      });
    }

    // 使用默认API密钥，如果未提供
    const key = apiKey || 'gkZjkhgUaWuhxJNZEmPt:LayeVQnhAyhvznMpiMSe';

    // 创建AI聊天请求（非流式）
    const response = await createAIChatCompletion(messages, key, false);

    // 处理非流式响应
    if (response && response.data) {
      const data = response.data;
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || '';
        res.status(200).json({
          content: content
        });
      } else {
        res.status(400).json({
          message: 'AI响应格式错误'
        });
      }
    } else {
      res.status(500).json({
        message: 'AI服务无响应'
      });
    }
  } catch (error) {
    console.error('AI聊天接口错误:', error);
    res.status(500).json({
      message: '服务器内部错误',
      error: error.message
    });
  }
};

/**
 * 文档降重处理函数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function documentReduction(req, res) {
  console.log('=== 文档降重接口被调用 ===');
  console.log('请求体:', req.body);
  console.log('上传文件信息:', req.file);
  
  const startTime = Date.now();
  let reductionRecordId = null;
  
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      console.error('没有检测到上传的文件');
      return res.status(400).json({
        message: '请上传文档文件'
      });
    }

    const { reductionLevel = 'medium' } = req.body;
    const fileBuffer = req.file.buffer; // 使用内存中的文件数据
    
    // 正确处理中文文件名编码
    let originalName = req.file.originalname;
    try {
      // 尝试解码文件名
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (error) {
      console.warn('文件名编码转换失败，使用原始文件名:', error.message);
    }
    
    const fileExtension = path.extname(originalName).toLowerCase();

    console.log('文档信息:', {
      originalName,
      rawOriginalName: req.file.originalname,
      fileExtension,
      reductionLevel,
      fileSize: req.file.size,
      bufferSize: fileBuffer.length
    });

    // 获取用户ID（从token或session中获取，这里先用默认值）
    const userId = req.user?.id || 1; // 临时使用默认用户ID，后续需要从认证中获取

    // 上传原始文件到OSS
    let originalOSSPath;
    try {
      originalOSSPath = generateOSSPath('documents/original', originalName);
      console.log('开始上传原始文件到OSS:', originalOSSPath);
      
      const uploadResult = await uploadToOSS(fileBuffer, originalOSSPath, {
        headers: {
          'Content-Type': req.file.mimetype,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`
        }
      });
      
      console.log('原始文件上传OSS成功:', uploadResult.url);
    } catch (error) {
      console.error('上传原始文件到OSS失败:', error);
      return res.status(500).json({
        message: '文件上传失败',
        error: error.message
      });
    }

    // 创建降重记录
    reductionRecordId = await createReductionRecord({
      userId,
      originalFilename: originalName,
      originalOSSPath,
      reductionLevel,
      fileSize: req.file.size
    });

    // 1. 解析文档内容
    let documentText = '';
    let documentStructure = null;

    try {
      switch (fileExtension) {
        case '.docx':
        case '.doc':
          const docxResult = await parseDocxBuffer(fileBuffer);
          documentText = docxResult.text;
          documentStructure = docxResult.structure;
          break;
        case '.pdf':
          documentText = await parsePdfBuffer(fileBuffer);
          break;
        case '.txt':
          documentText = await parseTxtBuffer(fileBuffer);
          break;
        default:
          throw new Error('不支持的文件格式');
      }
    } catch (parseError) {
      console.error('文档解析失败:', parseError);
      return res.status(400).json({
        message: '文档解析失败',
        error: parseError.message
      });
    }

    if (!documentText.trim()) {
      return res.status(400).json({
        message: '文档内容为空或无法解析'
      });
    }

    // 2. 分段处理文本（避免单次处理过长）
    const textChunks = splitTextIntoChunks(documentText, 2000);
    const reducedChunks = [];

    // 3. 对每个文本块进行AI降重
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`处理第 ${i + 1}/${textChunks.length} 个文本块`);
      
      try {
        const reducedChunk = await processTextReduction(chunk, reductionLevel);
        reducedChunks.push(reducedChunk);
      } catch (reductionError) {
        console.error(`第 ${i + 1} 个文本块降重失败:`, reductionError);
        // 如果降重失败，使用原文本
        reducedChunks.push(chunk);
      }
    }

    // 4. 合并降重后的文本
    const finalReducedText = reducedChunks.join('\n\n');

    // 5. 生成降重后的文档并上传到OSS
    const outputFileName = generateOutputFileName(originalName);
    let reducedOSSPath;
    let reducedFileBuffer;

    try {
      switch (fileExtension) {
        case '.docx':
        case '.doc':
          reducedFileBuffer = await generateDocxBuffer(finalReducedText, documentStructure);
          break;
        case '.pdf':
          // PDF重新生成比较复杂，这里先生成为DOCX格式
          reducedFileBuffer = await generateDocxBuffer(finalReducedText);
          break;
        case '.txt':
          reducedFileBuffer = Buffer.from(finalReducedText, 'utf-8');
          break;
      }

      // 上传降重后的文件到OSS
      reducedOSSPath = generateOSSPath('documents/reduced', outputFileName);
      console.log('开始上传降重后文件到OSS:', reducedOSSPath);
      
      const uploadResult = await uploadToOSS(reducedFileBuffer, reducedOSSPath, {
        headers: {
          'Content-Type': fileExtension === '.txt' ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFileName)}"`
        }
      });
      
      console.log('降重后文件上传OSS成功:', uploadResult.url);
    } catch (generateError) {
      console.error('文档生成或上传失败:', generateError);
      
      // 如果生成失败，删除原始文件的OSS记录
      try {
        await deleteFromOSS(originalOSSPath);
        console.log('已清理原始OSS文件:', originalOSSPath);
      } catch (deleteError) {
        console.error('清理原始OSS文件失败:', deleteError);
      }
      
      return res.status(500).json({
        message: '降重后文档生成失败',
        error: generateError.message
      });
    }

    // 7. 计算处理时间和降重率
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    const reductionRate = documentText.length > 0 ? 
      ((documentText.length - finalReducedText.length) / documentText.length * 100).toFixed(2) : 0;

    // 6. 更新降重记录为完成状态
    if (reductionRecordId) {
      await updateReductionRecord(reductionRecordId, {
        reducedFilename: outputFileName,
        reducedOSSPath: reducedOSSPath,
        fileUrl: generateSignedUrl(reducedOSSPath, 86400), // 24小时有效期
        originalLength: documentText.length,
        reducedLength: finalReducedText.length,
        reductionRate: parseFloat(reductionRate),
        processingTime,
        status: 'completed'
      });
    }

    // 7. 返回处理结果
    const fileUrl = generateSignedUrl(reducedOSSPath, 86400); // 24小时有效期
    
    const responseData = {
      message: '文档降重完成',
      originalFileName: originalName,
      reducedFileName: outputFileName,
      fileUrl: fileUrl,
      originalLength: documentText.length,
      reducedLength: finalReducedText.length,
      reductionLevel: reductionLevel,
      reductionRate: parseFloat(reductionRate),
      processingTime: processingTime,
      recordId: reductionRecordId
    };
    
    console.log('准备返回响应数据:', responseData);
    res.status(200).json(responseData);

  } catch (error) {
    console.error('文档降重处理失败:', error);
    
    // 更新降重记录为失败状态
    if (reductionRecordId) {
      try {
        await updateReductionRecord(reductionRecordId, {
          status: 'failed',
          errorMessage: error.message
        });
      } catch (updateError) {
        console.error('更新失败记录出错:', updateError);
      }
    }
    
    // 清理上传的文件
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('清理上传文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      message: '文档降重处理失败',
      error: error.message
    });
  }
};

/**
 * 解析DOCX文件
 */
async function parseDocxFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  
  return {
    text: result.value,
    structure: null // 简化版本，后续可以扩展保存更多格式信息
  };
}

/**
 * 解析PDF文件
 */
async function parsePdfFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * 解析TXT文件
 */
async function parseTxtFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

/**
 * 解析DOCX文件Buffer
 */
async function parseDocxBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  
  return {
    text: result.value,
    structure: null // 简化版本，后续可以扩展保存更多格式信息
  };
}

/**
 * 解析PDF文件Buffer
 */
async function parsePdfBuffer(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * 解析TXT文件Buffer
 */
async function parseTxtBuffer(buffer) {
  const content = buffer.toString('utf-8');
  return content;
}

/**
 * 将文本分割成块
 */
function splitTextIntoChunks(text, maxChunkSize = 2000) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * 处理文本降重
 */
async function processTextReduction(text, reductionLevel) {
  const reductionPrompts = {
    light: '请对以下文本进行轻度降重，主要通过同义词替换和简单的句式调整来降低重复率，保持原文的表达风格和学术性：',
    medium: '请对以下文本进行中度降重，通过同义词替换、句式重构和表达方式调整来有效降低重复率，同时保持原意和学术规范：',
    heavy: '请对以下文本进行深度降重，通过全面的同义词替换、句式重构、段落重组等方式大幅降低重复率，确保语义完整和学术质量：'
  };

  const systemPrompt = '你是一个专业的论文降重助手。请根据用户要求对文本进行降重处理，保持原文的学术性和逻辑性，确保降重后的内容准确、流畅、符合学术规范。只返回降重后的文本内容，不要添加任何解释或说明。';
  
  const userPrompt = reductionPrompts[reductionLevel] + '\n\n' + text;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // 使用默认API密钥
  const apiKey = 'gkZjkhgUaWuhxJNZEmPt:LayeVQnhAyhvznMpiMSe';
  
  const response = await createAIChatCompletion(messages, apiKey, false);
  
  if (response && response.data && response.data.choices && response.data.choices.length > 0) {
    return response.data.choices[0].message?.content || text;
  } else {
    throw new Error('AI降重服务响应异常');
  }
}

/**
 * 生成输出文件名
 */
function generateOutputFileName(originalName) {
  try {
    const nameWithoutExt = path.parse(originalName).name;
    const extension = path.parse(originalName).ext;
    const timestamp = Date.now();
    
    // 确保文件名不包含特殊字符，避免文件系统问题
    const cleanName = nameWithoutExt.replace(/[<>:"/\\|?*]/g, '_');
    
    return `${cleanName}_降重后_${timestamp}${extension}`;
  } catch (error) {
    console.error('生成文件名失败:', error);
    // 如果处理失败，使用安全的默认文件名
    const timestamp = Date.now();
    const extension = path.extname(originalName) || '.txt';
    return `降重文档_${timestamp}${extension}`;
  }
}

/**
 * 生成DOCX文件
 */
async function generateDocxFile(text, outputPath, structure = null) {
  // 将文本按段落分割
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  // 创建文档段落
  const docParagraphs = paragraphs.map(paragraphText => {
    return new Paragraph({
      children: [
        new TextRun({
          text: paragraphText.trim(),
          font: "宋体",
          size: 24 // 12pt = 24 half-points
        })
      ],
      spacing: {
        after: 200 // 段后间距
      }
    });
  });

  // 创建文档
  const doc = new Document({
    sections: [{
      properties: {},
      children: docParagraphs
    }]
  });

  // 生成文档buffer
  const buffer = await Packer.toBuffer(doc);
  
  // 写入文件
  await fs.writeFile(outputPath, buffer);
}

/**
 * 生成DOCX文件Buffer
 */
async function generateDocxBuffer(text, structure = null) {
  // 将文本按段落分割
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  // 创建文档段落
  const docParagraphs = paragraphs.map(paragraphText => {
    return new Paragraph({
      children: [
        new TextRun({
          text: paragraphText.trim(),
          font: "宋体",
          size: 24 // 12pt = 24 half-points
        })
      ],
      spacing: {
        after: 200 // 段后间距
      }
    });
  });

  // 创建文档
  const doc = new Document({
    sections: [{
      properties: {},
      children: docParagraphs
    }]
  });

  // 生成并返回文档buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 生成TXT文件
 */
async function generateTxtFile(text, outputPath) {
  await fs.writeFile(outputPath, text, 'utf-8');
}

/**
 * 创建降重记录
 */
async function createReductionRecord(data) {
  return new Promise((resolve, reject) => {
    // 先检查表是否存在，如果不存在则创建
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS reduction_history (
        id int(11) NOT NULL AUTO_INCREMENT,
        user_id int(11) NOT NULL COMMENT '用户ID',
        original_filename varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT '原始文件名',
        reduced_filename varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '降重后文件名',
        file_path varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '文件存储路径',
        file_url varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '文件下载链接',
        reduction_level enum('light','medium','heavy') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'medium' COMMENT '降重强度',
        original_length int(11) NOT NULL DEFAULT '0' COMMENT '原文字数',
        reduced_length int(11) NOT NULL DEFAULT '0' COMMENT '降重后字数',
        reduction_rate decimal(5,2) DEFAULT NULL COMMENT '降重率(%)',
        file_size bigint(20) NOT NULL DEFAULT '0' COMMENT '文件大小(字节)',
        processing_time int(11) DEFAULT NULL COMMENT '处理时长(秒)',
        status enum('processing','completed','failed') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'processing' COMMENT '处理状态',
        error_message text COLLATE utf8_unicode_ci COMMENT '错误信息',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY idx_user_id (user_id),
        KEY idx_created_at (created_at),
        KEY idx_status (status)
      ) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='论文降重历史记录表'
    `;
    
    pool.query(createTableSql, (createError) => {
      if (createError) {
        console.warn('创建表失败或表已存在:', createError.message);
      }
      
      // 插入记录
      const insertSql = `
        INSERT INTO reduction_history 
        (user_id, original_filename, original_oss_path, reduction_level, file_size, status) 
        VALUES (?, ?, ?, ?, ?, 'processing')
      `;
      
      pool.query(insertSql, [
        data.userId,
        data.originalFilename,
        data.originalOSSPath,
        data.reductionLevel,
        data.fileSize
      ], (error, results) => {
        if (error) {
          console.error('创建降重记录失败:', error);
          reject(error);
        } else {
          console.log('创建降重记录成功, ID:', results.insertId);
          resolve(results.insertId);
        }
      });
    });
  });
}

/**
 * 更新降重记录
 */
async function updateReductionRecord(recordId, data) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const values = [];
    
    if (data.reducedFilename) {
      fields.push('reduced_filename = ?');
      values.push(data.reducedFilename);
    }
    if (data.filePath) {
      fields.push('file_path = ?');
      values.push(data.filePath);
    }
    if (data.reducedOSSPath) {
      fields.push('reduced_oss_path = ?');
      values.push(data.reducedOSSPath);
    }
    if (data.fileUrl) {
      fields.push('file_url = ?');
      values.push(data.fileUrl);
    }
    if (data.originalLength !== undefined) {
      fields.push('original_length = ?');
      values.push(data.originalLength);
    }
    if (data.reducedLength !== undefined) {
      fields.push('reduced_length = ?');
      values.push(data.reducedLength);
    }
    if (data.reductionRate !== undefined) {
      fields.push('reduction_rate = ?');
      values.push(data.reductionRate);
    }
    if (data.processingTime !== undefined) {
      fields.push('processing_time = ?');
      values.push(data.processingTime);
    }
    if (data.status) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.errorMessage) {
      fields.push('error_message = ?');
      values.push(data.errorMessage);
    }
    
    if (fields.length === 0) {
      resolve();
      return;
    }
    
    const sql = `UPDATE reduction_history SET ${fields.join(', ')} WHERE id = ?`;
    values.push(recordId);
    
    pool.query(sql, values, (error, results) => {
      if (error) {
        console.error('更新降重记录失败:', error);
        reject(error);
      } else {
        console.log('更新降重记录成功, 受影响行数:', results.affectedRows);
        resolve(results);
      }
    });
  });
}

/**
 * 获取用户降重历史记录
 */
async function getReductionHistory(req, res) {
  try {
    // 获取用户ID（从token或session中获取，这里先用默认值）
    const userId = req.user?.id || 1; // 临时使用默认用户ID
    const { page = 1, limit = 10, status } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE user_id = ?';
    let queryParams = [userId];
    
    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    
    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM reduction_history ${whereClause}`;
    const countResult = await new Promise((resolve, reject) => {
      pool.query(countSql, queryParams, (error, results) => {
        if (error) reject(error);
        else resolve(results[0].total);
      });
    });
    
    // 查询记录
    const sql = `
      SELECT 
        id, original_filename, reduced_filename, file_url, reduction_level,
        original_length, reduced_length, reduction_rate, file_size,
        processing_time, status, error_message, created_at, updated_at
      FROM reduction_history 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const records = await new Promise((resolve, reject) => {
      pool.query(sql, queryParams, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    res.status(200).json({
      message: '获取降重历史成功',
      data: records,
      pagination: {
        total: countResult,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult / limit)
      }
    });
    
  } catch (error) {
    console.error('获取降重历史失败:', error);
    res.status(500).json({
      message: '获取降重历史失败',
      error: error.message
    });
  }
};

/**
 * 删除降重记录
 */
async function deleteReductionRecord(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user?.id || 1; // 临时使用默认用户ID
    
    // 先查询记录是否存在且属于当前用户
    const checkSql = 'SELECT * FROM reduction_history WHERE id = ? AND user_id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(checkSql, [recordId, userId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '降重记录不存在或无权限删除'
      });
    }
    
    // 删除文件
    if (record.file_path) {
      try {
        await fs.unlink(record.file_path);
        console.log('删除文件成功:', record.file_path);
      } catch (fileError) {
        console.warn('删除文件失败:', fileError);
      }
    }
    
    // 删除数据库记录
    const deleteSql = 'DELETE FROM reduction_history WHERE id = ? AND user_id = ?';
    await new Promise((resolve, reject) => {
      pool.query(deleteSql, [recordId, userId], (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    res.status(200).json({
      message: '删除降重记录成功'
    });
    
  } catch (error) {
    console.error('删除降重记录失败:', error);
    res.status(500).json({
      message: '删除降重记录失败',
      error: error.message
    });
  }
};

/**
 * 获取所有用户的降重历史记录（管理员）
 */
async function getAdminReductionHistory(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      reduction_level, 
      start_date, 
      end_date,
      search_type,
      search_keyword
    } = req.query;

    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }
    
    if (reduction_level) {
      whereConditions.push('reduction_level = ?');
      queryParams.push(reduction_level);
    }
    
    if (start_date && end_date) {
      whereConditions.push('created_at BETWEEN ? AND ?');
      queryParams.push(start_date, end_date);
    }
    
    if (search_keyword && search_type) {
      if (search_type === 'user_id') {
        whereConditions.push('user_id = ?');
        queryParams.push(parseInt(search_keyword));
      } else if (search_type === 'filename') {
        whereConditions.push('(original_filename LIKE ? OR reduced_filename LIKE ?)');
        queryParams.push(`%${search_keyword}%`, `%${search_keyword}%`);
      } else if (search_type === 'status') {
        whereConditions.push('status LIKE ?');
        queryParams.push(`%${search_keyword}%`);
      }
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM reduction_history ${whereClause}`;
    const countResult = await new Promise((resolve, reject) => {
      pool.query(countSql, queryParams, (error, results) => {
        if (error) reject(error);
        else resolve(results[0].total);
      });
    });
    
    // 获取数据
    const dataSql = `
      SELECT * FROM reduction_history 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...queryParams, parseInt(limit), parseInt(offset)];
    
    const dataResult = await new Promise((resolve, reject) => {
      pool.query(dataSql, dataParams, (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    // 获取统计数据
    const statsSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM reduction_history
    `;
    
    const statsResult = await new Promise((resolve, reject) => {
      pool.query(statsSql, (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    res.json({
      data: dataResult,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult,
        total_pages: Math.ceil(countResult / limit)
      },
      stats: statsResult
    });
    
  } catch (error) {
    console.error('获取管理员降重历史记录失败:', error);
    res.status(500).json({
      message: '获取数据失败',
      error: error.message
    });
  }
}

/**
 * 删除降重记录（管理员）
 */
async function deleteAdminReductionRecord(req, res) {
  try {
    const recordId = req.params.id;
    
    // 先获取记录信息
    const getRecordSql = 'SELECT * FROM reduction_history WHERE id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(getRecordSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '记录不存在'
      });
    }
    
    // 删除OSS文件
    const filesToDelete = [];
    if (record.original_oss_path) {
      filesToDelete.push(record.original_oss_path);
    }
    if (record.reduced_oss_path) {
      filesToDelete.push(record.reduced_oss_path);
    }
    
    for (const ossPath of filesToDelete) {
      try {
        await deleteFromOSS(ossPath);
        console.log('删除OSS文件成功:', ossPath);
      } catch (fileError) {
        console.error('删除OSS文件失败:', fileError);
      }
    }
    
    // 兼容旧的本地文件删除
    if (record.file_path && require('fs').existsSync(record.file_path)) {
      try {
        require('fs').unlinkSync(record.file_path);
        console.log('删除本地文件成功:', record.file_path);
      } catch (fileError) {
        console.error('删除本地文件失败:', fileError);
      }
    }
    
    // 删除数据库记录
    const deleteSql = 'DELETE FROM reduction_history WHERE id = ?';
    await new Promise((resolve, reject) => {
      pool.query(deleteSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    console.log('管理员删除降重记录成功, ID:', recordId);
    res.json({
      message: '删除成功'
    });
    
  } catch (error) {
    console.error('管理员删除降重记录失败:', error);
    res.status(500).json({
      message: '删除失败',
      error: error.message
    });
  }
}

/**
 * 删除降重记录（管理员）
 */
async function deleteAdminReductionRecord(req, res) {
  try {
    const recordId = req.params.id;
    
    // 先获取记录信息
    const getRecordSql = 'SELECT * FROM reduction_history WHERE id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(getRecordSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '记录不存在'
      });
    }
    
    // 删除OSS文件
    const filesToDelete = [];
    if (record.original_oss_path) {
      filesToDelete.push(record.original_oss_path);
    }
    if (record.reduced_oss_path) {
      filesToDelete.push(record.reduced_oss_path);
    }
    
    for (const ossPath of filesToDelete) {
      try {
        await deleteFromOSS(ossPath);
        console.log('删除OSS文件成功:', ossPath);
      } catch (fileError) {
        console.error('删除OSS文件失败:', fileError);
      }
    }
    
    // 兼容旧的本地文件删除
    if (record.file_path && require('fs').existsSync(record.file_path)) {
      try {
        require('fs').unlinkSync(record.file_path);
        console.log('删除本地文件成功:', record.file_path);
      } catch (fileError) {
        console.error('删除本地文件失败:', fileError);
      }
    }
    
    // 删除数据库记录
    const deleteSql = 'DELETE FROM reduction_history WHERE id = ?';
    await new Promise((resolve, reject) => {
      pool.query(deleteSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    console.log('管理员删除降重记录成功, ID:', recordId);
    res.json({
      message: '删除成功'
    });
    
  } catch (error) {
    console.error('管理员删除降重记录失败:', error);
    res.status(500).json({
      message: '删除失败',
      error: error.message
    });
  }
}

/**
 * 获取降重记录详情（管理员）
 */
async function getAdminReductionDetail(req, res) {
  try {
    const recordId = req.params.id;
    
    // 获取记录详情
    const getRecordSql = 'SELECT * FROM reduction_history WHERE id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(getRecordSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '记录不存在'
      });
    }
    
    res.json(record);
    
  } catch (error) {
    console.error('获取降重记录详情失败:', error);
    res.status(500).json({
      message: '获取详情失败',
      error: error.message
    });
  }
}

/**
 * 获取文件内容（管理员）
 */
async function getFileContent(req, res) {
  try {
    const recordId = req.params.id;
    const fileType = req.params.type; // 'original' 或 'reduced'
    
    // 获取记录信息
    const getRecordSql = 'SELECT * FROM reduction_history WHERE id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(getRecordSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '记录不存在'
      });
    }
    
    let ossPath;
    if (fileType === 'original') {
      ossPath = record.original_oss_path;
    } else if (fileType === 'reduced') {
      ossPath = record.reduced_oss_path;
    } else {
      return res.status(400).json({
        message: '无效的文件类型'
      });
    }
    
    if (!ossPath) {
      return res.status(404).json({
        message: '文件路径不存在'
      });
    }
    
    try {
      // 从OSS获取文件内容
      const result = await ossClient.get(ossPath);
      let content = '';
      let htmlContent = '';
      let contentType = 'text';
      
      // 根据文件扩展名解析内容
      const fileExtension = path.extname(record.original_filename).toLowerCase();
      
      if (fileExtension === '.txt') {
        content = result.content.toString('utf-8');
        contentType = 'text';
      } else if (fileExtension === '.docx' || fileExtension === '.doc') {
        // 解析DOCX文件 - 提取纯文本和HTML
        const docTextResult = await mammoth.extractRawText({ buffer: result.content });
        content = docTextResult.value;
        
        // 提取HTML格式（包含表格、图片等）
        const docHtmlResult = await mammoth.convertToHtml({ 
          buffer: result.content,
          convertImage: mammoth.images.imgElement(function(image) {
            // 将图片转换为base64格式
            return image.read("base64").then(function(imageBuffer) {
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
              };
            });
          })
        });
        htmlContent = docHtmlResult.value;
        contentType = 'html';
        
        // 如果HTML转换失败，回退到纯文本
        if (!htmlContent) {
          contentType = 'text';
        }
      } else if (fileExtension === '.pdf') {
        // 解析PDF文件
        const pdfData = await pdfParse(result.content);
        content = pdfData.text;
        contentType = 'text';
      } else {
        return res.status(400).json({
          message: '不支持的文件格式'
        });
      }
      
      res.json({
        content: content,
        htmlContent: htmlContent,
        contentType: contentType,
        filename: fileType === 'original' ? record.original_filename : record.reduced_filename,
        size: result.res.size
      });
      
    } catch (ossError) {
      console.error('从OSS获取文件失败:', ossError);
      res.status(500).json({
        message: '获取文件内容失败',
        error: ossError.message
      });
    }
    
  } catch (error) {
    console.error('获取文件内容失败:', error);
    res.status(500).json({
      message: '获取文件内容失败',
      error: error.message
    });
  }
}

/**
 * 获取文件下载链接（管理员）
 */
async function getDownloadUrl(req, res) {
  try {
    const recordId = req.params.id;
    const fileType = req.params.type; // 'original' 或 'reduced'
    
    // 获取记录信息
    const getRecordSql = 'SELECT * FROM reduction_history WHERE id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(getRecordSql, [recordId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '记录不存在'
      });
    }
    
    let ossPath, filename;
    console.log('获取下载链接请求:', { recordId, fileType });
    console.log('数据库记录:', {
      id: record.id,
      original_filename: record.original_filename,
      reduced_filename: record.reduced_filename,
      original_oss_path: record.original_oss_path,
      reduced_oss_path: record.reduced_oss_path
    });
    
    if (fileType === 'original') {
      ossPath = record.original_oss_path;
      filename = record.original_filename;
    } else if (fileType === 'reduced') {
      ossPath = record.reduced_oss_path;
      filename = record.reduced_filename;
    } else {
      return res.status(400).json({
        message: '无效的文件类型'
      });
    }
    
    console.log('选择的文件信息:', { fileType, ossPath, filename });
    
    if (!ossPath) {
      return res.status(404).json({
        message: '文件路径不存在'
      });
    }
    
    try {
      // 生成24小时有效的签名URL
      const downloadUrl = generateSignedUrl(ossPath, 86400);
      
      res.json({
        downloadUrl: downloadUrl,
        filename: filename,
        expires: '24小时'
      });
      
    } catch (signError) {
      console.error('生成下载链接失败:', signError);
      res.status(500).json({
        message: '生成下载链接失败',
        error: signError.message
      });
    }
    
  } catch (error) {
    console.error('获取下载链接失败:', error);
    res.status(500).json({
      message: '获取下载链接失败',
      error: error.message
    });
  }
}

/**
 * 传递到论文表（管理员）
 */
async function transferToThesis(req, res) {
  try {
    const { reductionRecordId, title, publisher, category_name } = req.body;
    
    console.log('传递到论文表请求:', { reductionRecordId, title, publisher, category_name });
    
    // 验证必填字段
    if (!reductionRecordId || !title || !publisher || !category_name) {
      return res.status(400).json({
        message: '缺少必填字段'
      });
    }
    
    // 获取降重记录信息
    const getRecordSql = 'SELECT * FROM reduction_history WHERE id = ?';
    const record = await new Promise((resolve, reject) => {
      pool.query(getRecordSql, [reductionRecordId], (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      });
    });
    
    if (!record) {
      return res.status(404).json({
        message: '降重记录不存在'
      });
    }
    
    if (!record.original_oss_path) {
      return res.status(400).json({
        message: '原始文件OSS路径不存在'
      });
    }
    
    // 生成原始文件的下载链接
    const { generateSignedUrl } = require('../utils/oss');
    const originalFileUrl = generateSignedUrl(record.original_oss_path, 3600 * 24 * 7); // 7天有效期
    
    console.log('生成的原始文件下载链接:', originalFileUrl);
    
    // 插入到论文表
    const insertThesisSql = `
      INSERT INTO thesis (thesis_file, title, publisher, category_name, publish_time, views, likes, favorites)
      VALUES (?, ?, ?, ?, NOW(), 0, 0, 0)
    `;
    
    const insertResult = await new Promise((resolve, reject) => {
      pool.query(insertThesisSql, [originalFileUrl, title, publisher, category_name], (error, results) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
    
    console.log('论文插入结果:', insertResult);
    
    res.json({
      message: '传递成功',
      thesisId: insertResult.insertId,
      data: {
        id: insertResult.insertId,
        thesis_file: originalFileUrl,
        title: title,
        publisher: publisher,
        category_name: category_name,
        original_filename: record.original_filename
      }
    });
    
  } catch (error) {
    console.error('传递到论文表失败:', error);
    res.status(500).json({
      message: '传递失败',
      error: error.message
    });
  }
}

module.exports = {
  chat,
  documentReduction,
  getReductionHistory,
  deleteReductionRecord,
  getAdminReductionHistory,
  deleteAdminReductionRecord,
  getAdminReductionDetail,
  getFileContent,
  getDownloadUrl,
  transferToThesis
};