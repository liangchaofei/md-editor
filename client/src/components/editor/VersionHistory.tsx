/**
 * 版本历史组件（简化版）
 */

import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import { getVersions, createVersion, restoreVersion, type Version } from '../../api/version'

interface VersionHistoryProps {
  editor: Editor
  documentId: number
  isOpen: boolean
  onClose: () => void
}

function VersionHistory({ editor, documentId, isOpen, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // 加载版本列表
  const loadVersions = async () => {
    setLoading(true)
    try {
      const response = await getVersions(documentId)
      if (response.success && response.data) {
        setVersions(response.data.versions)
      }
    } catch (error) {
      console.error('加载版本失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 创建新版本
  const handleCreateVersion = async () => {
    const description = window.prompt('请输入版本说明（可选）:')
    if (description === null) return // 用户取消

    setCreating(true)
    try {
      const content = editor.getHTML()
      const response = await createVersion(documentId, content, description || undefined)
      if (response.success) {
        await loadVersions()
        alert('版本创建成功')
      }
    } catch (error) {
      console.error('创建版本失败:', error)
      alert('创建版本失败')
    } finally {
      setCreating(false)
    }
  }

  // 恢复版本
  const handleRestore = async (versionId: number) => {
    if (!confirm('确定要恢复到此版本吗？当前内容将被替换。')) {
      return
    }

    try {
      const response = await restoreVersion(documentId, versionId)
      if (response.success) {
        alert('版本恢复成功，请刷新页面查看')
        window.location.reload()
      }
    } catch (error) {
      console.error('恢复版本失败:', error)
      alert('恢复版本失败')
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [isOpen, documentId])

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* 侧边栏 */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">版本历史</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="p-4 border-b">
          <button
            onClick={handleCreateVersion}
            disabled={creating}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {creating ? '创建中...' : '创建新版本'}
          </button>
        </div>

        {/* 版本列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : versions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无版本历史</div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">
                        版本 #{version.version_number}
                      </div>
                      {version.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {version.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(version.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(version.id)}
                      className="ml-2 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      恢复
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default VersionHistory
