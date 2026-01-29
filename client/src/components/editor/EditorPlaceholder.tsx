/**
 * 编辑器占位组件
 * 在集成 Tiptap 之前的临时组件
 */

import React from 'react'
import { useDocumentStore } from '../../store/documentStore'

function EditorPlaceholder() {
  const { currentDocument } = useDocumentStore()

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
    <div className="flex h-full flex-col bg-white">
      {/* 文档标题区域 */}
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {currentDocument.title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          最后更新: {new Date(currentDocument.updated_at).toLocaleString('zh-CN')}
        </p>
      </div>

      {/* 编辑器区域（占位） */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* 内容预览 */}
          {currentDocument.content ? (
            <div className="prose prose-lg">
              <p className="whitespace-pre-wrap text-gray-700">
                {currentDocument.content}
              </p>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <p className="text-sm text-gray-500">
                  文档内容为空
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Tiptap 编辑器将在后续章节集成
                </p>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-8 rounded-lg bg-blue-50 p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 flex-shrink-0 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  编辑器功能即将推出
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    在 Chapter 8 中，我们将集成 Tiptap 富文本编辑器，实现：
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>富文本编辑功能</li>
                    <li>格式化工具栏</li>
                    <li>自动保存</li>
                    <li>实时协同编辑</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditorPlaceholder
