/**
 * AI 路由
 * 处理 AI 相关的 API 请求
 */

import Router from '@koa/router'
import { streamChat, type ChatMessage } from '../services/ai.js'
import { validateAIConfig } from '../config/ai.js'

const router = new Router({
  prefix: '/api/ai',
})

/**
 * 备用方案：从 AI 文本中提取修改建议
 * 当 JSON 解析失败时使用
 */
function extractChangesFromText(text: string, documentContent: string): {
  reasoning: string
  changes: Array<{ target: string; replacement: string; description?: string }>
} | null {
  console.log('🔍 开始备用解析...')
  
  // 尝试查找类似 "将 XXX 改为 YYY" 的模式
  const patterns = [
    /将\s*["'"]([^"'"]+)["'"]\s*改为\s*["'"]([^"'"]+)["'"]/g,
    /把\s*["'"]([^"'"]+)["'"]\s*改成\s*["'"]([^"'"]+)["'"]/g,
    /替换\s*["'"]([^"'"]+)["'"]\s*为\s*["'"]([^"'"]+)["'"]/g,
    /修改\s*["'"]([^"'"]+)["'"]\s*为\s*["'"]([^"'"]+)["'"]/g,
  ]
  
  const changes: Array<{ target: string; replacement: string; description?: string }> = []
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const target = match[1].trim()
      const replacement = match[2].trim()
      
      // 直接在文档中查找目标文本
      if (documentContent.includes(target)) {
        changes.push({
          target,
          replacement,
          description: `修改: ${target} → ${replacement}`,
        })
        
        console.log(`✅ 提取到修改: "${target}" → "${replacement}"`)
      } else {
        console.log(`⚠️ 文档中未找到: "${target}"`)
      }
    }
  }
  
  if (changes.length > 0) {
    return {
      reasoning: '从文本中提取的修改建议',
      changes,
    }
  }
  
  console.log('❌ 备用解析未找到任何修改')
  return null
}

/**
 * POST /api/ai/chat
 * 发送聊天消息（流式响应）
 */
router.post('/chat', async (ctx) => {
  // 验证 AI 配置
  if (!validateAIConfig()) {
    ctx.status = 503
    ctx.body = {
      success: false,
      message: 'AI 服务未配置',
    }
    return
  }

  const { messages, model, temperature, maxTokens } = ctx.request.body as {
    messages: ChatMessage[]
    model?: string
    temperature?: number
    maxTokens?: number
  }

  // 验证请求参数
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '缺少 messages 参数',
    }
    return
  }

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
  })

  ctx.status = 200

  let hasError = false

  try {
    // 流式响应
    const stream = streamChat({
      messages,
      model,  // 传递模型选择
      temperature,
      maxTokens,
    })

    for await (const chunk of stream) {
      // chunk 已经是 JSON 字符串了，直接发送
      ctx.res.write(`data: ${chunk}\n\n`)
    }

    // 发送完成标记
    if (!hasError) {
      ctx.res.write(`data: [DONE]\n\n`)
    }
  } catch (error: any) {
    hasError = true
    console.error('AI 聊天错误:', error)
    
    // 发送友好的错误信息
    const errorMessage = error.message || '生成失败，请重试'
    ctx.res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
  } finally {
    ctx.res.end()
  }
})

/**
 * GET /api/ai/models
 * 获取可用的模型列表
 */
router.get('/models', async (ctx) => {
  ctx.body = {
    success: true,
    data: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: '通用对话模型',
      },
    ],
  }
})

/**
 * POST /api/ai/command
 * AI 快捷指令
 */
