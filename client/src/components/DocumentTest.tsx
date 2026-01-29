/**
 * 文档功能测试组件
 * 用于验证 API 和 Store 是否正常工作
 */

import React, { useEffect } from 'react'
import { useDocumentStore } from '../store/documentStore'

function DocumentTest() {
  const {
    documents,
    currentDocument,
    loading,
    error,
    pagination,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    fetchDocument,
  } = useDocumentStore()

  // 组件挂载时获取文档列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 创建测试文档
  const handleCreate = async () => {
    const doc = await createDocument({
      title: `测试文档 ${Date.now()}`,
      content: '这是测试内容',
    })
    if (doc) {
      alert(`文档创建成功！ID: ${doc.id}`)
    }
  }

  // 更新文档
  const handleUpdate = async (id: number) => {
    await updateDocument(id, {
      title: `更新后的标题 ${Date.now()}`,
    })
    alert('文档更新成功！')
  }

  // 删除文档
  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个文档吗？')) {
      await deleteDocument(id)
      alert('文档删除成功！')
    }
  }

  // 查看详情
  const handleView = async (id: number) => {
    await fetchDocument(id)
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">文档功能测试</h1>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          错误: {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="mb-4 text-gray-600">加载中...</div>
      )}

      {/* 操作按钮 */}
      <div className="mb-6">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          创建测试文档
        </button>
      </div>

      {/* 分页信息 */}
      {pagination && (
        <div className="mb-4 text-sm text-gray-600">
          共 {pagination.total} 个文档，第 {pagination.page} / {pagination.totalPages} 页
        </div>
      )}

      {/* 文档列表 */}
      <div className="space-y-4">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{doc.title}</h3>
                <p className="text-sm text-gray-500">
                  ID: {doc.id} | 更新时间: {new Date(doc.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(doc.id)}
                  className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                >
                  查看
                </button>
                <button
                  onClick={() => handleUpdate(doc.id)}
                  className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                >
                  更新
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                >
                  删除
                </button>
              </div>
            </div>
            {doc.content_preview && (
              <p className="text-sm text-gray-600">{doc.content_preview}</p>
            )}
          </div>
        ))}

        {documents.length === 0 && !loading && (
          <div className="py-8 text-center text-gray-500">
            暂无文档，点击上方按钮创建测试文档
          </div>
        )}
      </div>

      {/* 当前文档详情 */}
      {currentDocument && (
        <div className="mt-8 rounded-lg border-2 border-blue-500 p-4">
          <h2 className="mb-4 text-xl font-bold">当前文档详情</h2>
          <div className="space-y-2">
            <p><strong>ID:</strong> {currentDocument.id}</p>
            <p><strong>标题:</strong> {currentDocument.title}</p>
            <p><strong>内容:</strong> {currentDocument.content}</p>
            <p><strong>创建时间:</strong> {new Date(currentDocument.created_at).toLocaleString()}</p>
            <p><strong>更新时间:</strong> {new Date(currentDocument.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentTest
