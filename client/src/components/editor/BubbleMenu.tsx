/**
 * 浮动工具栏（选中文字时显示）
 */

import { TiptapBubbleMenu } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface BubbleMenuProps {
  editor: Editor
}

function BubbleMenu({ editor }: BubbleMenuProps) {
  if (!editor) {
    return null
  }

  return (
    <TiptapBubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: 'top', zIndex: 50 }}
      shouldShow={({ editor, state }) => {
        // 只在选中文本时显示
        const { from, to } = state.selection
        const isTextSelected = from !== to
        return isTextSelected
      }}
      className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-xl z-50"
    >
      {/* 加粗 */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded p-2 hover:bg-gray-100 ${
          editor.isActive('bold') ? 'bg-gray-100 text-primary-600' : 'text-gray-700'
        }`}
        title="加粗 (Ctrl+B)"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
          />
        </svg>
      </button>

      {/* 斜体 */}
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded p-2 hover:bg-gray-100 ${
          editor.isActive('italic') ? 'bg-gray-100 text-primary-600' : 'text-gray-700'
        }`}
        title="斜体 (Ctrl+I)"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 4h4M14 4l-4 16M10 20h4"
          />
        </svg>
      </button>

      {/* 删除线 */}
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`rounded p-2 hover:bg-gray-100 ${
          editor.isActive('strike') ? 'bg-gray-100 text-primary-600' : 'text-gray-700'
        }`}
        title="删除线"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12h18M9 5h6M9 19h6"
          />
        </svg>
      </button>

      {/* 行内代码 */}
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`rounded p-2 hover:bg-gray-100 ${
          editor.isActive('code') ? 'bg-gray-100 text-primary-600' : 'text-gray-700'
        }`}
        title="代码"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      </button>

      {/* 分隔线 */}
      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* 标题 */}
      <select
        onChange={(e) => {
          const level = parseInt(e.target.value)
          if (level === 0) {
            editor.chain().focus().setParagraph().run()
          } else {
            editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
          }
        }}
        value={
          editor.isActive('heading', { level: 1 }) ? 1 :
          editor.isActive('heading', { level: 2 }) ? 2 :
          editor.isActive('heading', { level: 3 }) ? 3 :
          editor.isActive('heading', { level: 4 }) ? 4 :
          editor.isActive('heading', { level: 5 }) ? 5 :
          editor.isActive('heading', { level: 6 }) ? 6 : 0
        }
        className="rounded border-0 bg-transparent px-2 py-1 text-sm hover:bg-gray-100 focus:outline-none"
      >
        <option value="0">正文</option>
        <option value="1">标题 1</option>
        <option value="2">标题 2</option>
        <option value="3">标题 3</option>
        <option value="4">标题 4</option>
        <option value="5">标题 5</option>
        <option value="6">标题 6</option>
      </select>
    </TiptapBubbleMenu>
  )
}

export default BubbleMenu
