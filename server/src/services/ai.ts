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
  })
}

/**
 * 发送聊天请求（流式）
 */
export async function* streamChat(options: ChatOptions) {
  const { messages, temperature = 0.7, maxTokens = 2000 } = options
  const config = getAIConfig()
  const openai = createOpenAIClient()

  try {
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    console.error('AI 服务错误:', error)
    throw error
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
  } catch (error) {
    console.error('AI 服务错误:', error)
    throw error
  }
}
