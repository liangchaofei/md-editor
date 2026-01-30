/**
 * AI 指令对话框组件
 * 用于执行 AI 快捷指令（改写、续写、扩写、总结、翻译）
 */

import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { marked } from 'marked'
import { executeAICommand } from '../../api/ai'
import type { AICommandType } from '../../types/aiCommand'

interface AICommandDialogProps {
  editor: Editor
  type: AICommandType
  isOpen: boolean
  onClose: () => void
}

function AICommandDialog({ editor, type, isOpen, onClose }: AICommandDialogProps) {
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [showReasoning, setShowReasoning] = useState(true)
  const [originalSelection, setOriginalSelection] = useState<{ from: number; to: number } | null>(null)

  // 获取指令标题和提示
  const getCommandInfo = () => {
    switch (type) {
      case 'rewrite':
        return {
          title: '改写',
          placeholder: '说说想怎么修改当前内容？（可选）',
          needsInput: false,
        }
      case 'continue':
        return {
          title: '续写',
          placeholder: '',
          needsInput: false,
        }
      case 'expand':
        return {
          title: '扩写',
          placeholder: '',
          needsInput: false,
        }
      case 'summarize':
        return {
          title: '总结',
          placeholder: '',
          needsInput: false,
        }
      case 'translate':
        return {
          title: '翻译',
          placeholder: '',
          needsInput: false,
        }
      default:
        return {
          title: 'AI 指令',
          placeholder: '',
          needsInput: false,
        }
    }
  }

  const commandInfo = getCommandInfo()

  // 提取上下文
  const extractContext = () => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    
    // 提取前后文（各 500 字符）
    const beforeText = editor.state.doc.textBetween(Math.max(0, from - 500), from, '\n')
    const afterText = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 500), '\n')

    return {
      selectedText,
      beforeText,
      afterText,
      from,
      to,
    }
  }

  // 执行指令
  const handleExecute = async () => {
    const context = extractContext()
    
    // 保存原始选区
    setOriginalSelection({ from: context.from, to: context.to })
    
    setIsThinking(true)
    setIsGenerating(false)
    setGeneratedContent('')
    setReasoning('')

    let accumulatedContent = ''

    await executeAICommand({
      type,
      context: {
        selectedText: context.selectedText,
        beforeText: context.beforeText,
        afterText: context.afterText,
      },
      userInput: input || undefined,
      model: 'deepseek-chat',
      onReasoning: (chunk) => {
        setReasoning(prev => prev + chunk)
      },
      onChunk: (chunk) => {
        if (!isGenerating) {
          setIsThinking(false)
          setIsGenerating(true)
        }
        accumulatedContent += chunk
        setGeneratedContent(accumulatedContent)
      },
      onComplete: () => {
        setIsThinking(false)
        setIsGenerating(false)
      },
      onError: (error) => {
        setIsThinking(false)
        setIsGenerating(false)
        console.error('AI 指令错误:', error)
        alert('AI 指令执行失败，请重试')
      },
    })
  }

  // 替换原文
  const handleReplace = async () => {
    if (!originalSelection || !generatedContent) return

    const { from, to } = originalSelection

    // 将 Markdown 转换为 HTML
    const html = marked.parse(generatedContent, { async: false }) as string

    // 一次性完成：选中 -> 删除 -> 插入
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .deleteSelection()
      .insertContent(html)
      .run()

    // 获取当前光标位置（插入后的结束位置）
    const currentPos = editor.state.selection.to

    // 选中新插入的内容（从原始 from 到当前位置）
    editor.chain().setTextSelection({ from, to: currentPos }).run()

    // 添加临时高亮样式到选中区域
    const styleId = 'ai-temp-highlight-style'
    let style = document.getElementById(styleId) as HTMLStyleElement
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    style.textContent = `
      .ProseMirror ::selection {
        background-color: #fef08a !important;
      }
      .ProseMirror ::-moz-selection {
        background-color: #fef08a !important;
      }
    `

    // 监听点击事件，点击任意位置移除高亮
    const handleClick = () => {
      // 移除样式
      const styleEl = document.getElementById(styleId)
      if (styleEl) {
        styleEl.remove()
      }
      
      // 清除选区，将光标移到末尾
      editor.commands.focus()
      editor.commands.setTextSelection(currentPos)
      
      // 移除监听器
      document.removeEventListener('click', handleClick)
    }

    // 延迟添加监听器，避免立即触发
    setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 100)

    // 关闭对话框
    onClose()
  }

  // 放弃
  const handleCancel = () => {
    setGeneratedContent('')
    setReasoning('')
    setInput('')
    onClose()
  }

  // 停止生成
  const handleStop = () => {
    setIsGenerating(false)
    setIsThinking(false)
  }

  // 重置状态并自动执行续写
  useEffect(() => {
    if (isOpen) {
      setInput('')
      setGeneratedContent('')
      setReasoning('')
      setIsThinking(false)
      setIsGenerating(false)
      setOriginalSelection(null)
      
      // 续写功能自动执行
      if (type === 'continue') {
        // 使用 setTimeout 确保状态已重置
        setTimeout(() => {
          handleExecute()
        }, 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">{commandInfo.title}</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 输入框（仅改写需要） */}
          {type === 'rewrite' && !generatedContent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {commandInfo.placeholder}
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：使语气更正式、简化表达、增加细节等"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                rows={3}
                disabled={isThinking || isGenerating}
              />
            </div>
          )}

          {/* 思考过程 */}
          {reasoning && (
            <div>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors w-full"
              >
                <svg className={`w-4 h-4 transition-transform ${showReasoning ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {isThinking ? (
                  <>
                    <svg className="w-4 h-4 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-green-700">正在思考中</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">思考完成</span>
                  </>
                )}
              </button>
              {showReasoning && (
                <div className="mt-2 bg-gradient-to-br from-purple-50 to-blue-50 border-l-4 border-purple-400 rounded-r-lg px-4 py-3 shadow-sm max-h-40 overflow-y-auto">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {reasoning}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 生成的内容 */}
          {generatedContent && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-purple-700">内容生成中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-700">内容生成完成</span>
                  </>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 max-h-60 overflow-y-auto">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {generatedContent}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="border-t border-gray-200 px-6 py-4">
          {!generatedContent ? (
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleExecute}
                disabled={isThinking || isGenerating}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isThinking ? '思考中...' : isGenerating ? '生成中...' : '执行'}
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              {isGenerating && (
                <button
                  onClick={handleStop}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                >
                  停止
                </button>
              )}
              {!isGenerating && (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    放弃
                  </button>
                  <button
                    onClick={handleReplace}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    替换原文
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AICommandDialog
