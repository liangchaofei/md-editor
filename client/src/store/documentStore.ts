/**
 * 文档状态管理 Store
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Document, DocumentListQuery, Pagination } from '../types/document'
import * as documentApi from '../api/document'

interface DocumentState {
  // 状态
  documents: Document[]
  currentDocument: Document | null
  pagination: Pagination | null
  loading: boolean
  error: string | null

  // 查询参数
  query: DocumentListQuery

  // Actions
  fetchDocuments: (query?: DocumentListQuery) => Promise<void>
  fetchDocument: (id: number) => Promise<void>
  createDocument: (data: { title?: string; content?: string }) => Promise<Document | null>
  updateDocument: (id: number, data: { title?: string; content?: string }) => Promise<void>
  deleteDocument: (id: number) => Promise<void>
  setCurrentDocument: (document: Document | null) => void
  setQuery: (query: Partial<DocumentListQuery>) => void
  clearError: () => void
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      documents: [],
      currentDocument: null,
      pagination: null,
      loading: false,
      error: null,
      query: {
        page: 1,
        pageSize: 20,
        keyword: '',
        sortBy: 'updated_at',
        sortOrder: 'DESC',
      },

      // 获取文档列表
      fetchDocuments: async (query?: DocumentListQuery) => {
        set({ loading: true, error: null })

        try {
          const finalQuery = query || get().query
          const response = await documentApi.getDocuments(finalQuery)

          if (response.success && response.data) {
            set({
              documents: response.data.list,
              pagination: response.data.pagination,
              query: finalQuery,
              loading: false,
            })
          } else {
            throw new Error(response.message || '获取文档列表失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '获取文档列表失败',
            loading: false,
          })
          console.error('获取文档列表失败:', err)
        }
      },

      // 获取文档详情
      fetchDocument: async (id: number) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.getDocument(id)

          if (response.success && response.data) {
            set({
              currentDocument: response.data,
              loading: false,
            })
          } else {
            throw new Error(response.message || '获取文档详情失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '获取文档详情失败',
            loading: false,
          })
          console.error('获取文档详情失败:', err)
        }
      },

      // 创建文档
      createDocument: async (data) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.createDocument(data)

          if (response.success && response.data) {
            // 重新获取文档列表
            await get().fetchDocuments()

            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || '创建文档失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '创建文档失败',
            loading: false,
          })
          console.error('创建文档失败:', err)
          return null
        }
      },

      // 更新文档
      updateDocument: async (id, data) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.updateDocument(id, data)

          if (response.success && response.data) {
            // 更新列表中的文档
            set(state => ({
              documents: state.documents.map(doc =>
                doc.id === id ? response.data! : doc
              ),
              currentDocument:
                state.currentDocument?.id === id
                  ? response.data!
                  : state.currentDocument,
              loading: false,
            }))
          } else {
            throw new Error(response.message || '更新文档失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '更新文档失败',
            loading: false,
          })
          console.error('更新文档失败:', err)
        }
      },

      // 删除文档
      deleteDocument: async (id) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.deleteDocument(id)

          if (response.success) {
            // 从列表中移除文档
            set(state => ({
              documents: state.documents.filter(doc => doc.id !== id),
              currentDocument:
                state.currentDocument?.id === id ? null : state.currentDocument,
              loading: false,
            }))
          } else {
            throw new Error(response.message || '删除文档失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '删除文档失败',
            loading: false,
          })
          console.error('删除文档失败:', err)
        }
      },

      // 设置当前文档
      setCurrentDocument: (document) => {
        set({ currentDocument: document })
      },

      // 设置查询参数
      setQuery: (query) => {
        set(state => ({
          query: { ...state.query, ...query },
        }))
      },

      // 清除错误
      clearError: () => {
        set({ error: null })
      },
    }),
    { name: 'DocumentStore' }
  )
)
