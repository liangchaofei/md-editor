/**
 * 单条消息组件
 */

import { useState } from 'react'
import type { Message } from '../../../types/message'

interface MessageItemProps {
  message: Message
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const [showReasoning, setShowReasoning] = useState(true)
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  
  const isThinking = !isUser && message.reasoning && message.isStreaming && !message.isGeneratingToEditor
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

        {/* 思考过程 */}
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
          <div className="rounded-lg px-4 py-3 shadow-sm bg-purple-600 text-white">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : message.content && !isGeneratingToEditor ? (
          <div className="rounded-lg border border-blue-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-900">
                  {(() => {
                    const firstLine = message.content.split('\n')[0].replace(/^#+\s*/, '').trim()
                    return firstLine.substring(0, 30) || '已生成内容'
                  })()}
                  {message.content.length > 30 && '...'}
                </span>
              </div>
            </div>
            
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 mb-2">
                创建时间: {new Date(message.timestamp).toLocaleString('zh-CN')}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                内容已生成到编辑器，共 {message.content.length} 字
              </div>
              
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
          </div>
        ) : null}
      </div>
    </div>
  )
}
