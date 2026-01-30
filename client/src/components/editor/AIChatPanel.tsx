/**
 * AI 对话面板组件
 * 用于显示 AI 对话界面
 */

import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { streamChatAPI } from '../../api/ai'
import type { Message } from '../../types/message'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
}

function AIChatPanel({ isOpen, onClose, editor }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [model, setModel] = useState<'deepseek-chat' | 'deepseek-reasoner'>('deepseek-chat')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false) // 是否已开始生成正文
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
    if (!input.trim() || isThinking || !editor) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsThinking(true)
    setIsGenerating(true)
    setHasStartedGenerating(false) // 重置标记

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
      isGeneratingToEditor: false, // 初始为 false，开始生成正文时才设为 true
    }
    setMessages(prev => [...prev, aiMessage])

    let accumulatedContent = ''

    // 调用 AI API
    await streamChatAPI({
      messages: [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content },
      ],
      model,
      onReasoning: (reasoning) => {
        // 更新思考过程（只在对话面板显示）
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.reasoning = (lastMessage.reasoning || '') + reasoning
          }
          return newMessages
        })
      },
      onChunk: (chunk) => {
        // 累积内容
        accumulatedContent += chunk
        
        // 标记已开始生成正文（思考完成）
        if (!hasStartedGenerating && accumulatedContent.trim()) {
          setHasStartedGenerating(true)
          setIsThinking(false) // 思考结束
          
          // 更新消息状态：标记不再是纯思考状态
          setMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage.role === 'assistant') {
              lastMessage.isGeneratingToEditor = true
            }
            return newMessages
          })
        }
        
        // 只有在有内容时才更新编辑器
        // 注意：当前版本直接插入纯文本，Markdown格式需要手动应用
        // TODO: 在后续章节中集成完整的Markdown解析器
        if (accumulatedContent.trim() && editor && !editor.isDestroyed) {
          // 将换行转换为段落
          const paragraphs = accumulatedContent.split('\n\n').filter(p => p.trim())
          const html = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
          editor.commands.setContent(html || '<p></p>')
        }

        // 记录生成的内容
        setGeneratedContent(accumulatedContent)
      },
      onComplete: () => {
        setIsThinking(false)
        setIsGenerating(false)
        setHasStartedGenerating(false)
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.isStreaming = false
            lastMessage.isGeneratingToEditor = false
            // 保存生成的内容到消息中（用于显示摘要）
            lastMessage.content = accumulatedContent
          }
          return newMessages
        })
      },
      onError: (error) => {
        setIsThinking(false)
        setIsGenerating(false)
        setHasStartedGenerating(false)
        console.error('AI 错误:', error)
        setMessages(prev => prev.slice(0, -1))
      },
    })
  }

  // 停止生成
  const handleStop = () => {
    setIsGenerating(false)
    setIsThinking(false)
    setHasStartedGenerating(false)
  }

  // 撤销生成的内容
  const handleUndo = () => {
    if (!editor) return

    // 直接清空编辑器
    editor.commands.clearContent()

    // 重置状态
    setGeneratedContent('')
  }

  // 按 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">AI 写作助手</h2>
          {isThinking && (
            <span className="text-xs text-purple-600">正在思考中...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 模型选择 */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            disabled={isThinking}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
            title="选择模型"
          >
            <option value="deepseek-chat">普通模式</option>
            <option value="deepseek-reasoner">深度思考</option>
          </select>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="收起 AI 面板"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm text-gray-500">您好，有什么可以帮您？</p>
              <p className="text-xs text-gray-400 mt-2">输入您的需求，AI 将帮助您创作内容</p>
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
          
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的需求... (Enter 发送，Shift+Enter 换行)"
              disabled={isThinking}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
              rows={3}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isThinking || !editor}
              className="self-end rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isThinking ? '思考中...' : '发送'}
            </button>
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
              <div className="text-sm text-gray-600">
                内容已生成到编辑器，共 {message.content.length} 字
              </div>
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
