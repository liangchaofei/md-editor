/**
 * 版本 API
 */

import request from './request'
import type { ApiResponse } from '../types/document'

export interface Version {
  id: number
  document_id: number
  content: string
  version_number: number
  description: string | null
  created_at: string
  content_size?: number
}

export interface VersionListResponse {
  versions: Version[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 获取文档版本列表
 */
export async function getVersions(documentId: number, page = 1, pageSize = 20): Promise<ApiResponse<VersionListResponse>> {
  return request.get(`/api/versions/${documentId}`, {
    params: { page, pageSize }
  })
}

/**
 * 获取指定版本内容
 */
export async function getVersion(documentId: number, versionId: number): Promise<ApiResponse<Version>> {
  return request.get(`/api/versions/${documentId}/${versionId}`)
}

/**
 * 创建新版本
 */
export async function createVersion(documentId: number, content: string, description?: string): Promise<ApiResponse<Version>> {
  return request.post(`/api/versions/${documentId}`, {
    content,
    description,
  })
}

/**
 * 恢复到指定版本
 */
export async function restoreVersion(documentId: number, versionId: number): Promise<ApiResponse<{ message: string }>> {
  return request.post(`/api/versions/${documentId}/${versionId}/restore`)
}

/**
 * 删除版本
 */
export async function deleteVersion(documentId: number, versionId: number): Promise<ApiResponse<{ message: string }>> {
  return request.delete(`/api/versions/${documentId}/${versionId}`)
}
