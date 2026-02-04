/**
 * AI 对话面板组件 - 主组件
 */

import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useChatHistory } from '../../../hooks/useChatHistory'
import { useOutline } from '../../../hooks/useOutline'
import { saveModelPreference, loadModelPreference, loadGlobalModelPreference, supportsDeepThink } from '../../../utils/modelPreferences'
import type { AIEditResponse } from '../../../types/suggestion'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import { useChatLogic } from './hooks/useChatLogic'
import { useAutoTrigger } from './hooks/useAutoTrigger'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
  documentId: number
  onSuggestionsReceived?: (suggestions: AIEditResponse, isStreaming?: boolean) => { suggestionId?: string } | void
  onStreamingChange?: (isStreaming: boolean) => void
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}

function AIChatPanel({
  isOpen,
  onClose,
  editor,
  documentId,
  onSuggestionsReceived,
  onStreamingChange,
  initialPrompt,
  initialGenerationMode,
  initialEnableDeepThink
}: AIChatPanelProps) {
  console.log('💬 AIChatPanel 接收到的参数:', {
    initialPrompt,
    initialGenerationMode,
    initialEnableDeepThink,
    documentId,
    isOpen,
    editor: !!editor
  })
  
  // 使用对话历史 Hook
  const { messages, addMessage, updateLastMessage, clearHistory } = useChatHistory(documentId)
  
  // 使用大纲 Hook
  const {
    outline,
    error: outlineError,
    generateOutline,
    updateNode,
    addSibling,
    addChild,
    deleteNode,
    moveNode,
    toggleCollapse,
    clearOutline,
  } = useOutline()
  
  const [input, setInput] = useState(initialPrompt || '')
  const [isThinking, setIsThinking] = useState(false)
  const [generationMode, setGenerationMode] = useState<'full' | 'outline'>(initialGenerationMode || 'full')
  const [enableDeepThink, setEnableDeepThink] = useState(initialEnableDeepThink || false)
  
  // 加载模型偏好
  // 如果启用了深度思考，优先使用 reasoner 模型
  const [model, setModel] = useState<string>(() => {
    if (initialEnableDeepThink) {
      return 'deepseek-reasoner'
    }
    return loadModelPreference(documentId) || loadGlobalModelPreference()
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false)  // eslint-disable-line @typescript-eslint/no-unused-vars

  // 保存模型偏好
  useEffect(() => {
    saveModelPreference(documentId, model)
  }, [documentId, model])

  // 使用对话逻辑 Hook
  const { handleSend, handleStop, handleUndo, handleGenerateFromOutline } = useChatLogic({
    editor,
    documentId,
    input,
    model,
    enableDeepThink,
    generationMode,
    messages,
    outline,
    addMessage,
    updateLastMessage,
    generateOutline,
    clearOutline,
    onSuggestionsReceived,
    onStreamingChange,
    setInput,
    setIsThinking,
    setIsGenerating,
    setGeneratedContent,
    setHasStartedGenerating,
    setGenerationMode,
    setEnableDeepThink,
    setModel,
  })

  // 使用自动触发 Hook
  useAutoTrigger({
    initialPrompt,
    documentId,
    editor,
    isOpen,
    input,
    handleSend,
  })

  // 处理模型切换
  const handleModelChange = (newModel: string) => {
    setModel(newModel)
    // 如果切换到不支持深度思考的模型，自动关闭深度思考
    if (!supportsDeepThink(newModel) && enableDeepThink) {
      console.log('🔄 切换到不支持深度思考的模型，自动关闭深度思考')
      setEnableDeepThink(false)
    }
  }

  // 处理模式切换
  const handleModeChange = (mode: 'full' | 'outline') => {
    setGenerationMode(mode)
    if (mode === 'full') {
      clearOutline()
    }
  }

  // 处理清空历史
  const handleClearHistory = () => {
    clearHistory()
    setGeneratedContent('')
    clearOutline()
  }

  if (!isOpen) return null

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      <ChatHeader
        hasMessages={messages.length > 0}
        model={model}
        isThinking={isThinking}
        onClearHistory={handleClearHistory}
        onModelChange={handleModelChange}
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatMessages
          messages={messages}
          outline={outline}
          outlineError={outlineError}
          generationMode={generationMode}
          isGenerating={isGenerating}
          onUpdateOutline={updateNode}
          onAddSibling={addSibling}
          onAddChild={addChild}
          onDeleteNode={deleteNode}
          onMoveNode={moveNode}
          onToggleCollapse={toggleCollapse}
          onGenerateDocument={handleGenerateFromOutline}
        />

        <ChatInput
          input={input}
          isThinking={isThinking}
          isGenerating={isGenerating}
          generationMode={generationMode}
          enableDeepThink={enableDeepThink}
          model={model}
          generatedContent={generatedContent}
          onInputChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          onUndo={handleUndo}
          onConfirm={() => setGeneratedContent('')}
          onModeChange={handleModeChange}
          onDeepThinkChange={setEnableDeepThink}
        />
      </div>
    </div>
  )
}

export default AIChatPanel
