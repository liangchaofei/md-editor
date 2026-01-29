/**
 * Tiptap 富文本编辑器组件
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Collaboration from '@tiptap/extension-collaboration'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { CustomCollaborationCursor } from '../../extensions/CustomCollaborationCursor'
import { CustomKeymap } from '../../extensions/CustomKeymap'
import { SlashCommands, slashCommandSuggestion } from '../../extensions/SlashCommands'
import { lowlight } from '../../utils/lowlight'
import BubbleMenu from './BubbleMenu'
import MenuBar from './MenuBar'
import EditorStatusBar from './EditorStatusBar'
import ConnectionStatus from './ConnectionStatus'
import OfflineBanner from './OfflineBanner'
import ReconnectingBanner from './ReconnectingBanner'
import OnlineUsers from './OnlineUsers'
import ExportMenu from './ExportMenu'
import TableMenu from './TableMenu'
import VersionHistory from './VersionHistory'
import AIChatPanel from './AIChatPanel'
import ResizableHandle from './ResizableHandle'
import { createYDoc, createHocuspocusProvider } from '../../utils/yjs'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import type { Document } from '../../types/document'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
}

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // 版本历史状态
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  
  // AI 面板状态
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true)
  const [editorWidth, setEditorWidth] = useState(60) // 编辑器宽度百分比
  
  // 处理拖拽调整宽度
  const handleResize = useCallback((deltaX: number) => {
    setEditorWidth(prev => {
      // 获取容器宽度
      const container = window.document.querySelector('.editor-container')
      if (!container) return prev
      
      const containerWidth = container.clientWidth
      const deltaPercent = (deltaX / containerWidth) * 100
      
      // 限制在 30% - 80% 之间
      const newWidth = Math.max(30, Math.min(80, prev + deltaPercent))
      return newWidth
    })
  }, [])
  
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
      // StarterKit 包含基础扩展（禁用 CodeBlock，使用带高亮的版本）
      StarterKit.configure({
        codeBlock: false,
      }),
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
      // 表格
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // 图片
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      // 任务列表
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      // 代码高亮
      CodeBlockLowlight.configure({
        lowlight,
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
    <div className="editor-container flex h-full">
      {/* 编辑器面板 */}
      <div 
        className="flex flex-col bg-white"
        style={{ width: isAIPanelOpen ? `${editorWidth}%` : '100%' }}
      >
        {/* 重连提示 */}
        <ReconnectingBanner isReconnecting={isReconnecting} />
      
        {/* 离线提示 */}
        <OfflineBanner isOffline={isOffline} />

        {/* 文档标题和连接状态 - 固定高度 */}
        <div className="flex-shrink-0 border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {document.title}
              </h1>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                <span>
                  最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {/* AI 助手按钮 */}
              <button
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  isAIPanelOpen
                    ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title={isAIPanelOpen ? '收起 AI 助手' : '展开 AI 助手'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI 助手
              </button>
              
              {/* 版本历史按钮 */}
              <button
                onClick={() => setIsVersionHistoryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                title="版本历史"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                版本
              </button>
              
              {/* 导出按钮 */}
              <ExportMenu editor={editor} documentTitle={document.title} />
              
              {/* 连接状态指示器 */}
              <ConnectionStatus provider={provider} />
              
              {/* 在线用户列表 */}
              <OnlineUsers provider={provider} />
            </div>
          </div>
        </div>

        {/* 固定工具栏 - 固定高度 */}
        <div className="flex-shrink-0">
          <MenuBar editor={editor} />
        </div>

        {/* 表格操作菜单 */}
        <TableMenu editor={editor} />

        {/* 浮动工具栏 */}
        <BubbleMenu editor={editor} />

        {/* 编辑器内容 - 占据剩余空间 */}
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} />
        </div>

        {/* 状态栏 - 固定高度 */}
        <div className="flex-shrink-0">
          <EditorStatusBar editor={editor} saveStatus={saveStatus} provider={provider} />
        </div>

        {/* 版本历史侧边栏 */}
        <VersionHistory
          editor={editor}
          documentId={document.id}
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
        />
      </div>

      {/* 可拖拽的分隔线 */}
      {isAIPanelOpen && <ResizableHandle onResize={handleResize} />}

      {/* AI 对话面板 */}
      {isAIPanelOpen && (
        <div style={{ width: `${100 - editorWidth}%` }}>
          <AIChatPanel
            isOpen={isAIPanelOpen}
            onClose={() => setIsAIPanelOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

export default TiptapEditor
