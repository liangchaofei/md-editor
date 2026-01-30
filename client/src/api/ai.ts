/**
 * AI API 客户端
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  onChunk?: (content: string) => void
  onComplete?: () => void
  onError?: (error: string) => void
}

/**
 * 发送聊天消息（流式）
 */
export async function streamChatAPI(options: ChatOptions): Promise<void> {
  const { messages, temperature, maxTokens, onChunk, onComplete, onError } = options

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
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
          if (parsed.error) {
            onError?.(parsed.error)
            return
          }
          if (parsed.content) {
            onChunk?.(parsed.content)
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e)
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
