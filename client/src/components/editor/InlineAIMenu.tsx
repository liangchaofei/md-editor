/**
 * EnhancedBubbleMenu 组件
 * 增强版 AI 指令浮动菜单（选中文本触发）
 */

import { useState, useRef, useEffect } from 'react'

interface EnhancedBubbleMenuProps {
  isOpen: boolean
  onClose: () => void
  onExecute: (command: string, customInput?: string) => void
  isGenerating?: boolean
}

// 预设指令列表
const PRESET_COMMANDS = [
  { id: 'polish', label: '润色', icon: '✨', description: '优化文字表达' },
  { id: 'continue', label: '续写', icon: '➡️', description: '根据上文继续写作' },
  { id: 'expand', label: '扩写', icon: '📝', description: '详细展开内容' },
  { id: 'summarize', label: '缩写', icon: '📋', description: '精简压缩内容' },
  { id: 'formal', label: '更正式', icon: '🎩', description: '转换为正式语气' },
  { id: 'casual', label: '更活泼', icon: '😊', description: '转换为活泼语气' },
  { id: 'academic', label: '更学术', icon: '🎓', description: '转换为学术风格' },
  { id: 'official', label: '党政风', icon: '🏛️', description: '转换为党政风格' },
  { id: 'spoken', label: '口语化', icon: '💬', description: '转换为口语表达' },
]

function EnhancedBubbleMenu({ isOpen, onClose, onExecute, isGenerating }: EnhancedBubbleMenuProps) {
  const [customInput, setCustomInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCommandClick = (commandId: string) => {
    onExecute(commandId)
  }

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onExecute('custom', customInput)
      setCustomInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80"
    >
      {/* 输入框 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="说说想怎么修改当前内容？"
            disabled={isGenerating}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={() => setIsRecording(!isRecording)}
            disabled={isGenerating}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            title="语音输入"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            onClick={handleCustomSubmit}
            disabled={!customInput.trim() || isGenerating}
            className="p-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
            title="发送"
          >
            {isGenerating ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 预设指令列表 */}
      <div className="max-h-96 overflow-y-auto">
        {PRESET_COMMANDS.map((command) => (
          <button
            key={command.id}
            onClick={() => handleCommandClick(command.id)}
            disabled={isGenerating}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">{command.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{command.label}</div>
              <div className="text-xs text-gray-500">{command.description}</div>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

export default EnhancedBubbleMenu
