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
          
     
          
          if (parsed.error) {
            onError?.(parsed.error)
            return
          }
          
          // 处理思考过程
          if (parsed.type === 'reasoning' && parsed.content) {
            onReasoning?.(parsed.content)
          }
          // 处理正常内容
          else if (parsed.type === 'content' && parsed.content) {
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

/**
 * AI 快捷指令 API
 */
export async function executeAICommand(params: {
  type: string
  context: {
    selectedText: string
    beforeText: string
    afterText: string
  }
  userInput?: string
  model?: string
  signal?: AbortSignal  // 添加中断信号
  onReasoning?: (reasoning: string) => void
  onChunk?: (chunk: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}): Promise<void> {
  const {
    type,
    context,
    userInput,
    model = 'deepseek-chat',
    signal,  // 接收中断信号
    onReasoning,
    onChunk,
    onComplete,
    onError,
  } = params

  try {
    const response = await fetch('/api/ai/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        context,
        userInput,
        model,
      }),
      signal,  // 传递中断信号
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      // 检查是否已中断
      if (signal?.aborted) {
        reader.cancel()
        return
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue

        const data = line.slice(6)

        if (data === '[DONE]') {
          onComplete?.()
          return
        }

        try {
          const parsed = JSON.parse(data)

          if (parsed.type === 'reasoning' && onReasoning) {
            onReasoning(parsed.content)
          } else if (parsed.type === 'content' && onChunk) {
            onChunk(parsed.content)
          } else if (parsed.type === 'error') {
            throw new Error(parsed.content)
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e)
        }
      }
    }
  } catch (error) {
    // 如果是中断错误，不调用 onError
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('AI 指令已中断')
      return
    }
    console.error('AI 指令执行失败:', error)
    onError?.(error as Error)
  }
}

/**
 * AI 对话式文档编辑 API
 */
export async function executeAIEdit(params: {
  documentContent: string
  userRequest: string
  model?: string
  onReasoning?: (reasoning: string) => void
  onChunk?: (chunk: string) => void
  onStructured?: (data: {
    reasoning: string
    changes: Array<{
      contextBefore?: string
      targetText?: string
      contextAfter?: string
      searchKeywords?: string
      target?: string
      replacement?: string
      description?: string
    }>
  }) => void
  onReplacement?: (char: string) => void  // 新增：流式输出 replacement 文本
  onComplete?: () => void
  onError?: (error: Error) => void
}): Promise<void> {
  const {
    documentContent,
    userRequest,
    model = 'deepseek-chat',
    onReasoning,
    onChunk,
    onStructured,
    onReplacement,
    onComplete,
    onError,
  } = params

  try {
    const response = await fetch('/api/ai/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentContent,
        userRequest,
        model,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
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

        const data = line.slice(6)

        if (data === '[DONE]') {
          onComplete?.()
          return
        }

        try {
          const parsed = JSON.parse(data)


          if (parsed.type === 'reasoning' && onReasoning) {
            onReasoning(parsed.content)
          } else if (parsed.type === 'content' && onChunk) {
            onChunk(parsed.content)
          } else if (parsed.type === 'structured' && onStructured) {
            onStructured(parsed.content)
          } else if (parsed.type === 'replacement' && onReplacement) {
            onReplacement(parsed.content)
          } else if (parsed.type === 'error') {
            throw new Error(parsed.content)
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e)
        }
      }
    }
  } catch (error) {
    console.error('AI 编辑执行失败:', error)
    onError?.(error as Error)
  }
}
