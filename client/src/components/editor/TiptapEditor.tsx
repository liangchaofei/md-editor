/**
 * Tiptap 富文本编辑器组件
 */

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Document } from '../../types/document'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
}

function TiptapEditor({ document, onUpdate }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
    ],
    content: document.content,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate(html)
    },
  })

  // 当文档切换时更新编辑器内容
  useEffect(() => {
    if (editor && document.content !== editor.getHTML()) {
      editor.commands.setContent(document.content)
    }
  }, [document.id, document.content, editor])

  if (!editor) {
    return null
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
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            已保存
          </span>
        </div>
      </div>

      {/* 编辑器内容 */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapEditor
