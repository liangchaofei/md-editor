/**
 * 编辑器容器组件
 * 处理自动保存逻辑
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import TiptapEditor from './TiptapEditor'

function EditorContainer() {
  const { currentDocument, updateDocument } = useDocumentStore()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 自动保存函数（防抖）
  const handleContentUpdate = useCallback(
    (content: string) => {
      if (!currentDocument) return

      // 清除之前的定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // 设置新的定时器（2秒后保存）
      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true)
        try {
          await updateDocument(currentDocument.id, { content })
          setLastSaved(new Date())
        } catch (error) {
          console.error('保存失败:', error)
        } finally {
          setIsSaving(false)
        }
      }, 2000)
    },
    [currentDocument, updateDocument]
  )

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  if (!currentDocument) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            选择或创建一个文档
          </h3>
          <p className="text-sm text-gray-500">
            从左侧列表选择文档，或点击"新建文档"按钮开始编辑
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* 保存状态指示器 */}
      <div className="absolute right-4 top-4 z-10">
        {isSaving ? (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            保存中...
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            已保存
          </div>
        ) : null}
      </div>

      {/* 编辑器 */}
      <TiptapEditor
        document={currentDocument}
        onUpdate={handleContentUpdate}
      />
    </div>
  )
}

export default EditorContainer
