/**
 * AI 对话面板组件
 * 用于显示 AI 对话界面
 */

import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { marked } from 'marked'
import { streamChatAPI, executeAIEdit } from '../../api/ai'
import { useChatHistory } from '../../hooks/useChatHistory'
import { useOutline } from '../../hooks/useOutline'
import { saveModelPreference, loadModelPreference, loadGlobalModelPreference, getModelInfo, AVAILABLE_MODELS, supportsDeepThink } from '../../utils/modelPreferences'
import type { Message } from '../../types/message'
import type { AIEditResponse } from '../../types/suggestion'
import type { GenerationMode } from '../../types/outline'
import OutlineView from './OutlineView'

// 配置 marked 选项
marked.setOptions({
  gfm: true,
  breaks: true,  // 启用换行符转换
})

/**
 * 更新编辑器内容
 * 使用 marked 转换 Markdown 为 HTML，然后清理格式
 */
function updateEditorContent(editor: Editor | null, markdown: string) {
  if (!editor || editor.isDestroyed || !markdown.trim()) return
  
  try {
    // 使用 marked 将 Markdown 转换为 HTML
    let html = marked.parse(markdown, { async: false }) as string
    
    // 清理 HTML：移除多余的 <p> 标签包裹
    // marked 会在列表项内容外包裹 <p>，导致额外的间距
    html = html.replace(/<li>\s*<p>/g, '<li>')
    html = html.replace(/<\/p>\s*<\/li>/g, '</li>')
    
    // 设置内容
    editor.commands.setContent(html)
  } catch (error) {
    console.error('更新编辑器内容失败:', error)
  }
}
interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
  documentId: number  // 新增：文档 ID
  onSuggestionsReceived?: (suggestions: AIEditResponse, isStreaming?: boolean) => { suggestionId?: string } | void
  onStreamingChange?: (isStreaming: boolean) => void
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}