router.post('/command', async (ctx) => {
  // 验证 AI 配置
  if (!validateAIConfig()) {
    ctx.status = 503
    ctx.body = {
      success: false,
      message: 'AI 服务未配置',
    }
    return
  }

  const { type, context, userInput, model = 'deepseek-chat' } = ctx.request.body as {
    type: string
    context: {
      selectedText: string
      beforeText: string
      afterText: string
    }
    userInput?: string
    model?: string
  }

  // 验证参数
  if (!type || !context) {
    ctx.status = 400
    ctx.body = { error: '缺少必要参数' }
    return
  }

  // 构建 Prompt
  let systemPrompt = ''
  let userPrompt = ''

  switch (type) {
    case 'rewrite':
      systemPrompt = '你是一个专业的文字编辑助手。请根据用户的要求改写选中的文本，保持原意但优化表达。只返回改写后的文本，不要添加任何解释或说明。'
      userPrompt = `请改写以下文本：\n\n${context.selectedText}\n\n`
      if (userInput) {
        userPrompt += `用户要求：${userInput}`
      }
      break

    case 'continue':
      systemPrompt = '你是一个专业的写作助手。请根据上文内容自然地续写，保持风格和语气一致。只返回续写的内容，不要重复上文。'
      userPrompt = `上文内容：\n${context.beforeText}\n\n请继续写作。`
      break

    case 'expand':
      systemPrompt = '你是一个专业的写作助手。请将选中的文本详细展开，增加细节和说明。只返回展开后的文本，不要添加任何解释。'
      userPrompt = `请详细展开以下文本：\n\n${context.selectedText}`
      break

    case 'summarize':
      systemPrompt = '你是一个专业的文本总结助手。请简洁准确地总结选中的文本。只返回总结内容，不要添加"总结："等前缀。'
      userPrompt = `请总结以下文本：\n\n${context.selectedText}`
      break

    case 'translate':
      systemPrompt = '你是一个专业的翻译助手。请检测文本语言，如果是中文则翻译成英文，如果是英文则翻译成中文。只返回翻译结果，不要添加任何解释。'
      userPrompt = `请翻译以下文本：\n\n${context.selectedText}`
      break

    default:
      ctx.status = 400
      ctx.body = { error: '不支持的指令类型' }
      return
  }

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  ctx.status = 200

  let hasError = false

  try {
    // 调用 AI 服务
    const stream = streamChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
    })

    for await (const chunk of stream) {
      ctx.res.write(`data: ${chunk}\n\n`)
    }

    if (!hasError) {
      ctx.res.write(`data: [DONE]\n\n`)
    }
  } catch (error: any) {
    hasError = true
    console.error('AI 指令错误:', error)
    const errorMessage = error.message || '指令执行失败，请重试'
    ctx.res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
  } finally {
    ctx.res.end()
  }
})

/**
 * POST /api/ai/edit
 * AI 对话式文档编辑
 * 返回结构化的修改建议
 */
