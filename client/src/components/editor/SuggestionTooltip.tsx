/**
 * SuggestionTooltip 组件
 * 显示在建议文本上的 tooltip，提供接受/拒绝按钮
 */

import { useEffect, useState, useRef } from 'react'
import type { SuggestedChange } from '../../types/suggestion'

interface SuggestionTooltipProps {
  suggestion: SuggestedChange
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

function SuggestionTooltip({ suggestion, onAccept, onReject }: SuggestionTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false)
  const [isHoveringElement, setIsHoveringElement] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 查找对应的 DOM 元素
    const element = document.querySelector(
      `[data-suggestion-id="${suggestion.id}"]`
    ) as HTMLElement

    if (!element) return

    const handleMouseEnter = () => {
      // 清除隐藏定时器
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      
      setIsHoveringElement(true)
      
      const rect = element.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      })
      setIsVisible(true)
    }

    const handleMouseLeave = () => {
      setIsHoveringElement(false)
      
      // 延迟隐藏，给用户时间移动到 tooltip（增加到 500ms）
      hideTimeoutRef.current = setTimeout(() => {
        if (!isHoveringTooltip) {
          setIsVisible(false)
        }
      }, 500)
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [suggestion.id, isHoveringTooltip])
  
  // 当鼠标离开 tooltip 时，检查是否还在元素上
  useEffect(() => {
    if (!isHoveringTooltip && !isHoveringElement && isVisible) {
      // 延迟隐藏
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, 300)
    }
    
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [isHoveringTooltip, isHoveringElement, isVisible])

  if (!isVisible || !position) {
    return null
  }

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseEnter={() => {
        setIsHoveringTooltip(true)
        // 清除隐藏定时器
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
        setIsVisible(true)
      }}
      onMouseLeave={() => {
        setIsHoveringTooltip(false)
        // 延迟隐藏
        hideTimeoutRef.current = setTimeout(() => {
          if (!isHoveringElement) {
            setIsVisible(false)
          }
        }, 300)
      }}
    >
      <div className="flex items-center gap-2">
        {/* 拒绝按钮 */}
        <button
          onClick={() => onReject(suggestion.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          title="拒绝此修改"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          拒绝
        </button>

        {/* 接受按钮 */}
        <button
          onClick={() => onAccept(suggestion.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          title="接受此修改"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          接受
        </button>
      </div>

      {/* 修改说明 */}
      {suggestion.description && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">{suggestion.description}</p>
        </div>
      )}
    </div>
  )
}

export default SuggestionTooltip
