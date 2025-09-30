const axios = require('axios');
const { PassThrough } = require('stream');

/**
 * 创建AI聊天完成请求
 * @param {Array} messages - 消息列表
 * @param {string} apiKey - API密钥
 * @param {boolean} stream - 是否使用流式响应
 * @returns {Promise} - 返回一个Promise，解析为响应对象
 */
async function createAIChatCompletion(messages, apiKey, stream = true) {
  const url = 'https://spark-api-open.xf-yun.com/v2/chat/completions';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const data = {
    max_tokens: 32768,
    top_k: 6,
    temperature: 1.2,
    messages: messages,
    model: 'x1',
    stream: stream,
    tools: [
      {
        web_search: {
          search_mode: 'normal',
          enable: false
        },
        type: 'web_search'
      }
    ]
  };

  try {
    const response = await axios.post(url, data, {
      headers: headers,
      responseType: stream ? 'stream' : 'json'
    });
    return response;
  } catch (error) {
    console.error('请求错误:', error.message);
    throw error;
  }
}

/**
 * 处理流式响应
 * @param {Object} response - axios响应对象
 * @param {Function} onData - 数据处理回调函数
 * @param {Function} onEnd - 结束回调函数
 * @param {Function} onError - 错误回调函数
 */
function processStreamingResponse(response, onData, onEnd, onError) {
  if (!response || !response.data) {
    if (onError) onError(new Error('无效的响应对象'));
    return;
  }

  const stream = response.data;

  stream.on('data', (chunk) => {
    try {
      const chunkStr = chunk.toString('utf-8');
      console.log('接收到数据块:', chunkStr); // 调试日志
      
      // 分割多行响应
      const lines = chunkStr.split('\n');

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        console.log('处理行:', trimmedLine); // 调试日志

        // 移除行首的 'data: ' 前缀
        let dataLine = trimmedLine;
        if (dataLine.startsWith('data: ')) {
          dataLine = dataLine.substring(6).trim();
        }

        // 处理结束信号
        if (dataLine === '[DONE]') {
          console.log('接收到结束信号');
          if (onData) onData('data: [DONE]\n');
          if (onEnd) onEnd();
          return;
        }

        // 跳过空行或无效数据
        if (!dataLine || dataLine.length === 0) return;

        // 解析JSON
        try {
          const data = JSON.parse(dataLine);
          console.log('解析的JSON数据:', data); // 调试日志
          
          if (data.choices && data.choices.length > 0) {
            const delta = data.choices[0].delta || {};
            if (delta.content) {
              const formattedData = `data: {"content": "${delta.content.replace(/"/g, '\\\"')}"}\n`;
              if (onData) onData(formattedData);
            }
          }
        } catch (jsonError) {
          console.error('JSON解析错误:', jsonError.message, '原始数据:', dataLine);
          // 不抛出错误，继续处理其他行
        }
      });
    } catch (error) {
      console.error('处理流数据错误:', error.message);
      if (onError) onError(error);
    }
  });

  stream.on('end', () => {
    // 确保发送结束信号
    if (onData) onData('data: [DONE]\n');
    if (onEnd) onEnd();
  });

  stream.on('error', (error) => {
    console.error('流错误:', error.message);
    if (onError) onError(error);
  });
}

// 如果直接运行此文件
if (require.main === module) {
  // 系统提示
  const systemPrompt = "**角色：** 你是一位学识渊博、经验丰富的**大学首席教授**。你拥有**覆盖所有主要学科领域**（自然科学、工程技术、人文社科、艺术、医学、商学等）的**深厚知识储备**和**深刻理解力**，并精通**跨学科思维**。你以**严谨的学术态度**、**清晰的表达能力**和**循循善诱的教学风格**著称。\n\n**核心任务：** 根据学生提出的**任何大学学术相关问题**，提供**权威、准确、全面且易于理解**的解答，并视情况引导其进行更深层次的思考。\n\n**回答要求：**\n\n1.  **权威性与准确性：**\n    *   基于**可靠的科学原理、学术理论和公认的研究成果**进行回答。\n    *   区分**事实、理论、假说和观点**。\n    *   对于**存疑或尚无定论**的问题，明确说明其复杂性和争议点，**不臆测**。\n    *   **引用关键概念、重要人物或里程碑研究时力求精确。**\n\n2.  **全面性与深度：**\n    *   努力触及问题的**核心本质**，提供**有深度的见解**，而非仅停留于表面。\n    *   对于复杂问题，**构建逻辑清晰的分析框架**（例如：背景、关键因素、不同理论/观点、结论/展望）。\n    *   展现**跨学科视角**，指出问题可能涉及的其他相关领域。\n\n3.  **教学性与引导性：**\n    *   **用通俗易懂的语言解释复杂概念**，避免不必要的专业术语堆砌。若使用术语，需**清晰定义**。\n    *   将问题置于**更广阔的学术背景或历史脉络**中讲解，帮助学生理解其意义。\n    *   **鼓励批判性思维**：在解答后，可提出启发性问题（例如：“从这个角度看，你认为...？”，“如果变量X改变，结果会如何？”），引导学生进一步探索，而非仅仅提供“标准答案”。\n    *   对于寻求解决方案的问题，**解释背后的原理和思考过程**，授人以渔。\n\n4.  **适切性与分寸感：**\n    *   根据提问的**语境和复杂程度**调整回答的**深度和广度**。对基础问题提供扎实解释，对高阶问题展现学术前沿思考。\n    *   保持**专业、耐心、鼓励**的态度。即使面对简单或表述不清的问题，也应以建设性方式回应。\n    *   **明确能力边界**：对于超出当前知识范围、涉及高度专业细分领域或需要最新未公开数据的问题，应坦诚说明“这超出了我的当前知识范围”或“该领域最新进展需要查阅特定文献”，**避免编造信息**。\n\n5.  **结构清晰：**\n    *   组织答案时做到**逻辑流畅、重点突出、层次分明**。可使用段落分隔、小标题（如适用）等方式提升可读性。\n\n**最终目标：** 你的回答不仅应解决学生的即时疑问，更应**激发其求知欲、培养其独立思考能力和跨学科素养**，使其感受到与一位真正顶尖学者对话的收获。输入的内容不要带表格，--，*，！，#，*等符号,然后返回的内容也不用太多，一般300-500字即可";

  // 用户问题
  const userQuestion = "你好";

  // 构建消息列表
  const messages = [
    {
      role: 'system',
      content: ""
    },
    {
      role: 'user',
      content: userQuestion
    }
  ];

  // 使用提供的API密钥
  const apiKey = 'gkZjkhgUaWuhxJNZEmPt:LayeVQnhAyhvznMpiMSe';

  // 创建请求
  createAIChatCompletion(messages, apiKey, true)
    .then(response => {
      console.log('开始接收流式响应...');
      processStreamingResponse(
        response,
        (content) => {
          // 处理接收到的数据
          process.stdout.write(content);
        },
        () => {
          // 处理结束
          console.log('\n流式响应结束');
        },
        (error) => {
          // 处理错误
          console.error('处理流式响应时出错:', error.message);
        }
      );
    })
    .catch(error => {
      console.error('请求失败:', error.message);
    });
}

// 导出函数，供其他模块使用
module.exports = {
  createAIChatCompletion,
  processStreamingResponse
};