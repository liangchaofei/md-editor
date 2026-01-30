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

export default router
