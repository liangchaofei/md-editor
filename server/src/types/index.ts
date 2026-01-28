/**
 * 通用类型定义
 */

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 文档类型
export interface Document {
  id: number
  title: string
  content: string
  yjs_state: Buffer | null
  metadata: string
  is_deleted: number
  created_at: string
  updated_at: string
}

// 创建文档 DTO
export interface CreateDocumentDto {
  title?: string
  content?: string
  metadata?: Record<string, any>
}

// 更新文档 DTO
export interface UpdateDocumentDto {
  title?: string
  content?: string
  yjs_state?: Buffer
  metadata?: Record<string, any>
}
