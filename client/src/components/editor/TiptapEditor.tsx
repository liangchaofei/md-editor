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
import { Markdown } from 'tiptap-markdown'
import { Dropcursor } from '@tiptap/extension-dropcursor'
import { CustomCollaborationCursor } from '../../extensions/CustomCollaborationCursor'
import { CustomKeymap } from '../../extensions/CustomKeymap'
import { SlashCommands, slashCommandSuggestion } from '../../extensions/SlashCommands'
import { Highlight } from '../../extensions/Highlight'
import { Suggestion } from '../../extensions/Suggestion'
import { DragAndDrop } from '../../extensions/DragAndDrop'
import { lowlight } from '../../utils/lowlight'
import BubbleMenuComponent from './BubbleMenu'
import MenuBar from './MenuBar'
import EditorStatusBar from './EditorStatusBar'
import ConnectionStatus from './ConnectionStatus'
import OfflineBanner from './OfflineBanner'
import ReconnectingBanner from './ReconnectingBanner'
import OnlineUsers from './OnlineUsers'
import ExportMenu from './ExportMenu'
import TableMenu from './TableMenu'
import VersionHistory from './VersionHistory'
import AIChatPanel from './AIChatPanel/index'
import AICommandDialog from './AICommandDialog'
import ResizableHandle from './ResizableHandle'
import SuggestionTooltip from './SuggestionTooltip'
import ContextMenu from './ContextMenu'
import DragHandle from './DragHandle'
import { createYDoc, createHocuspocusProvider } from '../../utils/yjs'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import { useSuggestions } from '../../hooks/useSuggestions'
import type { Document } from '../../types/document'
import type { AICommandType } from '../../types/aiCommand'
import type { AIEditResponse } from '../../types/suggestion'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved', initialPrompt, initialGenerationMode, initialEnableDeepThink }: TiptapEditorProps) {
 
  
  // 版本历史状态
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  
  // AI 面板状态
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true)
  const [editorWidth, setEditorWidth] = useState(60) // 编辑器宽度百分比
  
  // AI 指令对话框状态
  const [aiCommandType, setAICommandType] = useState<AICommandType | null>(null)
  const [isAICommandDialogOpen, setIsAICommandDialogOpen] = useState(false)
  
  // 右键菜单状态
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  
  // AI 流式输出状态
  const [isAIStreaming, setIsAIStreaming] = useState(false)
  
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
  
  // 打开 AI 指令对话框
  const openAICommand = useCallback((type: AICommandType) => {
    setAICommandType(type)
    setIsAICommandDialogOpen(true)
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
      // Markdown 支持
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
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
      // 高亮标记
      Highlight.configure({
        multicolor: true,
      }),
      // AI 修改建议标记
      Suggestion,
      // 拖拽光标
      Dropcursor.configure({
        color: '#3b82f6',
        width: 2,
      }),
      // 拖拽排序
      DragAndDrop,
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
  
  // AI 修改建议管理（必须在 editor 定义之后）
  const {
    suggestions,
    addSuggestions,
    acceptSuggestion,
    rejectSuggestion,
  } = useSuggestions(editor)
  
  // 快捷键：Ctrl+K 打开/关闭 AI 面板，Enter 接受建议，Esc 拒绝建议
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsAIPanelOpen(prev => !prev)
      }
      
      // Ctrl+Enter 接受第一个待处理的建议
      if (e.key === 'Enter' && e.ctrlKey && suggestions.length > 0) {
        e.preventDefault()
        const pendingSuggestion = suggestions.find(s => s.status === 'pending')
        if (pendingSuggestion) {
          acceptSuggestion(pendingSuggestion.id)
        }
      }
      
      // Esc 拒绝第一个待处理的建议
      if (e.key === 'Escape' && suggestions.length > 0) {
        const pendingSuggestion = suggestions.find(s => s.status === 'pending')
        if (pendingSuggestion) {
          rejectSuggestion(pendingSuggestion.id)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, acceptSuggestion, rejectSuggestion])
  
  // 右键菜单监听
  useEffect(() => {
    if (!editor) return

    const handleContextMenu = (e: MouseEvent) => {
      // 检查是否在编辑器内
      const editorElement = window.document.querySelector('.ProseMirror')
      if (!editorElement || !editorElement.contains(e.target as Node)) {
        return
      }

      e.preventDefault()
      setContextMenuPosition({ x: e.clientX, y: e.clientY })
      setIsContextMenuOpen(true)
    }

    window.document.addEventListener('contextmenu', handleContextMenu)
    return () => window.document.removeEventListener('contextmenu', handleContextMenu)
  }, [editor])
  
  // 处理 AI 编辑建议（支持流式输出）
  const handleSuggestionsReceived = useCallback((data: AIEditResponse, isStreaming = false) => {
    
    if (data.changes && data.changes.length > 0) {
      // 如果 AI 返回了多个修改，只取第一个（最相关的）
      if (data.changes.length > 1) {
        console.warn(`⚠️ AI 返回了 ${data.changes.length} 个修改，只应用第一个`)
      }
      
      // 只取第一个修改
      const firstChange = data.changes[0]
      
      // 转换为新格式
      const formattedChanges = [{
        targetText: firstChange.targetText || firstChange.target || firstChange.searchKeywords || '',
        replacement: firstChange.replacement || '',  // 流式模式下可能为空
        description: firstChange.description,
        contextBefore: firstChange.contextBefore,
        contextAfter: firstChange.contextAfter,
        isStreaming,  // 传递流式标志
      }]
      

      const result = addSuggestions(formattedChanges)
      

      // 如果有错误，显示提示
      if (result.errors && result.errors.length > 0) {
        console.error('❌ 建议定位失败:', result.errors[0])
        return
      } else if (result.success) {
        
        // 返回第一个建议的 ID（用于流式输出）
        if (result.suggestions && result.suggestions.length > 0) {
          return { suggestionId: result.suggestions[0].id }
        }
      }
    }
  }, [editor, addSuggestions])

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
        <div className="flex-shrink-0 border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* 左侧：文档信息 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {document.title}
              </h1>
              <div className="mt-1 text-xs text-gray-500 truncate">
                最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
              </div>
            </div>
            
            {/* 右侧：按钮组 */}
            <div className="flex items-center gap-2 flex-wrap">
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
                <span className="hidden sm:inline">AI 助手</span>
                <span className="sm:hidden">AI</span>
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
                <span className="hidden sm:inline">版本</span>
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
          <MenuBar editor={editor} onAICommand={openAICommand} isAIStreaming={isAIStreaming} />
        </div>

        {/* 表格操作菜单 */}
        <TableMenu editor={editor} />

        {/* 浮动工具栏 */}
        <BubbleMenuComponent 
          editor={editor} 
          onAICommand={openAICommand}
          isDialogOpen={isAICommandDialogOpen}
        />

        {/* 编辑器内容 - 占据剩余空间 */}
        <div className="flex-1 overflow-auto relative">
          <EditorContent editor={editor} />
          
          {/* 拖拽手柄 */}
          <DragHandle editor={editor} />
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

        {/* AI 指令对话框 */}
        {aiCommandType && (
          <AICommandDialog
            editor={editor}
            type={aiCommandType}
            isOpen={isAICommandDialogOpen}
            onClose={() => {
              setIsAICommandDialogOpen(false)
              setAICommandType(null)
            }}
          />
        )}
      </div>

      {/* 可拖拽的分隔线 */}
      {isAIPanelOpen && <ResizableHandle onResize={handleResize} />}

      {/* AI 对话面板 */}
      {isAIPanelOpen && (
        <div style={{ width: `${100 - editorWidth}%` }}>
          <AIChatPanel
            isOpen={isAIPanelOpen}
            onClose={() => setIsAIPanelOpen(false)}
            editor={editor}
            documentId={document.id}
            onSuggestionsReceived={handleSuggestionsReceived}
            onStreamingChange={setIsAIStreaming}
            initialPrompt={initialPrompt}
            initialGenerationMode={initialGenerationMode}
            initialEnableDeepThink={initialEnableDeepThink}
          />
        </div>
      )}
      
      {/* AI 修改建议 Tooltips */}
      {suggestions.filter(s => s.status === 'pending').map(suggestion => (
        <SuggestionTooltip
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={acceptSuggestion}
          onReject={rejectSuggestion}
        />
      ))}
      
      {/* 右键菜单 */}
      <ContextMenu
        editor={editor}
        isOpen={isContextMenuOpen}
        position={contextMenuPosition}
        onClose={() => setIsContextMenuOpen(false)}
        onAICommand={openAICommand}
      />
    </div>
  )
}

export default TiptapEditor
