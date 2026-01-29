/**
 * 固定工具栏（编辑器顶部）
 */

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface MenuBarProps {
  editor: Editor
}

function MenuBar({ editor }: MenuBarProps) {
  // 强制组件在编辑器状态变化时重新渲染
  const [, forceUpdate] = useState({})

  useEffect(() => {
    if (!editor) return

    const updateHandler = () => {
      forceUpdate({})
    }

    editor.on('selectionUpdate', updateHandler)
    editor.on('transaction', updateHandler)

    return () => {
      editor.off('selectionUpdate', updateHandler)
      editor.off('transaction', updateHandler)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
      {/* 撤销/重做 */}
      <div className="flex items-center gap-1">
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().undo().run()
          }}
          disabled={!editor.can().undo()}
          className="rounded p-2 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title="撤销 (Ctrl+Z)"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().redo().run()
          }}
          disabled={!editor.can().redo()}
          className="rounded p-2 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
          title="重做 (Ctrl+Shift+Z)"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
            />
          </svg>
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* 文本格式 */}
      <div className="flex items-center gap-1">
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBold().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="加粗 (Ctrl+B)"
        >
          <svg className="h-4 w-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleItalic().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="斜体 (Ctrl+I)"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4M14 4l-4 16M10 20h4" />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleStrike().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('strike') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="删除线"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5h6M9 19h6" />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleCode().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('code') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="代码"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* 标题 */}
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
            }}
            className={`rounded px-3 py-2 text-sm font-semibold hover:bg-gray-200 ${
              editor.isActive('heading', { level }) ? 'bg-gray-200 text-primary-600' : ''
            }`}
            title={`标题 ${level}`}
          >
            H{level}
          </button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* 列表 */}
      <div className="flex items-center gap-1">
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBulletList().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="无序列表"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleOrderedList().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="有序列表"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01" />
          </svg>
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* 其他 */}
      <div className="flex items-center gap-1">
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            // 如果当前已经是引用，则取消引用；否则转换为引用
            editor.chain().focus().toggleBlockquote().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('blockquote') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="引用"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            // Insert 模式：插入新的代码块
            if (editor.isActive('codeBlock')) {
              // 如果已经在代码块中，退出代码块
              editor.chain().focus().toggleCodeBlock().run()
            } else {
              // 插入新的代码块
              editor.chain().focus().insertContent('<pre><code></code></pre>').run()
            }
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            editor.isActive('codeBlock') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="代码块"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            // Insert 模式：插入分隔线
            editor.chain().focus().setHorizontalRule().run()
          }}
          className="rounded p-2 hover:bg-gray-200"
          title="分隔线"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default MenuBar
