/**
 * 固定工具栏（编辑器顶部）
 */

import { useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import type { AICommandType } from '../../types/aiCommand'
import ImageUpload from './ImageUpload'

interface MenuBarProps {
  editor: Editor
  onAICommand?: (type: AICommandType) => void
  isAIStreaming?: boolean  // 新增：是否正在 AI 流式输出
}

function MenuBar({ editor, onAICommand, isAIStreaming = false }: MenuBarProps) {
  // 使用节流优化重渲染
  const [, forceUpdate] = useState({})
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!editor) return

    const updateHandler = () => {
      // 如果正在 AI 流式输出，不更新工具栏
      if (isAIStreaming) return
      
      // 清除之前的定时器
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
      
      // 使用节流，避免频繁更新
      updateTimerRef.current = setTimeout(() => {
        forceUpdate({})
      }, 100) // 100ms 节流
    }

    // 只监听 selectionUpdate，不监听 transaction
    // transaction 在流式输出时会频繁触发
    editor.on('selectionUpdate', updateHandler)

    return () => {
      editor.off('selectionUpdate', updateHandler)
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [editor, isAIStreaming])  // 添加 isAIStreaming 到依赖

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
            !isAIStreaming && editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('strike') ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('code') ? 'bg-gray-200 text-primary-600' : ''
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
              !isAIStreaming && editor.isActive('heading', { level }) ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('blockquote') ? 'bg-gray-200 text-primary-600' : ''
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
            !isAIStreaming && editor.isActive('codeBlock') ? 'bg-gray-200 text-primary-600' : ''
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

      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* 高级功能 */}
      <div className="flex items-center gap-1">
        {/* 表格 */}
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            !isAIStreaming && editor.isActive('table') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="插入表格"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* 图片上传 */}
        <ImageUpload editor={editor} />

        {/* 任务列表 */}
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleTaskList().run()
          }}
          className={`rounded p-2 hover:bg-gray-200 ${
            !isAIStreaming && editor.isActive('taskList') ? 'bg-gray-200 text-primary-600' : ''
          }`}
          title="任务列表"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>
      </div>

      {onAICommand && (
        <>
          <div className="mx-1 h-6 w-px bg-gray-300" />

          {/* AI 续写按钮 */}
          <button
            onMouseDown={(e) => {
              e.preventDefault()
              onAICommand('continue')
            }}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
            title="AI 续写"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            续写
          </button>
        </>
      )}
    </div>
  )
}

export default MenuBar
