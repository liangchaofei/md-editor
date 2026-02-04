/**
 * 输入框组件
 */

import type { GenerationMode } from '../../../types/outline'
import GenerationStatus from './GenerationStatus'

interface ChatInputProps {
  input: string
  isThinking: boolean
  isGenerating: boolean
  generationMode: GenerationMode
  enableDeepThink: boolean
  model: string
  generatedContent: string
  onInputChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onUndo: () => void
  onConfirm: () => void
  onModeChange: (mode: GenerationMode) => void
  onDeepThinkChange: (enabled: boolean) => void
}

export default function ChatInput({
  input,
  isThinking,
  isGenerating,
  generationMode,
  enableDeepThink,
  model,
  generatedContent,
  onInputChange,
  onSend,
  onStop,
  onUndo,
  onConfirm,
  onModeChange,
  onDeepThinkChange,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t border-gray-200 p-4">
      <GenerationStatus
        isGenerating={isGenerating}
        generatedContent={generatedContent}
        onUndo={onUndo}
        onConfirm={onConfirm}
        onStop={onStop}
      />
      
      <div className="space-y-3">
        {/* 模式选择和深度思考 */}
        <div className="flex items-center gap-2 px-1">
          {/* 分步生成按钮 */}
          <button
            onClick={() => onModeChange(generationMode === 'outline' ? 'full' : 'outline')}
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

          {/* 深度思考开关 - 只在 deepseek-reasoner 模型下显示 */}
          {model === 'deepseek-reasoner' && (
            <button
              onClick={() => onDeepThinkChange(!enableDeepThink)}
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
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的需求... (Enter 发送，Shift+Enter 换行)"
            disabled={isThinking}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
            rows={3}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isThinking}
            className="self-end rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isThinking ? '思考中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}
