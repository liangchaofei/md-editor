/**
 * DragHandle 组件
 * 块级编辑的拖拽手柄
 */

import { useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface DragHandleProps {
  editor: Editor | null
}

function DragHandle({ editor }: DragHandleProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [currentNode, setCurrentNode] = useState<any>(null)
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

      const pos = editor.view.posAtDOM(blockElement as Node, 0)
      const node = editor.state.doc.nodeAt(pos)
      setCurrentNode({ pos, node })
      setIsVisible(true)
      currentBlock = blockElement
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // 如果鼠标在手柄上，不做任何处理
      if (handleRef.current?.contains(target)) {
        return
      }

      // 查找块级元素
      const blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, .tableWrapper')
      
      if (blockElement && editorElement.contains(blockElement)) {
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
    if (!editor || !currentNode) return

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', currentNode.pos.toString())

    const dragImage = document.createElement('div')
    dragImage.textContent = '⋮⋮'
    dragImage.style.cssText = 'position: absolute; top: -1000px; padding: 4px 8px; background: #3b82f6; color: white; border-radius: 4px;'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)

    const { pos, node } = currentNode
    if (node) {
      editor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize })
    }
  }

  const handleDragEnd = () => {
    setIsVisible(false)
  }

  const handleClick = () => {
    if (!editor || !currentNode) return

    const { pos, node } = currentNode
    if (node) {
      editor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize })
    }
    setShowMenu(true)
  }

  const handleDelete = () => {
    if (!editor || !currentNode) return

    const { pos, node } = currentNode
    if (node) {
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
    }
    setShowMenu(false)
    setIsVisible(false)
  }

  const handleDuplicate = () => {
    if (!editor || !currentNode) return

    const { pos, node } = currentNode
    if (node) {
      editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run()
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
