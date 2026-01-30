/**
 * AI API 客户端
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  model?: string  // 新增：模型选择
  temperature?: number
  maxTokens?: number
  onChunk?: (content: string) => void
  onReasoning?: (reasoning: string) => void
  onComplete?: () => void
  onError?: (error: string) => void
}

/**
 * 发送聊天消息（流式）
 */
export async function streamChatAPI(options: ChatOptions): Promise<void> {
  const { messages, model, temperature, maxTokens, onChunk, onReasoning, onComplete, onError } = options

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,  // 传递模型选择
        temperature,
        maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue

        const data = line.slice(6) // 移除 "data: " 前缀

        if (data === '[DONE]') {
          onComplete?.()
          return
        }

        try {
          const parsed = JSON.parse(data)
          
          // 调试日志
          console.log('📥 收到数据:', parsed)
          
          if (parsed.error) {
            onError?.(parsed.error)
            return
          }
          
          // 处理思考过程
          if (parsed.type === 'reasoning' && parsed.content) {
            console.log('💭 思考:', parsed.content)
            onReasoning?.(parsed.content)
          }
          // 处理正常内容
          else if (parsed.type === 'content' && parsed.content) {
            console.log('📝 正文:', parsed.content)
            onChunk?.(parsed.content)
          }
          // 兼容旧格式（直接返回 content）
          else if (parsed.content && !parsed.type) {
            onChunk?.(parsed.content)
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e, '原始数据:', data)
        }
      }
    }
  } catch (error) {
    console.error('AI 请求失败:', error)
    onError?.(error instanceof Error ? error.message : '请求失败')
  }
}

/**
 * 获取可用的模型列表
 */
export async function getModelsAPI() {
  const response = await fetch('/api/ai/models')
  const data = await response.json()
  return data.data
}
