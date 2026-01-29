/**
 * AI 对话面板组件
 * 用于显示 AI 对话界面
 */

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
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
        </div>
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

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm text-gray-500">您好，有什么可以帮您？</p>
            <p className="text-xs text-gray-400 mt-2">输入您的需求，AI 将帮助您创作内容</p>
          </div>
        </div>

        {/* 输入框 */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入您的需求..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIChatPanel
