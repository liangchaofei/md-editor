/**
 * 编辑器状态栏
 */

import type { Editor } from '@tiptap/react'

interface EditorStatusBarProps {
  editor: Editor
  saveStatus: 'saved' | 'saving' | 'unsaved'
}

function EditorStatusBar({ editor, saveStatus }: EditorStatusBarProps) {
  // 计算字数
  const wordCount = editor.storage.characterCount?.words() || 0
  const charCount = editor.storage.characterCount?.characters() || 0

  // 保存状态文本和样式
  const saveStatusConfig = {
    saved: { text: '已保存', color: 'text-green-600' },
    saving: { text: '保存中...', color: 'text-blue-600' },
    unsaved: { text: '未保存', color: 'text-gray-400' },
  }

  const { text: saveText, color: saveColor } = saveStatusConfig[saveStatus]

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-8 py-2 text-sm text-gray-600">
      {/* 左侧：字数统计 */}
      <div className="flex items-center gap-4">
        <span>
          字数: <span className="font-medium">{wordCount}</span>
        </span>
        <span>
          字符: <span className="font-medium">{charCount}</span>
        </span>
      </div>

      {/* 右侧：保存状态 */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 ${saveColor}`}>
          {saveStatus === 'saving' && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          )}
          {saveStatus === 'saved' && (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          <span>{saveText}</span>
        </div>
      </div>
    </div>
  )
}

export default EditorStatusBar
