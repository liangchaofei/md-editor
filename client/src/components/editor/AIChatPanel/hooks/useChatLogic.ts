/**
 * 对话逻辑 Hook
 */

import type { Editor } from '@tiptap/react'
import { marked } from 'marked'
import { streamChatAPI, executeAIEdit } from '../../../../api/ai'
import type { Message } from '../../../../types/message'
import type { AIEditResponse } from '../../../../types/suggestion'
import type { Outline } from '../../../../types/outline'

// 配置 marked 选项
marked.setOptions({
  gfm: true,
  breaks: true,
})

/**
 * 更新编辑器内容
 */
function updateEditorContent(editor: Editor | null, markdown: string) {
  if (!editor || editor.isDestroyed || !markdown.trim()) return
  
  try {
    let html = marked.parse(markdown, { async: false }) as string
    html = html.replace(/<li>\s*<p>/g, '<li>')
    html = html.replace(/<\/p>\s*<\/li>/g, '</li>')
    editor.commands.setContent(html)
  } catch (error) {
    console.error('更新编辑器内容失败:', error)
  }
}

interface UseChatLogicParams {
  editor: Editor | null
  documentId: number
  input: string
  model: string
  enableDeepThink: boolean
  generationMode: 'full' | 'outline'
  messages: Message[]
  outline: Outline | null
  addMessage: (message: Message) => void
  updateLastMessage: (updater: (msg: Message) => Message) => void
  generateOutline: (prompt: string, documentId: number, model: string, onReasoning?: (reasoning: string) => void) => Promise<void>
  clearOutline: () => void
  onSuggestionsReceived?: (suggestions: AIEditResponse, isStreaming?: boolean) => { suggestionId?: string } | void
  onStreamingChange?: (isStreaming: boolean) => void
  setInput: (value: string) => void
  setIsThinking: (value: boolean) => void
  setIsGenerating: (value: boolean) => void
  setGeneratedContent: (value: string) => void
  setHasStartedGenerating: (value: boolean) => void
  setGenerationMode: (mode: 'full' | 'outline') => void
  setEnableDeepThink: (enabled: boolean) => void
  setModel: (model: string) => void
}

