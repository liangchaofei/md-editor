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
 * 根据模型自动选择 API 端点
 */
function createOpenAIClient(model: string) {
  const config = getAIConfig()
  
  // 根据模型选择 API 配置
  let apiKey = config.apiKey
  let baseURL = config.baseURL
  
  // Kimi (Moonshot) 模型
  if (model.startsWith('moonshot-')) {
    apiKey = process.env.MOONSHOT_API_KEY || config.apiKey
    baseURL = 'https://api.moonshot.cn/v1'
  }
  // DeepSeek 模型
  else if (model.startsWith('deepseek-')) {
    apiKey = process.env.DEEPSEEK_API_KEY || config.apiKey
    baseURL = 'https://api.deepseek.com'
  }
  
  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 120000,
    maxRetries: 3,
    fetch: (url, init) => {
      return fetch(url, {
        ...init,
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
  
  // 使用传入的模型，如果没有则使用配置的模型
  const selectedModel = model || config.model
  const openai = createOpenAIClient(selectedModel)

  try {
    const stream = await openai.chat.completions.create({
      model: selectedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    let chunkCount = 0
    let logFile = ''
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as any
      
      if (chunkCount < 3) {
        const chunkLog = JSON.stringify(chunk, null, 2)
        logFile += `\n=== Chunk ${chunkCount + 1} ===\n${chunkLog}\n`
      }
      
      // 处理思考过程（reasoning_content）- DeepSeek 特有
      if (delta?.reasoning_content) {
        chunkCount++
        yield JSON.stringify({
          type: 'reasoning',
          content: delta.reasoning_content,
        })
      }
      
      // 处理正常内容
      if (delta?.content) {
        chunkCount++
        yield JSON.stringify({
          type: 'content',
          content: delta.content,
        })
      }
    }
    
    if (logFile) {
    
    }

  } catch (error: any) {
    console.error('❌ AI 服务错误:', {
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type,
    })

    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error('网络连接失败，请检查网络或稍后重试')
    } else if (error.status === 401) {
      throw new Error('API Key 无效，请检查配置')
    } else if (error.status === 429) {
      throw new Error('请求过于频繁，请稍后重试')
    } else if (error.status === 500) {
      throw new Error('AI 服务器错误，请稍后重试')
    } else {
      throw new Error(error.message || 'AI 服务错误')
    }
  }
}

/**
 * 发送聊天请求（非流式）
 */
export async function chat(options: ChatOptions): Promise<string> {
  const { messages, model, temperature = 0.7, maxTokens = 2000 } = options
  const config = getAIConfig()
  const selectedModel = model || config.model
  const openai = createOpenAIClient(selectedModel)

  try {
    const response = await openai.chat.completions.create({
      model: selectedModel,
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
