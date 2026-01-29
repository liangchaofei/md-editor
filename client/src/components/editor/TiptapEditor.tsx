/**
 * Tiptap 富文本编辑器组件
 */

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import BubbleMenu from './BubbleMenu'
import MenuBar from './MenuBar'
import EditorStatusBar from './EditorStatusBar'
import type { Document } from '../../types/document'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
}

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: '开始输入内容...',
      }),
      CharacterCount,
    ],
    content: document.content || '<p></p>', // 确保至少有一个段落
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate(html)
    },
  }, []) // 添加空依赖数组，确保只初始化一次

  // 当文档切换时更新编辑器内容
  useEffect(() => {
    if (editor && document.content !== editor.getHTML()) {
      editor.commands.setContent(document.content)
    }
  }, [document.id, document.content, editor])

  if (!editor) {
    return <div className="flex h-full items-center justify-center">加载编辑器...</div>
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 文档标题 */}
      <div className="border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {document.title}
        </h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          <span>
            最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
          </span>
        </div>
      </div>

      {/* 固定工具栏 */}
      <MenuBar editor={editor} />

      {/* 浮动工具栏 */}
      <BubbleMenu editor={editor} />

      {/* 编辑器内容 */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* 状态栏 */}
      <EditorStatusBar editor={editor} saveStatus={saveStatus} />
    </div>
  )
}

export default TiptapEditor
