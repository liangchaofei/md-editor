/**
 * 消息类型定义
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export type MessageRole = Message['role']
