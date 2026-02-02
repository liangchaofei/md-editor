/**
 * AI 指令对话框组件
 * 用于执行 AI 快捷指令（改写、续写、扩写、总结、翻译）
 * 显示为悬浮在选中文本下方的对话框
 */

import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
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
  const [abortController, setAbortController] = useState<AbortController | null>(null)

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

    // 创建中断控制器
    const controller = new AbortController()
    setAbortController(controller)

    await executeAICommand({
      type,
      context: {
        selectedText: context.selectedText,
        beforeText: context.beforeText,
        afterText: context.afterText,
      },
      userInput: input || undefined,
      model: 'deepseek-chat',
      signal: controller.signal,  // 传递中断信号
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
        setAbortController(null)
      },
      onError: (error) => {
        setIsThinking(false)
        setIsGenerating(false)
        setAbortController(null)
        console.error('AI 指令错误:', error)
        alert('AI 指令执行失败，请重试')
      },
    })
  }

  // 替换原文
  const handleReplace = async () => {
    if (!originalSelection || !generatedContent) return

    const { from, to } = originalSelection

    // 不使用 Markdown 转换，直接插入纯文本
    // 这样可以避免添加 <p> 标签导致换行
    const textContent = generatedContent

    // 一次性完成：选中 -> 删除 -> 插入纯文本
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .deleteSelection()
      .insertContent(textContent)
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
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
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

  // 计算对话框位置
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (isOpen && editor) {
      const { from, to } = editor.state.selection
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)
      
      // 计算选中文本的中心位置
      const left = (start.left + end.left) / 2
      const top = end.bottom + 10 // 在选中文本下方 10px
      
      setPosition({ top, left })
    }
  }, [isOpen, editor])

  if (!isOpen || !position) return null

  // 如果正在生成或已生成内容，显示完整对话框
  if (generatedContent || isThinking || isGenerating) {
    return (
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        }}
      >
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        <div className="border-t border-gray-200 px-4 py-3">
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
        </div>
      </div>
    )
  }

  // 初始状态：显示输入框和快捷菜单
  return (
    <>
      {/* 输入框 */}
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '600px',
        }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="说说想怎么修改当前内容？"
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleExecute()
              } else if (e.key === 'Escape') {
                handleCancel()
              }
            }}
          />
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="语音输入"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            onClick={handleExecute}
            className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            title="发送"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 快捷菜单 */}
      <QuickMenu
        position={position}
        onSelect={(text) => {
          setInput(text)
        }}
      />
    </>
  )
}

// 快捷菜单组件
interface QuickMenuProps {
  position: { top: number; left: number }
  onSelect: (text: string) => void
}

function QuickMenu({ position, onSelect }: QuickMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const menuItems = [
    {
      id: 'polish',
      label: '润色',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      submenu: [
        { label: '更正式', text: '使语气更正式' },
        { label: '更活泼', text: '使语气更活泼' },
        { label: '更学术', text: '转换为学术风格' },
        { label: '党政风', text: '转换为党政风格' },
        { label: '口语化', text: '转换为口语化表达' },
      ],
    },
    {
      id: 'continue',
      label: '续写',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      text: '续写这段内容，保持风格一致',
    },
    {
      id: 'expand',
      label: '扩写',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      ),
      text: '扩写这段内容，增加更多细节',
    },
    {
      id: 'summarize',
      label: '缩写',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ),
      text: '缩写这段内容，保留核心要点',
    },
  ]

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2"
      style={{
        top: `${position.top + 60}px`,
        left: `${position.left}px`,  // 左对齐，不居中
        width: '200px',
      }}
    >
      {menuItems.map((item) => (
        <div
          key={item.id}
          className="relative"
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            onClick={() => {
              if (item.text) {
                onSelect(item.text)
              }
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.submenu && (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {/* 二级菜单 */}
          {item.submenu && hoveredItem === item.id && (
            <div
              className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-48"
              style={{ zIndex: 51 }}
            >
              {item.submenu.map((subitem, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(subitem.text)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {subitem.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default AICommandDialog