router.post('/edit', async (ctx) => {
  // 验证 AI 配置
  if (!validateAIConfig()) {
    ctx.status = 503
    ctx.body = {
      success: false,
      message: 'AI 服务未配置',
    }
    return
  }

  const { documentContent, userRequest, model = 'deepseek-chat' } = ctx.request.body as {
    documentContent: string
    userRequest: string
    model?: string
  }

  // 验证参数
  if (!documentContent || !userRequest) {
    ctx.status = 400
    ctx.body = { error: '缺少必要参数' }
    return
  }
  
  // 清理 documentContent 中的常见 Markdown 格式标记
  // 这样可以避免复制粘贴时带上格式导致匹配失败
  const cleanDocumentContent = documentContent
    // 移除列表标记（有序列表）
    .replace(/^\d+\.\s+/gm, '')
    // 移除列表标记（无序列表）
    .replace(/^[-*+]\s+/gm, '')
    // 移除标题标记
    .replace(/^#{1,6}\s+/gm, '')
    // 移除引用标记
    .replace(/^>\s+/gm, '')
    // 移除多余的空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  console.log('📄 原始文档内容（前200字符）:', documentContent.substring(0, 200))
  console.log('🧹 清理后内容（前200字符）:', cleanDocumentContent.substring(0, 200))

  // 构建 Prompt - 强调只返回最相关的一个修改
  const systemPrompt = `你是一个专业的文档编辑助手。用户会告诉你要修改文档的哪些部分。

【重要】你必须仔细分析用户意图，只返回用户真正想修改的那一个位置。

【输出格式】你必须返回以下 JSON 格式，不要返回其他任何内容：
\`\`\`json
{
  "reasoning": "你的分析：用户想修改哪里，为什么是这个位置",
  "changes": [
    {
      "contextBefore": "目标文本前面的文字（5-15个字符）",
      "targetText": "要替换的原文（必须精确匹配，不要多字也不要少字）",
      "contextAfter": "目标文本后面的文字（5-15个字符）",
      "replacement": "替换后的文本",
      "description": "修改说明"
    }
  ]
}
\`\`\`

【关键规则】：
1. **targetText 必须精确**：
   - 只包含要替换的文本，不要多字也不要少字
   - 不要包含前后的标点符号（除非用户明确要求）
   - 不要包含前后的空格
   - 例如：用户说"把技术栈介绍改为xxx"，targetText 应该是 "技术栈介绍"，而不是 "## 技术栈介绍" 或 "技术栈介绍\n"

2. **contextBefore 和 contextAfter 要足够长**：
   - 至少 5 个字符，最多 15 个字符
   - 用于唯一确定位置
   - 不要包含换行符

3. **仔细分析用户意图**：
   - 理解用户想修改哪一个位置
   - 如果文档中有多个相同的文本，选择最符合用户意图的那一个
   - 通常用户指的是标题、章节名等重要位置

4. **只返回一个修改**：
   - 不要返回多个修改
   - 选择最相关的那一个

5. **必须返回有效的 JSON 格式**：
   - 可以用 \`\`\`json 包裹
   - 不要只返回思考过程，必须包含 changes 数组

示例 1：
用户："把基础入门改为零基础入门学习"
文档："第一阶段：基础入门（1-2个月）"

返回：
\`\`\`json
{
  "reasoning":"用户想修改'基础入门'这个词",
  "changes":[{
    "contextBefore":"第一阶段：",
    "targetText":"基础入门",
    "contextAfter":"（1-2个月）",
    "replacement":"零基础入门学习",
    "description":"修改阶段名称"
  }]
}
\`\`\`

示例 2：
用户："把技术栈介绍改为技术架构说明"
文档："## 技术栈介绍\n\n本项目使用..."

返回：
\`\`\`json
{
  "reasoning":"用户想修改标题'技术栈介绍'",
  "changes":[{
    "contextBefore":"## ",
    "targetText":"技术栈介绍",
    "contextAfter":"\n\n本项目使用",
    "replacement":"技术架构说明",
    "description":"修改标题"
  }]
}
\`\`\`

【再次强调】：
- targetText 必须精确，不要多字也不要少字
- 只返回完整的 JSON
- 只返回一个修改
- 不要只输出思考过程`

  const userPrompt = `文档内容：
${cleanDocumentContent}

用户需求：${userRequest}

请返回 JSON 格式的修改建议。`

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  ctx.status = 200

  let hasError = false
  let accumulatedContent = ''

  try {
    // 调用 AI 服务
    const stream = streamChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
    })

    for await (const chunk of stream) {
      const parsed = JSON.parse(chunk)
      
      // 累积所有内容用于最后解析 JSON
      // 注意：reasoning 是思考过程，content 是正文
      // 我们需要累积 content 部分来提取 JSON
      if (parsed.type === 'reasoning') {
        // 思考过程，转发但不累积（因为不包含 JSON）
        ctx.res.write(`data: ${chunk}\n\n`)
      } else if (parsed.type === 'content') {
        // 正文内容，累积并转发
        accumulatedContent += parsed.content
        ctx.res.write(`data: ${chunk}\n\n`)
      } else {
        // 其他类型，直接转发
        ctx.res.write(`data: ${chunk}\n\n`)
      }
    }
    
    console.log('📊 累积内容统计:')
    console.log('  - 总长度:', accumulatedContent.length)
    console.log('  - 前100字符:', accumulatedContent.substring(0, 100))
    console.log('  - 后100字符:', accumulatedContent.substring(Math.max(0, accumulatedContent.length - 100)))

    // 尝试解析累积的内容为 JSON
    try {
      // 提取 JSON（可能被包裹在 markdown 代码块中）
      let jsonStr = accumulatedContent.trim()
      
      if (jsonStr.length === 0) {
        console.error('❌ 累积内容为空，AI 可能只返回了思考过程')
        throw new Error('AI 未返回有效的修改建议')
      }
      
      console.log('🔍 尝试解析 AI 返回内容')
      console.log('原始内容长度:', jsonStr.length)
      console.log('原始内容前200字符:', jsonStr.substring(0, 200))
      
      // 移除可能的 markdown 代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        console.log('✂️ 移除了 ```json 标记')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
        console.log('✂️ 移除了 ``` 标记')
      }
      
      // 尝试查找 JSON 对象
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
        console.log('✂️ 提取了 JSON 对象')
      }
      
      console.log('处理后内容长度:', jsonStr.length)
      console.log('处理后内容:', jsonStr.substring(0, 500))
      
      const result = JSON.parse(jsonStr)
      console.log('✅ JSON 解析成功')
      
      // 验证结果格式
      if (result.changes && Array.isArray(result.changes)) {
        console.log(`📊 找到 ${result.changes.length} 个修改建议`)
        
        // 只取第一个修改建议
        const firstChange = result.changes[0]
        console.log('📝 第一个修改:', JSON.stringify(firstChange, null, 2))
        
        // 暂时先不做流式输出，直接返回完整数据
        // 后续可以优化为流式输出
        ctx.res.write(`data: ${JSON.stringify({
          type: 'structured',
          content: result,
        })}\n\n`)
        
        console.log('✅ 已发送结构化数据')
      } else {
        console.warn('⚠️ JSON 格式不正确，缺少 changes 数组')
      }
    } catch (parseError) {
      console.error('❌ 解析 JSON 失败:', parseError)
      console.error('累积内容:', accumulatedContent.substring(0, 500))
      
      // 尝试备用方案：从文本中提取修改信息
      console.log('🔄 尝试备用解析方案...')
      try {
        const backupResult = extractChangesFromText(accumulatedContent, cleanDocumentContent)
        if (backupResult && backupResult.changes.length > 0) {
          console.log('✅ 备用方案成功，提取到修改建议')
          ctx.res.write(`data: ${JSON.stringify({
            type: 'structured',
            content: backupResult,
          })}\n\n`)
        }
      } catch (backupError) {
        console.error('❌ 备用方案也失败了:', backupError)
      }
    }

    if (!hasError) {
      ctx.res.write(`data: [DONE]\n\n`)
    }
  } catch (error: any) {
    hasError = true
    console.error('AI 编辑错误:', error)
    const errorMessage = error.message || '编辑失败，请重试'
    ctx.res.write(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`)
  } finally {
    ctx.res.end()
  }
})

/**
 * POST /api/ai/generate-outline
 * 生成文档大纲
 */
router.post('/generate-outline', async (ctx) => {
  // 验证 AI 配置
  if (!validateAIConfig()) {
    ctx.status = 503
    ctx.body = {
      success: false,
      message: 'AI 服务未配置',
    }
    return
  }

  const { documentId, prompt, model = 'deepseek-chat' } = ctx.request.body as {
    documentId: number
    prompt: string
    model?: string
  }

  // 验证参数
  if (!documentId || !prompt) {
    ctx.status = 400
    ctx.body = { error: '缺少必要参数' }
    return
  }

  // 构建 Prompt - 针对 Reasoner 模型优化
  const systemPrompt = `你是一个专业的文档大纲生成助手。

【工作流程】
1. 先分析用户需求，思考文档结构
2. 然后输出 JSON 格式的大纲

【大纲要求】
- 最多 2 层结构（主章节 + 子章节）
- 主章节 3-5 个
- 每个主章节的子章节 2-4 个
- 描述简短（10-20 字）

【输出格式】
\`\`\`json
{
  "title": "文档标题",
  "nodes": [
    {
      "id": "1",
      "title": "第一章",
      "description": "简短描述",
      "level": 0,
      "order": 0,
      "children": [
        {
          "id": "1-1",
          "title": "第一节",
          "description": "简短描述",
          "level": 1,
          "order": 0
        }
      ]
    }
  ]
}
\`\`\`

【重要】最终必须输出完整的 JSON 大纲。`

  const userPrompt = `请为以下需求生成文档大纲：

${prompt}

请返回 JSON 格式的大纲。`

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  ctx.status = 200

  let hasError = false

  try {
    console.log('🎯 开始生成大纲')
    console.log('  - 使用模型:', model)
    
    // 调用 AI 服务（支持思考过程）
    const stream = streamChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      maxTokens: 4000,
    })

    let accumulatedContent = ''
    let hasThinking = false

    for await (const chunk of stream) {
      const parsed = JSON.parse(chunk)
      
      // 转发思考过程
      if (parsed.type === 'reasoning') {
        hasThinking = true
        const thinkingData = JSON.stringify({
          type: 'thinking',
          data: { thinking: parsed.content }
        })
        ctx.res.write(`data: ${thinkingData}\n\n`)
      } else if (parsed.type === 'content') {
        // 累积正文内容
        accumulatedContent += parsed.content
      }
    }

    console.log('📊 流式传输结束')
    console.log('  - 是否有思考过程:', hasThinking)
    console.log('  - 累积内容长度:', accumulatedContent.length)
    console.log('  - 累积内容（完整）:')
    console.log(accumulatedContent)

    // 解析累积的内容为 JSON
    try {
      let jsonStr = accumulatedContent.trim()
      
      console.log('📊 累积内容统计:')
      console.log('  - 总长度:', jsonStr.length)
      console.log('  - 前200字符:', jsonStr.substring(0, 200))
      console.log('  - 后200字符:', jsonStr.substring(Math.max(0, jsonStr.length - 200)))
      
      if (jsonStr.length === 0) {
        console.error('❌ 累积内容为空，AI 可能只返回了思考过程')
        throw new Error('AI 未返回大纲内容，请重试')
      }
      
      // 移除可能的 markdown 代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        console.log('✂️ 移除了 ```json 标记')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
        console.log('✂️ 移除了 ``` 标记')
      }
      
      // 尝试查找 JSON 对象
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
        console.log('✂️ 提取了 JSON 对象')
      } else {
        console.error('❌ 未找到 JSON 对象')
        console.log('完整内容:', jsonStr)
        throw new Error('AI 返回的内容中未找到有效的 JSON 格式')
      }
      
      // 检查 JSON 是否完整（简单的括号匹配）
      const openBraces = (jsonStr.match(/\{/g) || []).length
      const closeBraces = (jsonStr.match(/\}/g) || []).length
      const openBrackets = (jsonStr.match(/\[/g) || []).length
      const closeBrackets = (jsonStr.match(/\]/g) || []).length
      
      console.log('🔍 JSON 结构检查:')
      console.log(`  - 大括号: ${openBraces} 开 / ${closeBraces} 闭`)
      console.log(`  - 方括号: ${openBrackets} 开 / ${closeBrackets} 闭`)
      
      if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
        console.error('❌ JSON 结构不完整')
        throw new Error(`AI 返回的 JSON 不完整（大括号: ${openBraces}/${closeBraces}, 方括号: ${openBrackets}/${closeBrackets}）。可能是生成被中断或超出 Token 限制。请尝试简化需求或重试。`)
      }
      
      console.log('🔍 准备解析的 JSON (前500字符):', jsonStr.substring(0, 500))
      
      const result = JSON.parse(jsonStr)
      console.log('✅ JSON 解析成功')
      
      // 验证结果格式
      if (result.nodes && Array.isArray(result.nodes)) {
        console.log(`📊 找到 ${result.nodes.length} 个大纲节点`)
        
        // 发送大纲数据
        ctx.res.write(`data: ${JSON.stringify({
          type: 'outline',
          data: { outline: result }
        })}\n\n`)
        
        console.log('✅ 已发送大纲数据')
      } else {
        console.warn('⚠️ JSON 格式不正确，缺少 nodes 数组')
        console.log('解析结果:', JSON.stringify(result, null, 2))
        throw new Error('大纲格式不正确，缺少 nodes 数组')
      }
    } catch (parseError) {
      console.error('❌ 解析大纲 JSON 失败:', parseError)
      console.error('累积内容长度:', accumulatedContent.length)
      
      // 提取错误位置信息
      let errorDetails = '解析失败'
      if (parseError instanceof SyntaxError) {
        const match = parseError.message.match(/position (\d+)/)
        if (match) {
          const pos = parseInt(match[1])
          const start = Math.max(0, pos - 50)
          const end = Math.min(accumulatedContent.length, pos + 50)
          errorDetails = `错误位置: "${accumulatedContent.substring(start, end)}"`
          console.error('错误位置上下文:', accumulatedContent.substring(start, end))
        }
      }
      
      throw new Error(`解析大纲失败。${errorDetails}。请重试。`)
    }

    if (!hasError) {
      ctx.res.write(`data: ${JSON.stringify({ type: 'done', data: {} })}\n\n`)
    }
  } catch (error: any) {
    hasError = true
    console.error('生成大纲错误:', error)
    const errorMessage = error.message || '生成大纲失败，请重试'
    ctx.res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      data: { error: errorMessage } 
    })}\n\n`)
  } finally {
    ctx.res.end()
  }
})

/**
 * POST /api/ai/generate-from-outline
 * 基于大纲生成文档
 */
router.post('/generate-from-outline', async (ctx) => {
  // 验证 AI 配置
  if (!validateAIConfig()) {
    ctx.status = 503
    ctx.body = {
      success: false,
      message: 'AI 服务未配置',
    }
    return
  }

  const { documentId, outline, originalPrompt, model = 'deepseek-chat' } = ctx.request.body as {
    documentId: number
    outline: any[]
    originalPrompt: string
    model?: string
  }

  // 验证参数
  if (!documentId || !outline || !Array.isArray(outline)) {
    ctx.status = 400
    ctx.body = { error: '缺少必要参数' }
    return
  }

  // 将大纲转换为可读格式
  function formatOutlineToText(nodes: any[], level = 0): string {
    let text = ''
    for (const node of nodes) {
      const indent = '  '.repeat(level)
      text += `${indent}${level + 1}. ${node.title}\n`
      if (node.description) {
        text += `${indent}   ${node.description}\n`
      }
      if (node.children && node.children.length > 0) {
        text += formatOutlineToText(node.children, level + 1)
      }
    }
    return text
  }

  const outlineText = formatOutlineToText(outline)

  // 构建 Prompt
  const systemPrompt = `你是一个专业的文档写作助手。
