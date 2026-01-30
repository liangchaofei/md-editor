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

export default router
