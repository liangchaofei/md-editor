/**
 * DragHandle 组件
 * 简化版本，更稳定可靠
 */

import { useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface DragHandleProps {
  editor: Editor | null
}

function DragHandle({ editor }: DragHandleProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [currentPos, setCurrentPos] = useState<number | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (!editor) return

    const editorElement = document.querySelector('.ProseMirror')
    if (!editorElement) return

    let currentBlock: Element | null = null

    const updateHandle = (blockElement: Element) => {
      const rect = blockElement.getBoundingClientRect()
      const blockHeight = rect.height
      const handleHeight = 24
      
      setPosition({
        top: rect.top + (blockHeight - handleHeight) / 2,
        left: rect.left - 28,
      })

      // 获取节点位置
      const pos = editor.view.posAtDOM(blockElement as Node, 0)
      setCurrentPos(pos)
      setIsVisible(true)
      currentBlock = blockElement
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // 如果鼠标在手柄上，不做任何处理
      if (handleRef.current?.contains(target)) {
        return
      }

      // 首先尝试查找块级元素（不包括 li）
      let blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, pre, blockquote, .tableWrapper') as Element | null
      
      // 如果没找到块级元素，检查是否在列表中
      if (!blockElement) {
        // 查找最近的列表容器（ul 或 ol）
        const listContainer = target.closest('ul, ol') as Element | null
        if (listContainer && editorElement.contains(listContainer)) {
          blockElement = listContainer
        }
      }
      
      if (blockElement && editorElement.contains(blockElement)) {
        // 避免在同一个块上重复更新
        if (currentBlock === blockElement) {
          return
        }
        updateHandle(blockElement)
      } else if (currentBlock) {
        // 检查是否在当前块的左侧区域
        const rect = currentBlock.getBoundingClientRect()
        if (e.clientX >= rect.left - 40 && e.clientX <= rect.left &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          return // 保持显示
        }
        setIsVisible(false)
        currentBlock = null
      } else {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [editor])

  const handleDragStart = (e: React.DragEvent) => {
    if (!editor || currentPos === null) return

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', currentPos.toString())

    // 自定义拖拽预览
    const dragImage = document.createElement('div')
    dragImage.textContent = '⋮⋮'
    dragImage.style.cssText = 'position: absolute; top: -1000px; padding: 4px 8px; background: #3b82f6; color: white; border-radius: 4px; font-size: 14px;'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)

    // 选中被拖拽的节点
    const $pos = editor.state.doc.resolve(currentPos)
    const node = $pos.nodeAfter
    if (node) {
      editor.commands.setTextSelection({ 
        from: currentPos, 
        to: currentPos + node.nodeSize 
      })
    }
  }

  const handleDragEnd = () => {
    setIsVisible(false)
  }

  const handleClick = () => {
    if (!editor || currentPos === null) return

    const $pos = editor.state.doc.resolve(currentPos)
    const node = $pos.nodeAfter
    if (node) {
      editor.commands.setTextSelection({ 
        from: currentPos, 
        to: currentPos + node.nodeSize 
      })
    }
    setShowMenu(true)
  }

  const handleDelete = () => {
    if (!editor || currentPos === null) return

    const $pos = editor.state.doc.resolve(currentPos)
    const node = $pos.nodeAfter
    if (node) {
      editor.chain()
        .focus()
        .deleteRange({ from: currentPos, to: currentPos + node.nodeSize })
        .run()
    }
    setShowMenu(false)
    setIsVisible(false)
  }

  const handleDuplicate = () => {
    if (!editor || currentPos === null) return

    const $pos = editor.state.doc.resolve(currentPos)
    const node = $pos.nodeAfter
    if (node) {
      editor.chain()
        .focus()
        .insertContentAt(currentPos + node.nodeSize, node.toJSON())
        .run()
    }
    setShowMenu(false)
  }

  if (!isVisible || !editor) return null

  return (
    <>
      <div
        ref={handleRef}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className="fixed z-50 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded p-1 transition-colors"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        title="拖动排序"
      >
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
            style={{
              top: `${position.top}px`,
              left: `${position.left + 40}px`,
            }}
          >
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </button>
            <div className="my-1 border-t border-gray-200" />
            <button
              onClick={() => setShowMenu(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              取消
            </button>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
        </>
      )}
    </>
  )
}

export default DragHandle
