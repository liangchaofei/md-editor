/**
 * 文档相关 API
 */

import request from './request'
import type {
  Document,
  DocumentListQuery,
  DocumentListResponse,
  CreateDocumentDto,
  UpdateDocumentDto,
  ApiResponse,
} from '../types/document'

/**
 * 获取文档列表
 */
export function getDocuments(params?: DocumentListQuery): Promise<ApiResponse<DocumentListResponse>> {
  return request.get('/api/documents', { params })
}

/**
 * 获取文档详情
 */
export function getDocument(id: number): Promise<ApiResponse<Document>> {
  return request.get(`/api/documents/${id}`)
}

/**
 * 创建文档
 */
export function createDocument(data: CreateDocumentDto): Promise<ApiResponse<Document>> {
  return request.post('/api/documents', data)
}

/**
 * 更新文档
 */
export function updateDocument(id: number, data: UpdateDocumentDto): Promise<ApiResponse<Document>> {
  return request.put(`/api/documents/${id}`, data)
}

/**
 * 删除文档
 */
export function deleteDocument(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/documents/${id}`)
}
