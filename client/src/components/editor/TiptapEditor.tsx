/**
 * Tiptap 富文本编辑器组件
 */

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Collaboration from '@tiptap/extension-collaboration'
import { CustomCollaborationCursor } from '../../extensions/CustomCollaborationCursor'
import { CustomKeymap } from '../../extensions/CustomKeymap'
import { SlashCommands, slashCommandSuggestion } from '../../extensions/SlashCommands'
import BubbleMenu from './BubbleMenu'
import MenuBar from './MenuBar'
import EditorStatusBar from './EditorStatusBar'
import ConnectionStatus from './ConnectionStatus'
import OfflineBanner from './OfflineBanner'
import ReconnectingBanner from './ReconnectingBanner'
import OnlineUsers from './OnlineUsers'
import ExportMenu from './ExportMenu'
import { createYDoc, createHocuspocusProvider } from '../../utils/yjs'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import type { Document } from '../../types/document'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
}

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // 为每个文档创建独立的 Y.Doc 和 Provider
  const { ydoc, provider } = useMemo(() => {
    const doc = createYDoc(document.id.toString())
    const prov = createHocuspocusProvider(document.id.toString(), doc)
    return { ydoc: doc, provider: prov }
  }, [document.id])
  
  // 获取协同状态
  const { status } = useCollaborationStatus(provider)
  const isOffline = status === 'disconnected'
  const isReconnecting = status === 'connecting' && provider !== null
  
  // 清理 provider
  useEffect(() => {
    return () => {
      provider.destroy()
    }
  }, [provider])
  
  const editor = useEditor({
    extensions: [
      // StarterKit 包含基础扩展（不包括 History，因为 Collaboration 自带）
      StarterKit,
      Collaboration.configure({
        // 使用 fragment
        fragment: ydoc.getXmlFragment('default'),
      }),
      // 使用自定义的协作光标扩展
      CustomCollaborationCursor.configure({
        provider: provider,
        user: {
          name: 'Anonymous',
          color: '#000000',
        },
      }),
      // 自定义快捷键
      CustomKeymap,
      // 斜杠命令
      SlashCommands.configure({
        suggestion: slashCommandSuggestion,
      }),
      Placeholder.configure({
        placeholder: '开始输入内容... 输入 / 查看命令',
      }),
      CharacterCount,
    ],
    // 使用 Collaboration 时不设置初始内容，让 Y.js 管理
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate(html)
    },
  }, [document.id, ydoc, provider]) // 添加 provider 到依赖
  
  // 监听 provider 同步完成后，如果内容为空则从服务器加载
  useEffect(() => {
    if (!editor || !provider) return

    const handleSynced = ({ state }: { state: boolean }) => {
      if (!state) return

      // 同步完成后，检查内容是否为空
      const currentContent = editor.getHTML()
      const isEmpty = currentContent === '<p></p>' || currentContent === ''

      // 如果内容为空且服务器有内容，则加载服务器内容
      if (isEmpty && document.content && document.content !== '<p></p>') {
        editor.commands.setContent(document.content)
      }
    }

    provider.on('synced', handleSynced)

    return () => {
      provider.off('synced', handleSynced)
    }
  }, [editor, provider, document.content])

  if (!editor) {
    return <div className="flex h-full items-center justify-center">加载编辑器...</div>
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 重连提示 */}
      <ReconnectingBanner isReconnecting={isReconnecting} />
      
      {/* 离线提示 */}
      <OfflineBanner isOffline={isOffline} />

      {/* 文档标题和连接状态 */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {document.title}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>
                最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            {/* 导出按钮 */}
            <ExportMenu editor={editor} documentTitle={document.title} />
            
            {/* 连接状态指示器 */}
            <ConnectionStatus provider={provider} />
            
            {/* 在线用户列表 */}
            <OnlineUsers provider={provider} />
          </div>
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
      <EditorStatusBar editor={editor} saveStatus={saveStatus} provider={provider} />
    </div>
  )
}

export default TiptapEditor