根据提供的大纲，生成完整的文档内容。

【重要】直接输出 Markdown 格式的文档内容，不要使用代码块（```）包裹。

要求：
1. 严格按照大纲结构生成
2. 每个章节内容要充实、专业
3. 使用 Markdown 格式：
   - 一级标题使用 #
   - 二级标题使用 ##
   - 三级标题使用 ###
   - 列表使用 - 或 1. 2. 3.
   - 加粗使用 **文字**
4. 不要在开头或结尾添加 \`\`\`markdown 或 \`\`\` 标记
5. 直接输出文档内容即可`

  const userPrompt = `原始需求：${originalPrompt || '无'}

请根据以下大纲生成完整文档：

${outlineText}

请生成完整的 Markdown 格式文档内容。`

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  ctx.status = 200

  let hasError = false

  try {
    // 调用 AI 服务
    const stream = streamChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
    })

    for await (const chunk of stream) {
      const parsed = JSON.parse(chunk)
      
      // 只转发内容，不转发思考过程
      if (parsed.type === 'content') {
        ctx.res.write(`data: ${JSON.stringify({
          type: 'content',
          data: { content: parsed.content }
        })}\n\n`)
      }
    }

    if (!hasError) {
      ctx.res.write(`data: ${JSON.stringify({ type: 'done', data: {} })}\n\n`)
    }
  } catch (error: any) {
    hasError = true
    console.error('生成文档错误:', error)
    const errorMessage = error.message || '生成文档失败，请重试'
    ctx.res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      data: { error: errorMessage } 
    })}\n\n`)
  } finally {
    ctx.res.end()
  }
})

export default router
