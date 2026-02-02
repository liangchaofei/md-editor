/**
 * ContextMenu 组件
 * 编辑器右键菜单
 */

import { useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import type { AICommandType } from '../../types/aiCommand'

export interface MenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  action: () => void
  divider?: boolean
  disabled?: boolean
  hidden?: boolean
}

export interface MenuGroup {
  id: string
  label?: string
  items: MenuItem[]
}

interface ContextMenuProps {
  editor: Editor | null
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  onAICommand?: (type: AICommandType) => void
}

function ContextMenu({ editor, isOpen, position, onClose, onAICommand }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // 计算菜单位置，避免超出屏幕
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = position.x
    let y = position.y

    // 右边界检测
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10
    }

    // 下边界检测
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10
    }

    // 左边界检测
    if (x < 10) {
      x = 10
    }

    // 上边界检测
    if (y < 10) {
      y = 10
    }

    setAdjustedPosition({ x, y })
  }, [isOpen, position])

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // 延迟添加监听器，避免立即触发
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !editor) return null

  // 获取选中的文本
  const { from, to } = editor.state.selection
  const selectedText = editor.state.doc.textBetween(from, to, ' ')
  const hasSelection = selectedText.length > 0

  // 构建菜单项
  const menuGroups: MenuGroup[] = []

  // AI 操作组（仅在有选中文本时显示）
  if (hasSelection && onAICommand) {
    menuGroups.push({
      id: 'ai',
      label: 'AI 操作',
      items: [
        {
          id: 'ai-rewrite',
          label: '改写',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          action: () => {
            onAICommand('rewrite')
            onClose()
          },
        },
        {
          id: 'ai-translate',
          label: '翻译',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          ),
          action: () => {
            onAICommand('translate')
            onClose()
          },
        },
        {
          id: 'ai-summarize',
          label: '总结',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          action: () => {
            onAICommand('summarize')
            onClose()
          },
        },
        {
          id: 'ai-expand',
          label: '扩写',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          ),
          action: () => {
            onAICommand('expand')
            onClose()
          },
        },
        {
          id: 'ai-shorten',
          label: '缩写',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ),
          action: () => {
            // 缩写功能（使用改写，但提示缩短）
            onAICommand('rewrite')
            onClose()
          },
        },
      ],
    })
  }

  // 格式化操作组（仅在有选中文本时显示）
  if (hasSelection) {
    menuGroups.push({
      id: 'format',
      label: '格式化',
      items: [
        {
          id: 'bold',
          label: '加粗',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          ),
          shortcut: 'Ctrl+B',
          action: () => {
            editor.chain().focus().toggleBold().run()
            onClose()
          },
        },
        {
          id: 'italic',
          label: '斜体',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          shortcut: 'Ctrl+I',
          action: () => {
            editor.chain().focus().toggleItalic().run()
            onClose()
          },
        },
        {
          id: 'underline',
          label: '下划线',
          shortcut: 'Ctrl+U',
          action: () => {
            editor.chain().focus().toggleUnderline().run()
            onClose()
          },
        },
        {
          id: 'strike',
          label: '删除线',
          shortcut: 'Ctrl+Shift+X',
          action: () => {
            editor.chain().focus().toggleStrike().run()
            onClose()
          },
        },
        {
          id: 'highlight',
          label: '高亮',
          shortcut: 'Ctrl+Shift+H',
          action: () => {
            editor.chain().focus().toggleHighlight().run()
            onClose()
          },
        },
      ],
    })
  }

  // 编辑操作组
  const editItems: MenuItem[] = []

  if (hasSelection) {
    editItems.push(
      {
        id: 'copy',
        label: '复制',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
        shortcut: 'Ctrl+C',
        action: () => {
          document.execCommand('copy')
          onClose()
        },
      },
      {
        id: 'cut',
        label: '剪切',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
        ),
        shortcut: 'Ctrl+X',
        action: () => {
          document.execCommand('cut')
          onClose()
        },
      },
      {
        id: 'delete',
        label: '删除',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        shortcut: 'Delete',
        action: () => {
          editor.chain().focus().deleteSelection().run()
          onClose()
        },
      }
    )
  }

  editItems.push({
    id: 'paste',
    label: '粘贴',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    shortcut: 'Ctrl+V',
    action: () => {
      document.execCommand('paste')
      onClose()
    },
  })

  if (editItems.length > 0) {
    menuGroups.push({
      id: 'edit',
      items: editItems,
    })
  }

  // 插入操作组（仅在无选中文本时显示）
  if (!hasSelection) {
    menuGroups.push({
      id: 'insert',
      label: '插入',
      items: [
        {
          id: 'table',
          label: '表格',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          action: () => {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            onClose()
          },
        },
        {
          id: 'image',
          label: '图片',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          action: () => {
            const url = prompt('请输入图片 URL:')
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
            onClose()
          },
        },
        {
          id: 'link',
          label: '链接',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
          action: () => {
            const url = prompt('请输入链接 URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
            onClose()
          },
        },
        {
          id: 'code-block',
          label: '代码块',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          shortcut: 'Ctrl+Shift+C',
          action: () => {
            editor.chain().focus().toggleCodeBlock().run()
            onClose()
          },
        },
      ],
    })
  }

  // 全选（始终显示）
  menuGroups.push({
    id: 'select',
    items: [
      {
        id: 'select-all',
        label: '全选',
        shortcut: 'Ctrl+A',
        action: () => {
          editor.commands.selectAll()
          onClose()
        },
      },
    ],
  })

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-white rounded-lg shadow-xl border border-gray-200 py-1"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {menuGroups.map((group, groupIndex) => (
        <div key={group.id}>
          {group.label && (
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            if (item.hidden) return null

            return (
              <button
                key={item.id}
                onClick={item.action}
                disabled={item.disabled}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex items-center gap-2">
                  {item.icon && <span className="text-gray-500">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-gray-400">{item.shortcut}</span>
                )}
              </button>
            )
          })}
          {groupIndex < menuGroups.length - 1 && (
            <div className="my-1 border-t border-gray-200" />
          )}
        </div>
      ))}
    </div>
  )
}

export default ContextMenu
