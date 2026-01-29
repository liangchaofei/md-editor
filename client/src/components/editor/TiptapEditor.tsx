/**
 * Tiptap 富文本编辑器组件
 */

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import BubbleMenu from './BubbleMenu'
import MenuBar from './MenuBar'
import EditorStatusBar from './EditorStatusBar'
import { createYDoc, getYFragment } from '../../utils/yjs'
import type { Document } from '../../types/document'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
}

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // 为每个文档创建独立的 Y.Doc
  const ydoc = useMemo(() => createYDoc(document.id.toString()), [document.id])
  
  // 创建 UndoManager
  const undoManager = useMemo(() => {
    const fragment = getYFragment(ydoc)
    return new Y.UndoManager(fragment)
  }, [ydoc])
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-ignore - history 配置在运行时是有效的
        history: false, // 禁用内置的 History 扩展
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Collaboration.configure({
        fragment: getYFragment(ydoc),
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
  }, [document.id]) // 当文档 ID 变化时重新创建编辑器
  
  // 添加自定义的 undo/redo 命令
  useEffect(() => {
    if (!editor) return
    
    // 覆盖默认的 undo 命令
    editor.commands.undo = () => {
      undoManager.undo()
      return true
    }
    
    // 覆盖默认的 redo 命令
    editor.commands.redo = () => {
      undoManager.redo()
      return true
    }
    
    // 覆盖 can() 方法
    const originalCan = editor.can.bind(editor)
    editor.can = () => {
      const canChain = originalCan()
      return {
        ...canChain,
        undo: () => undoManager.canUndo(),
        redo: () => undoManager.canRedo(),
      }
    }
  }, [editor, undoManager])

  // 当文档切换时，从服务器加载内容并同步到 Y.Doc
  useEffect(() => {
    if (!editor || !document.content) return

    // 检查 Y.Doc 是否为空
    const fragment = getYFragment(ydoc)
    const isEmpty = fragment.length === 0

    // 如果 Y.Doc 为空且服务器有内容，则加载服务器内容
    if (isEmpty && document.content && document.content !== '<p></p>') {
      editor.commands.setContent(document.content)
      console.log('📄 从服务器加载文档内容')
    }
  }, [document.id, document.content, editor, ydoc])

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
