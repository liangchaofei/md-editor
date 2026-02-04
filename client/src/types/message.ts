/**
 * 消息类型定义
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string  // 思考过程
  timestamp: number
  isStreaming?: boolean
  isGeneratingToEditor?: boolean  // 是否正在生成到编辑器
  stats?: {
    duration: number    // 耗时（秒）
    tokens: number      // Token 数量
    cost: number        // 费用（元）
  }
}

export type MessageRole = Message['role']
