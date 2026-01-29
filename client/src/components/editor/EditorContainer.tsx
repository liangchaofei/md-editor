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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    <TiptapEditor
      document={currentDocument}
      onUpdate={handleContentUpdate}
      saveStatus={isSaving ? 'saving' : lastSaved ? 'saved' : 'unsaved'}
    />
  )
}

export default EditorContainer
