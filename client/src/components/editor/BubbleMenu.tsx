/**
 * 浮动工具栏（选中文字时显示）
 * 只显示改写功能
 */

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { AICommandType } from '../../types/aiCommand'

interface BubbleMenuProps {
  editor: Editor
  onAICommand?: (type: AICommandType) => void
  isDialogOpen?: boolean
}

function BubbleMenuComponent({ editor, onAICommand, isDialogOpen }: BubbleMenuProps) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })


  useEffect(() => {
    if (!editor) return

    const updateMenu = () => {
      const { state, view } = editor
      const { from, to } = state.selection
      const isTextSelected = from !== to

      // 如果对话框打开，不显示菜单
      if (isTextSelected && !isDialogOpen) {
        // 获取选区的位置
        const start = view.coordsAtPos(from)
        const end = view.coordsAtPos(to)
        
        // 计算菜单位置（选区上方居中）
        const left = (start.left + end.left) / 2
        const top = start.top - 10 // 在选区上方 10px
        
        setPosition({ top, left })
        setShow(true)
        console.log('显示菜单', { top, left })
      } else {
        setShow(false)
        console.log('隐藏菜单')
      }
    }

    editor.on('selectionUpdate', updateMenu)
    editor.on('transaction', updateMenu)

    return () => {
      editor.off('selectionUpdate', updateMenu)
      editor.off('transaction', updateMenu)
    }
  }, [editor, isDialogOpen])

  if (!editor || !onAICommand || !show) {
    return null
  }

  const handleRewrite = (e: React.MouseEvent) => {
    console.log('🔥 改写按钮被点击 - 事件触发')
    e.preventDefault()
    e.stopPropagation()
    console.log('🔥 调用 onAICommand', { type: 'rewrite', hasCallback: !!onAICommand })
    
    // 隐藏菜单
    setShow(false)
    
    // 调用 AI 指令（不清除选区，让对话框使用选区信息）
    onAICommand('rewrite')
  }

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    console.log('🖱️ 按钮 mouseDown - 阻止默认行为')
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className="fixed flex flex-col bg-white rounded-lg border border-gray-200 shadow-xl py-1 min-w-[120px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => {
        // 阻止编辑器失去焦点
        console.log('🖱️ 菜单容器 mouseDown - 阻止默认行为')
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* 改写 */}
      <button
        onMouseDown={handleButtonMouseDown}
        onClick={handleRewrite}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer w-full"
        style={{ pointerEvents: 'auto' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        改写
      </button>
    </div>
  )
}

export default BubbleMenuComponent
