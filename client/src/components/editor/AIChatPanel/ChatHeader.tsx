/**
 * 对话面板头部组件
 */

import { AVAILABLE_MODELS, getModelInfo } from '../../../utils/modelPreferences'

interface ChatHeaderProps {
  hasMessages: boolean
  model: string
  isThinking: boolean
  onClearHistory: () => void
  onModelChange: (model: string) => void
  onClose: () => void
}

export default function ChatHeader({
  hasMessages,
  model,
  isThinking,
  onClearHistory,
  onModelChange,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2">
      {/* 清空历史按钮 */}
      {hasMessages && (
        <button
          onClick={() => {
            if (confirm('确定要清空对话历史吗？')) {
              onClearHistory()
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
          onChange={(e) => onModelChange(e.target.value)}
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
  )
}
