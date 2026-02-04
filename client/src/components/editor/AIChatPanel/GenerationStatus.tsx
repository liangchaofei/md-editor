/**
 * 生成状态提示组件
 */

interface GenerationStatusProps {
  isGenerating: boolean
  generatedContent: string
  onUndo: () => void
  onConfirm: () => void
  onStop: () => void
}

export default function GenerationStatus({
  isGenerating,
  generatedContent,
  onUndo,
  onConfirm,
  onStop,
}: GenerationStatusProps) {
  if (isGenerating) {
    return (
      <div className="mb-3 flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-purple-700">
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>正在生成内容到编辑器...</span>
        </div>
        <button
          onClick={onStop}
          className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
        >
          停止
        </button>
      </div>
    )
  }

  if (generatedContent) {
    return (
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
              onClick={onUndo}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              撤销
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