export function useChatLogic(params: UseChatLogicParams) {
  const {
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
  } = params

  const handleSend = async () => {
    console.log('📤 handleSend 被调用')
    
    if (!input.trim() || !editor) {
      console.warn('⚠️ handleSend 条件不满足')
      return
    }

    console.log('✅ handleSend 条件满足，开始发送消息')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    addMessage(userMessage)
    const userInput = input.trim()
    setInput('')
    
    const startTime = Date.now()
    
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
    
    // 如果是编辑模式，自动切换到全文模式
    if (isEditMode && generationMode === 'outline') {
      console.log('🔄 检测到编辑意图，自动切换到全文模式')
      params.setGenerationMode('full')
      params.clearOutline()
    }
    
    // 如果是编辑模式且开启了深度思考，自动关闭深度思考
    // 因为编辑模式会强制使用 chat 模型，不会有思考过程
    if (isEditMode && enableDeepThink) {
      console.log('🔄 编辑模式不支持深度思考，自动关闭')
      params.setEnableDeepThink(false)
    }
    
    // 如果是编辑模式且当前是 reasoner 模型，自动切换到 chat 模型
    // 保持 UI 显示与实际使用的模型一致
    if (isEditMode && model === 'deepseek-reasoner') {
      console.log('🔄 编辑模式切换到 chat 模型')
      params.setModel('deepseek-chat')
    }
    
    // 根据深度思考开关选择模型
    // 注意：只有 deepseek-reasoner 支持深度思考
    // 如果当前模型不是 reasoner，深度思考开关无效
    let selectedModel = model
    if (enableDeepThink && model === 'deepseek-chat') {
      // 如果启用深度思考且当前是 chat 模型，切换到 reasoner
      selectedModel = 'deepseek-reasoner'
    } else if (enableDeepThink && model !== 'deepseek-reasoner') {
      // 如果启用深度思考但模型不支持，使用原模型（深度思考无效）
      console.warn('⚠️ 当前模型不支持深度思考，将使用普通模式')
      selectedModel = model
    } else if (!enableDeepThink && model === 'deepseek-reasoner') {
      // 如果关闭深度思考但当前是 reasoner 模型，切换到 chat 模型
      // 避免 reasoner 模型输出不必要的思考过程
      console.log('🔄 关闭深度思考，切换到 chat 模型')
      selectedModel = 'deepseek-chat'
    }
    
    // 如果是编辑模式，优先处理编辑逻辑，不管生成模式是什么
    if (isEditMode) {
      console.log('🔧 编辑模式：修改现有内容')
      
      // 编辑模式下强制使用 chat 模型
      // 因为 reasoner 模型在编辑任务中可能不返回正确的 JSON 格式
      const editModel = selectedModel.includes('reasoner') ? 'deepseek-chat' : selectedModel
      
      if (selectedModel.includes('reasoner')) {
        console.log('⚠️ 编辑模式不支持 reasoner 模型，自动切换到 chat 模型')
      }
      
      setIsThinking(true)
      setIsGenerating(true)
      setHasStartedGenerating(false)
      onStreamingChange?.(true)

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

      let accumulatedContent = ''
      const plainTextContent = editor.getText()

      await executeAIEdit({
        documentContent: plainTextContent,
        userRequest: userInput,
        model: editModel,  // 使用 chat 模型
        onReasoning: (reasoning) => {
          updateLastMessage(msg => ({
            ...msg,
            reasoning: (msg.reasoning || '') + reasoning
          }))
        },
        onChunk: (chunk) => {
          accumulatedContent += chunk
          if (!params.setHasStartedGenerating && accumulatedContent.trim()) {
            setHasStartedGenerating(true)
          }
        },
        onStructured: (data) => {
          console.log('📝 收到结构化修改建议')
          setIsThinking(false)
          setHasStartedGenerating(false)
          
          const duration = (Date.now() - startTime) / 1000
          const tokens = Math.ceil((plainTextContent.length + userInput.length + accumulatedContent.length) / 2)
          const cost = tokens * 0.000001
          
          updateLastMessage(msg => ({
            ...msg,
            content: `根据你的描述，我将为你${data.reasoning || '修改文档'}。\n\n修改建议已在编辑器中标记（删除线 + 绿色高亮），请 hover 查看并选择接受或拒绝。`,
            isStreaming: false,
            stats: { duration, tokens, cost }
          }))
          
          if (onSuggestionsReceived) {
            onSuggestionsReceived(data as AIEditResponse, false)
          }
        },
        onComplete: () => {
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
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
          onStreamingChange?.(false)
          
          console.error('AI 编辑错误:', error)
          updateLastMessage(msg => ({
            ...msg,
            content: '抱歉，处理你的请求时出错了。请重试。',
            isStreaming: false
          }))
        },
      })
      
      return  // 编辑模式处理完成，直接返回
    }
    
    // 大纲模式（只在非编辑模式下执行）
    if (generationMode === 'outline') {
      setIsThinking(true)
      
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
        console.log('🎯 开始生成大纲')
        
        await generateOutline(userInput, documentId, selectedModel, (thinking: string) => {
          updateLastMessage(msg => ({
            ...msg,
            reasoning: (msg.reasoning || '') + thinking
          }))
        })
        
        const duration = (Date.now() - startTime) / 1000
        const tokens = Math.ceil((userInput.length + 500) / 2)
        const cost = tokens * 0.000001
        
        updateLastMessage(msg => ({
          ...msg,
          content: '大纲已生成，请在右侧编辑后点击"基于大纲生成文档"按钮。',
          isStreaming: false,
          stats: { duration, tokens, cost }
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
    
    // 生成模式：清空编辑器，生成新内容
    console.log('✨ 生成模式：创建新内容')
    
    setIsThinking(true)
    setIsGenerating(true)
    setHasStartedGenerating(false)
    onStreamingChange?.(true)
    
    // 清空编辑器内容
    editor.commands.clearContent()
      setGeneratedContent('')

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

      let accumulatedContent = ''
      let updateTimer: ReturnType<typeof setTimeout> | null = null
      let lastUpdateTime = 0
      const UPDATE_INTERVAL = 100

      await streamChatAPI({
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage.content },
        ],
        model: selectedModel,
        onReasoning: (reasoning) => {
          updateLastMessage(msg => ({
            ...msg,
            reasoning: (msg.reasoning || '') + reasoning
          }))
        },
        onChunk: (chunk) => {
          accumulatedContent += chunk
          
          if (!params.setHasStartedGenerating && accumulatedContent.trim()) {
            setHasStartedGenerating(true)
            setIsThinking(false)
            
            updateLastMessage(msg => ({
              ...msg,
              isGeneratingToEditor: true
            }))
          }
          
          setGeneratedContent(accumulatedContent)
          
          const now = Date.now()
          if (now - lastUpdateTime >= UPDATE_INTERVAL) {
            lastUpdateTime = now
            updateEditorContent(editor, accumulatedContent)
          } else {
            if (updateTimer) clearTimeout(updateTimer)
            updateTimer = setTimeout(() => {
              updateEditorContent(editor, accumulatedContent)
              lastUpdateTime = Date.now()
            }, UPDATE_INTERVAL)
          }
        },
        onComplete: () => {
          if (updateTimer) clearTimeout(updateTimer)
          updateEditorContent(editor, accumulatedContent)
          
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
          onStreamingChange?.(false)
          
          const duration = (Date.now() - startTime) / 1000
          const tokens = Math.ceil((userInput.length + accumulatedContent.length) / 2)
          const cost = tokens * 0.000001
          
          updateLastMessage(msg => ({
            ...msg,
            isStreaming: false,
            isGeneratingToEditor: false,
            content: accumulatedContent,
            stats: { duration, tokens, cost }
          }))
        },
        onError: (error) => {
          setIsThinking(false)
          setIsGenerating(false)
          setHasStartedGenerating(false)
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

  const handleStop = () => {
    setIsGenerating(false)
    setIsThinking(false)
    setHasStartedGenerating(false)
    onStreamingChange?.(false)
  }

  const handleUndo = () => {
    if (!editor) return
    editor.commands.clearContent()
    setGeneratedContent('')
    onStreamingChange?.(false)
  }

  const handleGenerateFromOutline = async () => {
    if (!outline || !editor) return

    setIsGenerating(true)
    setIsThinking(true)
    onStreamingChange?.(true)

    const documentModel = model.includes('reasoner') ? 'deepseek-chat' : model

    try {
      const response = await fetch('/api/ai/generate-from-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          outline: outline.nodes,
          originalPrompt: messages.find(m => m.role === 'user')?.content || '',
          model: documentModel,
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      let buffer = ''
      let accumulatedContent = ''
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
              
              let cleanContent = accumulatedContent
              cleanContent = cleanContent.replace(/^```(?:markdown|md)?\s*\n?/i, '')
              cleanContent = cleanContent.replace(/\n?```\s*$/i, '')
              cleanContent = cleanContent.replace(/^好的[，,].*?[。\.]\s*\n*/i, '')
              cleanContent = cleanContent.replace(/^根据.*?[，,].*?[：:]\s*\n*/i, '')
              cleanContent = cleanContent.trim()
              
              updateEditorContent(editor, cleanContent)
              setGeneratedContent(cleanContent)
            } else if (data.type === 'error') {
              throw new Error(data.data.error || 'Unknown error')
            }
          }
        }
      }

      clearOutline()
      setIsThinking(false)
      setIsGenerating(false)
      onStreamingChange?.(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate document'
      console.error('Document generation error:', err)
      setIsThinking(false)
      setIsGenerating(false)
      onStreamingChange?.(false)
      alert(`生成文档失败: ${message}`)
    }
  }

  return {
    handleSend,
    handleStop,
    handleUndo,
    handleGenerateFromOutline,
  }
}
