/**
 * 文档相关类型定义
 */

// 文档数据结构
export interface Document {
  id: number
  title: string
  content: string
  content_preview?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// 文档列表查询参数
export interface DocumentListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// 分页信息
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 文档列表响应
export interface DocumentListResponse {
  list: Document[]
  pagination: Pagination
}

// 创建文档参数
export interface CreateDocumentDto {
  title?: string
  content?: string
  metadata?: Record<string, any>
}

// 更新文档参数
export interface UpdateDocumentDto {
  title?: string
  content?: string
  metadata?: Record<string, any>
}

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}
