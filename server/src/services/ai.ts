/**
 * AI 服务
 * 使用 OpenAI SDK 调用 DeepSeek API
 */

import OpenAI from 'openai'
import { getAIConfig } from '../config/ai.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  model?: string  // 模型选择
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * 创建 OpenAI 客户端
 */
function createOpenAIClient() {
  const config = getAIConfig()
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 120000, // 120 秒超时（增加到 2 分钟）
    maxRetries: 3,   // 最多重试 3 次
    // 添加自定义 fetch 配置
    fetch: (url, init) => {
      return fetch(url, {
        ...init,
        // 添加 keepalive
        keepalive: true,
      })
    },
  })
}

/**
 * 发送聊天请求（流式）
 */
export async function* streamChat(options: ChatOptions) {
  const { messages, model, temperature = 0.7, maxTokens = 2000 } = options
  const config = getAIConfig()
  const openai = createOpenAIClient()
  
  // 使用传入的模型，如果没有则使用配置的模型
  const selectedModel = model || config.model

  try {
    console.log('🤖 开始 AI 请求:', {
      model: selectedModel,
      messageCount: messages.length,
      temperature,
      maxTokens,
    })

    const stream = await openai.chat.completions.create({
      model: selectedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    let chunkCount = 0
    let logFile = ''  // 用于收集日志
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as any  // 使用 any 类型以支持 DeepSeek 的扩展字段
      
      // 只记录前3个 chunk 的详细信息
      if (chunkCount < 3) {
        const chunkLog = JSON.stringify(chunk, null, 2)
        logFile += `\n=== Chunk ${chunkCount + 1} ===\n${chunkLog}\n`
        console.log(`📦 Chunk ${chunkCount + 1}:`, chunkLog)
      }
      
      // 处理思考过程（reasoning_content）
      if (delta?.reasoning_content) {
        chunkCount++
        console.log('💭 [思考]:', delta.reasoning_content.substring(0, 50))
        yield JSON.stringify({
          type: 'reasoning',
          content: delta.reasoning_content,
        })
      }
      
      // 处理正常内容
      if (delta?.content) {
        chunkCount++
        console.log('📝 [正文]:', delta.content)
        yield JSON.stringify({
          type: 'content',
          content: delta.content,
        })
      }
    }
    
    // 输出日志摘要
    if (logFile) {
      console.log('\n' + '='.repeat(50))
      console.log('前3个 chunk 的完整结构已记录在上方')
      console.log('='.repeat(50) + '\n')
    }

    console.log('✅ AI 请求完成，共生成', chunkCount, '个 chunk')
  } catch (error: any) {
    console.error('❌ AI 服务错误:', {
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type,
    })

    // 提供更友好的错误信息
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error('网络连接失败，请检查网络或稍后重试')
    } else if (error.status === 401) {
      throw new Error('API Key 无效，请检查配置')
    } else if (error.status === 429) {
      throw new Error('请求过于频繁，请稍后重试')
    } else if (error.status === 500) {
      throw new Error('DeepSeek 服务器错误，请稍后重试')
    } else {
      throw new Error(error.message || 'AI 服务错误')
    }
  }
}

/**
 * 发送聊天请求（非流式）
 */
export async function chat(options: ChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens = 2000 } = options
  const config = getAIConfig()
  const openai = createOpenAIClient()

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error: any) {
    console.error('❌ AI 服务错误:', error)
    throw error
  }
}
