# 文档降重API接口文档

## 接口概述

本接口提供一键全文降重功能，支持上传论文文档文件，通过AI技术进行智能降重处理，并返回降重后的文档文件。

## 接口地址

```
POST /ai/document-reduction
```

## 请求参数

### 请求方式
- **Content-Type**: `multipart/form-data`

### 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 上传的论文文档文件 |
| reductionLevel | String | 否 | 降重强度，可选值：light/medium/heavy，默认medium |

### 文件格式支持
- `.docx` - Word文档
- `.doc` - Word文档（旧版本）
- `.pdf` - PDF文档
- `.txt` - 纯文本文档

### 文件大小限制
- 最大文件大小：50MB

## 响应格式

### 成功响应 (200)

```json
{
  "message": "文档降重完成",
  "originalFileName": "论文.docx",
  "reducedFileName": "论文_降重后_1640995200000.docx",
  "fileUrl": "/api/download/论文_降重后_1640995200000.docx",
  "originalLength": 5000,
  "reducedLength": 4800,
  "reductionLevel": "medium"
}
```

### 错误响应

#### 400 - 请求参数错误
```json
{
  "message": "请上传文档文件"
}
```

#### 400 - 文件格式不支持
```json
{
  "message": "不支持的文件格式，请上传 DOCX、DOC、PDF 或 TXT 文件"
}
```

#### 400 - 文档解析失败
```json
{
  "message": "文档解析失败",
  "error": "具体错误信息"
}
```

#### 500 - 服务器错误
```json
{
  "message": "文档降重处理失败",
  "error": "具体错误信息"
}
```

## 文件下载接口

### 接口地址
```
GET /api/download/:filename
```

### 参数说明
- `filename`: 文件名，从降重接口响应中获取

### 响应
- 成功：返回文件流，浏览器自动下载
- 失败：返回404错误

## 处理流程

1. **文件上传**: 客户端上传论文文档文件
2. **文档解析**: 服务器解析文档内容，提取文本
3. **分块处理**: 将长文本分割成块，避免单次处理过长
4. **AI降重**: 对每个文本块调用AI接口进行降重处理
5. **文档重构**: 将降重后的文本重新生成为原格式文档
6. **文件存储**: 将处理后的文档保存到服务器
7. **返回结果**: 返回下载链接和处理信息

## 降重强度说明

### light (轻度降重)
- 主要通过同义词替换和简单句式调整
- 保持原文表达风格
- 适合重复率较低的文档

### medium (中度降重)
- 同义词替换 + 句式重构 + 表达方式调整
- 平衡降重效果和原意保持
- 推荐使用的默认级别

### heavy (深度降重)
- 全面的同义词替换、句式重构、段落重组
- 大幅降低重复率
- 适合重复率较高的文档

## 格式保持特性

### 支持保持的格式
- 字体和字号设置
- 段落缩进和间距
- 基本文档结构
- 文本内容完整性

### 注意事项
- 复杂的表格和图片可能需要手动调整
- PDF转换后会生成为DOCX格式
- 建议降重后进行人工校对

## 使用示例

### JavaScript (前端)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('reductionLevel', 'medium');

const response = await axios.post('/ai/document-reduction', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

// 下载处理后的文件
window.open(response.data.fileUrl, '_blank');
```

### Node.js (测试)
```javascript
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('file', fs.createReadStream('test.docx'));
formData.append('reductionLevel', 'medium');

const response = await axios.post('http://localhost:3000/ai/document-reduction', formData, {
  headers: formData.getHeaders()
});
```

## 性能说明

- 处理时间取决于文档长度和复杂度
- 一般文档（5000字以内）处理时间约1-3分钟
- 长文档会自动分块处理，确保稳定性
- 支持上传进度监控

## 安全说明

- 上传的文件会在处理完成后自动删除
- 生成的降重文件会定期清理
- 不会保存用户的文档内容
- 所有文件传输使用HTTPS加密
