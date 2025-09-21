// 导入AI聊天流处理函数
const { createAIChatCompletion, processStreamingResponse } = require('../ai_chat_stream');

/**
 * AI聊天处理函数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.chat = async function(req, res) {
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