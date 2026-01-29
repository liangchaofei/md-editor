/**
 * 导出菜单组件
 */

import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import {
  exportAsMarkdown,
  exportAsHTML,
  exportAsText,
  copyAsRichText,
  copyAsText,
  printDocument,
} from '../../utils/export'

interface ExportMenuProps {
  editor: Editor
  documentTitle: string
}

function ExportMenu({ editor, documentTitle }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const handleExportMarkdown = () => {
    exportAsMarkdown(editor, `${documentTitle}.md`)
    setIsOpen(false)
  }

  const handleExportHTML = () => {
    exportAsHTML(editor, `${documentTitle}.html`)
    setIsOpen(false)
  }

  const handleExportText = () => {
    exportAsText(editor, `${documentTitle}.txt`)
    setIsOpen(false)
  }

  const handleCopyRichText = async () => {
    const success = await copyAsRichText(editor)
    if (success) {
      setCopySuccess('富文本已复制到剪贴板')
      setTimeout(() => setCopySuccess(null), 2000)
    }
    setIsOpen(false)
  }

  const handleCopyText = async () => {
    const success = await copyAsText(editor)
    if (success) {
      setCopySuccess('纯文本已复制到剪贴板')
      setTimeout(() => setCopySuccess(null), 2000)
    }
    setIsOpen(false)
  }

  const handlePrint = () => {
    printDocument(editor)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* 导出按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        导出
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 菜单内容 */}
          <div className="absolute right-0 z-20 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200">
            <div className="py-1">
              {/* 导出为文件 */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                导出为文件
              </div>
              
              <button
                onClick={handleExportMarkdown}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📝</span>
                Markdown (.md)
              </button>

              <button
                onClick={handleExportHTML}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">🌐</span>
                HTML (.html)
              </button>

              <button
                onClick={handleExportText}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📄</span>
                纯文本 (.txt)
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* 复制到剪贴板 */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                复制到剪贴板
              </div>

              <button
                onClick={handleCopyRichText}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📋</span>
                复制富文本
              </button>

              <button
                onClick={handleCopyText}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📝</span>
                复制纯文本
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* 打印 */}
              <button
                onClick={handlePrint}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">🖨️</span>
                打印文档
              </button>
            </div>
          </div>
        </>
      )}

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-green-500 text-white rounded-md shadow-lg">
          {copySuccess}
        </div>
      )}
    </div>
  )
}

export default ExportMenu