function AIChatPanel({ isOpen, onClose, editor, documentId, onSuggestionsReceived, onStreamingChange, initialPrompt, initialGenerationMode, initialEnableDeepThink }: AIChatPanelProps) {
  // 调试日志
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
  
  // 生成模式状态
  const [generationMode, setGenerationMode] = useState<GenerationMode>(initialGenerationMode || 'full')
  
  // 深度思考开关（从首页传递的初始值）
  const [enableDeepThink, setEnableDeepThink] = useState(initialEnableDeepThink || false)
  
  // 保存已处理的 prompt 标识（documentId + prompt），避免重复触发
  const processedKeyRef = useRef<string | null>(null)
  
  // 从 localStorage 加载模型偏好
  const [model, setModel] = useState<string>(() => {
    return loadModelPreference(documentId) || loadGlobalModelPreference()
  })
  
  // 保存模型偏好
  useEffect(() => {
    saveModelPreference(documentId, model)
  }, [documentId, model])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const handleSend = async () => {
    console.log('📤 handleSend 被调用，检查条件:', {
      input: input,
      inputTrimmed: input.trim(),
      isThinking,
      editor: !!editor
    })
    
    if (!input.trim() || isThinking || !editor) {
      console.warn('⚠️ handleSend 条件不满足，返回')
      return
    }

    console.log('✅ handleSend 条件满足，开始发送消息')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    addMessage(userMessage)  // 使用 Hook 添加消息
    const userInput = input.trim()
    setInput('')
    
    // 记录开始时间用于统计
    const startTime = Date.now()
    
    // 根据深度思考开关选择模型
    let selectedModel = model
    if (enableDeepThink) {
      // 如果启用深度思考，使用对应的思考模型
      if (model.startsWith('deepseek-')) {
        selectedModel = 'deepseek-reasoner'
      }
      // 注意：Kimi 标准 API (moonshot-v1-*) 不支持思考过程输出
      // 深度思考对 Kimi 无效，保持原模型
    }
    
    // 如果是大纲模式，生成大纲
    if (generationMode === 'outline') {
      setIsThinking(true)
      
      // 创建 AI 消息占位符
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        reasoning: '',
        timestamp: Date.now(),
        isStreaming: true,
        isGeneratingToEditor: false,
      }
      addMessage(aiMessage)
      
      try {
        // 生成大纲，传递思考过程回调
        console.log('🎯 开始生成大纲')
        console.log('  - 选择的模型:', selectedModel)
        console.log('  - 深度思考开关:', enableDeepThink)
        
        await generateOutline(userInput, documentId, selectedModel, (thinking: string) => {
          // 更新思考过程
          console.log('💭 收到思考内容（前50字符）:', thinking.substring(0, 50))
          updateLastMessage(msg => ({
            ...msg,
            reasoning: (msg.reasoning || '') + thinking
          }))
        })
        
        // 计算统计信息
        const duration = (Date.now() - startTime) / 1000
        const tokens = Math.ceil((userInput.length + 500) / 2) // 粗略估算
        const cost = tokens * 0.000001 // 粗略估算费用
        
        // 生成完成，更新消息
        updateLastMessage(msg => ({
          ...msg,
          content: '大纲已生成，请在右侧编辑后点击"基于大纲生成文档"按钮。',
          isStreaming: false,
          stats: {
            duration,
            tokens,
            cost
          }
        }))
      } catch (error) {
        console.error('生成大纲失败:', error)
        updateLastMessage(msg => ({
          ...msg,
          content: '抱歉，生成大纲时出错了。请重试。',
          isStreaming: false
        }))
      } finally {
        setIsThinking(false)
      }
      
      return
    }
    
    setIsThinking(true)
    setIsGenerating(true)
    setHasStartedGenerating(false)
    
    // 通知父组件开始流式输出
    onStreamingChange?.(true)

    // 判断用户意图：是生成新内容还是编辑现有内容
    const currentContent = editor.getText()
    const isEditMode = currentContent.length > 0 && (
      userInput.includes('修改') ||
      userInput.includes('改为') ||
      userInput.includes('改成') ||
      userInput.includes('替换') ||
      userInput.includes('把') ||
      userInput.includes('将')
    )

    if (isEditMode) {
      // 编辑模式：调用 AI 编辑 API
      console.log('🔧 编辑模式：修改现有内容')
      
      // 创建 AI 消息占位符
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        reasoning: '',
        timestamp: Date.now(),
        isStreaming: true,
        isGeneratingToEditor: false,
      }
      addMessage(aiMessage)  // 使用 Hook 添加消息

      let accumulatedContent = ''

      // 使用纯文本内容（不包含 Markdown 语法）
      const plainTextContent = editor.getText()
      console.log('📄 发送给 AI 的纯文本内容（前500字符）:', plainTextContent.substring(0, 500))

      await executeAIEdit({
        documentContent: plainTextContent,
        userRequest: userInput,
        model: selectedModel,
        onReasoning: (reasoning) => {
          updateLastMessage(msg => ({
            ...msg,
            reasoning: (msg.reasoning || '') + reasoning
          }))
        },
        onChunk: (chunk) => {
          accumulatedContent += chunk
          
          // 注意：不要在这里设置 isThinking = false
          // 因为 DeepSeek Reasoner 可能还在思考
          // 只有收到 structured 数据或 complete 时才认为完成
          if (!hasStartedGenerating && accumulatedContent.trim()) {
            setHasStartedGenerating(true)
            // 不要设置 setIsThinking(false)，让它继续显示思考状态
          }
        },
        onStructured: (data) => {
          console.log('📝 收到结构化修改建议:', data)
          console.log('📋 AI 返回的完整数据:', JSON.stringify(data, null, 2))
          console.log('🔍 检查 data.changes:', data.changes)
          console.log('🔍 data.changes 类型:', typeof data.changes)
          console.log('🔍 data.changes 是数组吗?', Array.isArray(data.changes))
          console.log('🔍 data.changes 长度:', data.changes?.length)
          
          // 收到结构化数据，思考完成
          setIsThinking(false)
          setHasStartedGenerating(false)
          
          if (data.changes && data.changes.length > 0) {
            const firstChange = data.changes[0]
            console.log('🎯 第一个修改建议:')
            console.log('  - contextBefore:', firstChange.contextBefore || '(无)')
            console.log('  - targetText:', firstChange.targetText || firstChange.target || '(无)')
            console.log('  - contextAfter:', firstChange.contextAfter || '(无)')
            console.log('  - replacement:', firstChange.replacement || '(无)')
            console.log('  - description:', firstChange.description || '(无)')
          } else {
            console.error('❌ data.changes 为空或不是数组')
          }
          
          console.log('📄 当前文档内容（前500字符）:')
          console.log(editor?.getText().substring(0, 500))
          
          // 计算统计信息
          const duration = (Date.now() - startTime) / 1000
          const tokens = Math.ceil((plainTextContent.length + userInput.length + accumulatedContent.length) / 2)
          const cost = tokens * 0.000001
          
          // 更新消息内容
          updateLastMessage(msg => ({
            ...msg,
            content: `根据你的描述，我将为你${data.reasoning || '修改文档'}。\n\n修改建议已在编辑器中标记（删除线 + 绿色高亮），请 hover 查看并选择接受或拒绝。`,
            isStreaming: false,
            stats: {
              duration,
              tokens,
              cost
            }
          }))
          
          // 通知父组件处理建议（暂时不使用流式模式）
          if (onSuggestionsReceived) {
            console.log('📤 调用 onSuggestionsReceived（非流式模式）')
            onSuggestionsReceived(data as AIEditResponse, false)  // isStreaming = false
          } else {
            console.error('❌ onSuggestionsReceived 未定义')
          }
        },
        onComplete: () => {
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
          
          // 通知父组件流式输出结束
          onStreamingChange?.(false)
          
          updateLastMessage(msg => ({
            ...msg,
            isStreaming: false,
            isGeneratingToEditor: false
          }))
        },
        onError: (error) => {
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
          
          // 通知父组件流式输出结束
          onStreamingChange?.(false)
          
          console.error('AI 编辑错误:', error)
          updateLastMessage(msg => ({
            ...msg,
            content: '抱歉，处理你的请求时出错了。请重试。',
            isStreaming: false
          }))
        },
      })
    } else {
      // 生成模式：清空编辑器，生成新内容
      console.log('✨ 生成模式：创建新内容')
      
      // 清空编辑器内容
      editor.commands.clearContent()
      
      // 重置状态
      setGeneratedContent('')

      // 创建 AI 消息占位符
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        reasoning: '',
        timestamp: Date.now(),
        isStreaming: true,
        isGeneratingToEditor: false,
      }
      addMessage(aiMessage)  // 使用 Hook 添加消息

      let accumulatedContent = ''
      let updateTimer: ReturnType<typeof setTimeout> | null = null
      let lastUpdateTime = 0
      const UPDATE_INTERVAL = 100 // 每 100ms 更新一次编辑器

      // 调用 AI API
      await streamChatAPI({
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage.content },
        ],
        model: selectedModel,
        onReasoning: (reasoning) => {
          // 更新思考过程（只在对话面板显示）
          updateLastMessage(msg => ({
            ...msg,
            reasoning: (msg.reasoning || '') + reasoning
          }))
        },
        onChunk: (chunk) => {
          // 累积内容
          accumulatedContent += chunk
          
          // 标记已开始生成正文（思考完成）
          if (!hasStartedGenerating && accumulatedContent.trim()) {
            setHasStartedGenerating(true)
            setIsThinking(false) // 思考结束
            
            // 更新消息状态：标记不再是纯思考状态
            updateLastMessage(msg => ({
              ...msg,
              isGeneratingToEditor: true
            }))
          }
          
          // 记录生成的内容（立即更新状态，用于显示字数）
          setGeneratedContent(accumulatedContent)
          
          // 使用节流更新编辑器，避免频繁触发重渲染
          const now = Date.now()
          if (now - lastUpdateTime >= UPDATE_INTERVAL) {
            lastUpdateTime = now
            updateEditorContent(editor, accumulatedContent)
          } else {
            // 清除之前的定时器
            if (updateTimer) {
              clearTimeout(updateTimer)
            }
            // 设置新的定时器，确保最后一次更新能执行
            updateTimer = setTimeout(() => {
              updateEditorContent(editor, accumulatedContent)
              lastUpdateTime = Date.now()
            }, UPDATE_INTERVAL)
          }
        },
        onComplete: () => {
          // 清除定时器
          if (updateTimer) {
            clearTimeout(updateTimer)
          }
          // 确保最后一次更新
          updateEditorContent(editor, accumulatedContent)
          
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
          
          // 通知父组件流式输出结束
          onStreamingChange?.(false)
          
          // 计算统计信息
          const duration = (Date.now() - startTime) / 1000
          const tokens = Math.ceil((userInput.length + accumulatedContent.length) / 2)
          const cost = tokens * 0.000001
          
          updateLastMessage(msg => ({
            ...msg,
            isStreaming: false,
            isGeneratingToEditor: false,
            content: accumulatedContent,
            stats: {
              duration,
              tokens,
              cost
            }
          }))
        },
        onError: (error) => {
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
          
          // 通知父组件流式输出结束
          onStreamingChange?.(false)
          
          console.error('AI 错误:', error)
          updateLastMessage(msg => ({
            ...msg,
            content: '抱歉，生成内容时出错了。请重试。',
            isStreaming: false
          }))
        },
      })
    }
  }

  // 停止生成
  const handleStop = () => {
    setIsGenerating(false)
    setIsThinking(false)
    setHasStartedGenerating(false)
    
    // 通知父组件流式输出结束
    onStreamingChange?.(false)
  }

  // 撤销生成的内容
  const handleUndo = () => {
    if (!editor) return

    // 直接清空编辑器
    editor.commands.clearContent()

    // 重置状态
    setGeneratedContent('')
    
    // 通知父组件流式输出结束（如果还在生成中）
    if (isGenerating) {
      onStreamingChange?.(false)
    }
  }

  // 基于大纲生成文档
  const handleGenerateFromOutline = async () => {
    if (!outline || !editor) return

    setIsGenerating(true)
    setIsThinking(true)
    
    // 通知父组件开始流式输出
    onStreamingChange?.(true)

    // 强制使用非 reasoner 模型（生成文档不需要思考过程，直接生成内容更快）
    const documentModel = model.includes('reasoner') ? 'deepseek-chat' : model

    try {
      const response = await fetch('/api/ai/generate-from-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          outline: outline.nodes,
          originalPrompt: messages.find(m => m.role === 'user')?.content || '',
          model: documentModel,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''
      let accumulatedContent = ''

      // 清空编辑器
      editor.commands.clearContent()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'content') {
              accumulatedContent += data.data.content || ''
              
              // 清理内容：移除代码块标记和其他问题
              let cleanContent = accumulatedContent
              
              // 移除开头的代码块标记（可能是 ```markdown 或 ```）
              cleanContent = cleanContent.replace(/^```(?:markdown|md)?\s*\n?/i, '')
              
              // 移除结尾的代码块标记
              cleanContent = cleanContent.replace(/\n?```\s*$/i, '')
              
              // 移除可能的 "好的，遵照您的要求..." 等开场白
              cleanContent = cleanContent.replace(/^好的[，,].*?[。\.]\s*\n*/i, '')
              cleanContent = cleanContent.replace(/^根据.*?[，,].*?[：:]\s*\n*/i, '')
              
              // 确保内容以标题开始（如果不是，则不做处理）
              cleanContent = cleanContent.trim()
              
              updateEditorContent(editor, cleanContent)
              setGeneratedContent(cleanContent)
            } else if (data.type === 'error') {
              throw new Error(data.data.error || 'Unknown error')
            }
          }
        }
      }

      // 生成完成，清除大纲
      clearOutline()
      setIsThinking(false)
      setIsGenerating(false)
      
      // 通知父组件流式输出结束
      onStreamingChange?.(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate document'
      console.error('Document generation error:', err)
      setIsThinking(false)
      setIsGenerating(false)
      
      // 通知父组件流式输出结束
      onStreamingChange?.(false)
      
      alert(`生成文档失败: ${message}`)
    }
  }

  // 按 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 自动触发初始提示词（只触发一次）
  // 使用独立的 useEffect，只在 initialPrompt 或 documentId 变化时执行
  useEffect(() => {
    // 如果没有 initialPrompt，直接返回
    if (!initialPrompt) {
      console.log('🔍 没有 initialPrompt，跳过自动触发')
      return
    }
    
    // 生成唯一标识
    const currentKey = `${documentId}-${initialPrompt}`
    
    console.log('🔍 自动触发检查:', {
      currentKey,
      processedKey: processedKeyRef.current,
      shouldTrigger: processedKeyRef.current !== currentKey
    })
    
    // 如果这个 key 已经处理过，直接返回
    if (processedKeyRef.current === currentKey) {
      console.log('❌ 该 key 已处理过，跳过')
      return
    }
    
    // 标记为已处理
    processedKeyRef.current = currentKey
    console.log('✅ 标记 key 为已处理:', currentKey)
    
    // 等待编辑器初始化后触发
    const checkAndTrigger = () => {
      console.log('⏰ 检查触发条件:', {
        editor: !!editor,
        isOpen,
        input: !!input
      })
      
      if (editor && isOpen && input) {
        console.log('🚀 执行自动发送')
        handleSend()
      } else {
        console.log('⏳ 条件未满足，500ms 后重试')
        setTimeout(checkAndTrigger, 500)
      }
    }
    
    // 延迟执行，确保编辑器已初始化
    const timer = setTimeout(checkAndTrigger, 300)
    
    return () => clearTimeout(timer)
  }, [initialPrompt, documentId]) // 只依赖这两个，不依赖其他状态

  if (!isOpen) return null

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* 头部 - 简化版 */}
      <div className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2">
        {/* 清空历史按钮 */}
        {messages.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确定要清空对话历史吗？')) {
                clearHistory()
                setGeneratedContent('')
                clearOutline()
              }
            }}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="清空对话历史"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        
        {/* 模型选择 */}
        <div className="relative group">
          <select
            value={model}
            onChange={(e) => {
              const newModel = e.target.value
              setModel(newModel)
              // 如果切换到不支持深度思考的模型，自动关闭深度思考
              if (!supportsDeepThink(newModel)) {
                setEnableDeepThink(false)
              }
            }}
            disabled={isThinking}
            className="appearance-none text-xs border border-gray-300 rounded-md pl-3 pr-8 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
            title="选择 AI 模型"
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* 模型信息提示 */}
          <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {(() => {
              const info = getModelInfo(model)
              if (!info) return null
              return (
                <div className="text-xs space-y-2">
                  <div>
                    <div className="font-medium text-gray-900">{info.name}</div>
                    <div className="text-gray-600 mt-1">{info.description}</div>
                  </div>
                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">上下文窗口:</span>
                      <span className="font-medium">{info.contextWindow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">定价:</span>
                      <span className="font-medium text-xs">{info.pricing}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-gray-600 mb-1">特性:</div>
                    <div className="flex flex-wrap gap-1">
                      {info.features.map(f => (
                        <span key={f} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
        
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="收起 AI 面板"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 如果有大纲，显示大纲视图 */}
          {outline ? (
            <OutlineView
              outline={outline}
              onUpdate={updateNode}
              onAddSibling={addSibling}
              onAddChild={addChild}
              onDelete={deleteNode}
              onMove={moveNode}
              onToggleCollapse={toggleCollapse}
              onGenerateDocument={handleGenerateFromOutline}
              isGenerating={isGenerating}
              error={outlineError}
            />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm text-gray-500">您好，有什么可以帮您？</p>
              <p className="text-xs text-gray-400 mt-2">
                {generationMode === 'outline' 
                  ? '输入您的需求，AI 将生成文档大纲供您编辑'
                  : '输入您的需求，AI 将帮助您创作内容'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入框 */}
        <div className="border-t border-gray-200 p-4">
          {/* 生成完成提示和操作按钮 */}
          {!isGenerating && generatedContent && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">内容生成完成</span>
                  <span className="text-xs text-gray-500">
                    ({generatedContent.length} 字)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    撤销
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedContent('')
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 正在生成提示 */}
          {isGenerating && (
            <div className="mb-3 flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>正在生成内容到编辑器...</span>
              </div>
              <button
                onClick={handleStop}
                className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
              >
                停止
              </button>
            </div>
          )}
          
          <div className="space-y-3">
            {/* 模式选择和深度思考 */}
            <div className="flex items-center gap-2 px-1">
              {/* 分步生成按钮 */}
              <button
                onClick={() => {
                  if (generationMode === 'outline') {
                    setGenerationMode('full')
                    clearOutline()
                  } else {
                    setGenerationMode('outline')
                  }
                }}
                disabled={isThinking || isGenerating}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  generationMode === 'outline'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={generationMode === 'outline' ? '已启用分步生成' : '点击启用分步生成'}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                分步生成
                {generationMode === 'outline' && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* 深度思考开关 - 只在支持的模型下显示 */}
              {supportsDeepThink(model) && (
                <button
                  onClick={() => setEnableDeepThink(!enableDeepThink)}
                  disabled={isThinking || isGenerating}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    enableDeepThink
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={enableDeepThink ? '已启用深度思考' : '点击启用深度思考'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  深度思考
                  {enableDeepThink && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            
            {/* 输入框和发送按钮 */}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的需求... (Enter 发送，Shift+Enter 换行)"
                disabled={isThinking}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                rows={3}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking || !editor}
                className="self-end rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isThinking ? '思考中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 消息项组件
function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [showReasoning, setShowReasoning] = useState(true)  // 默认展开
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  
  // 判断是否正在思考（有思考内容但还没开始生成到编辑器）
  const isThinking = !isUser && message.reasoning && message.isStreaming && !message.isGeneratingToEditor
  
  // 判断是否正在生成到编辑器
  const isGeneratingToEditor = !isUser && message.isGeneratingToEditor

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* 角色和时间 */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs font-medium text-gray-600">
            {isUser ? '我' : 'AI 助手'}
          </span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>

        {/* 思考过程（仅 AI 回复且有思考内容时显示） */}
        {!isUser && message.reasoning && (
          <div className="mb-3">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors w-full"
            >
              <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${showReasoning ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {isThinking ? (
                <>
                  <svg className="w-4 h-4 text-green-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-green-700">正在思考中</span>
                  <span className="text-gray-400 text-xs ml-auto">用时 {Math.floor((Date.now() - message.timestamp) / 1000)} 秒</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">深度思考完成</span>
                  {message.isStreaming && (
                    <span className="text-gray-400 text-xs ml-auto">用时 {Math.floor((Date.now() - message.timestamp) / 1000)} 秒</span>
                  )}
                </>
              )}
            </button>
            {showReasoning && (
              <div className="mt-2 bg-gradient-to-br from-purple-50 to-blue-50 border-l-4 border-purple-400 rounded-r-lg px-4 py-3 shadow-sm max-h-60 overflow-y-auto">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {message.reasoning}
                  {message.isStreaming && !message.content && (
                    <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 消息内容 */}
        {isUser ? (
          // 用户消息
          <div className="rounded-lg px-4 py-3 shadow-sm bg-purple-600 text-white">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : message.content && !isGeneratingToEditor ? (
          // AI 生成完成后显示摘要卡片
          <div className="rounded-lg border border-blue-200 bg-white shadow-sm overflow-hidden">
            {/* 卡片头部 */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-900">
                  {/* 提取标题（第一行或前30个字符） */}
                  {(() => {
                    const firstLine = message.content.split('\n')[0].replace(/^#+\s*/, '').trim()
                    return firstLine.substring(0, 30) || '已生成内容'
                  })()}
                  {message.content.length > 30 && '...'}
                </span>
              </div>
            </div>
            
            {/* 卡片内容 */}
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 mb-2">
                创建时间: {new Date(message.timestamp).toLocaleString('zh-CN')}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                内容已生成到编辑器，共 {message.content.length} 字
              </div>
              
              {/* Token 统计信息 */}
              {message.stats && (
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <span>⏱️</span>
                    <span>{message.stats.duration.toFixed(1)}秒</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📊</span>
                    <span>{message.stats.tokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💰</span>
                    <span>¥{message.stats.cost.toFixed(4)}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 卡片底部提示 */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                你对采购单是否满意？我可以继续为你修改内容。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AIChatPanel
