/**
 * 可拖拽的分隔线组件
 * 用于调整编辑器和 AI 面板的宽度
 */

import { useEffect, useRef } from 'react'

interface ResizableHandleProps {
  onResize: (deltaX: number) => void
}

function ResizableHandle({ onResize }: ResizableHandleProps) {
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      
      const deltaX = e.clientX - startXRef.current
      startXRef.current = e.clientX
      onResize(deltaX)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onResize])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    startXRef.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      className="group relative w-1 cursor-col-resize bg-gray-200 hover:bg-purple-400 transition-colors"
      onMouseDown={handleMouseDown}
    >
      {/* 拖拽提示 */}
      <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-12 w-1 rounded-full bg-purple-500" />
      </div>
    </div>
  )
}

export default ResizableHandle
