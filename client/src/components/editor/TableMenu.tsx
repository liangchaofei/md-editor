/**
 * 表格操作菜单
 */

import type { Editor } from '@tiptap/core'

interface TableMenuProps {
  editor: Editor
}

function TableMenu({ editor }: TableMenuProps) {
  if (!editor.isActive('table')) {
    return null
  }

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
      <button
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        ← 插入列
      </button>
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        插入列 →
      </button>
      <button
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        删除列
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      <button
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        ↑ 插入行
      </button>
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        插入行 ↓
      </button>
      <button
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        删除行
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      <button
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="px-2 py-1 text-xs bg-red-50 border border-red-300 text-red-600 rounded hover:bg-red-100"
      >
        删除表格
      </button>
    </div>
  )
}

export default TableMenu
