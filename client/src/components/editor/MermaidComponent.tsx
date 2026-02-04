/**
 * Mermaid 图表组件
 * 支持编辑和预览模式切换
 */

import { NodeViewWrapper } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
})

interface MermaidComponentProps {
  node: {
    attrs: {
      code: string
    }
  }
  updateAttributes: (attrs: Record<string, any>) => void
  deleteNode: () => void
  selected: boolean
}

function MermaidComponent({ node, updateAttributes, deleteNode, selected }: MermaidComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [code, setCode] = useState(node.attrs.code)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 渲染 Mermaid 图表
  useEffect(() => {
    if (!isEditing && previewRef.current) {
      const renderChart = async () => {
        try {
          setError(null)
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
          const { svg } = await mermaid.render(id, node.attrs.code)
          if (previewRef.current) {
            previewRef.current.innerHTML = svg
          }
        } catch (err) {
          console.error('Mermaid 渲染错误:', err)
          setError(err instanceof Error ? err.message : '渲染失败')
        }
      }
      renderChart()
    }
  }, [node.attrs.code, isEditing])

  // 编辑模式自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(code.length, code.length)
    }
  }, [isEditing])

  const handleSave = () => {
    updateAttributes({ code })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setCode(node.attrs.code)
    setIsEditing(false)
  }

  return (
    <NodeViewWrapper className="mermaid-wrapper">
      <div
        className={`mermaid-container ${selected ? 'selected' : ''}`}
        style={{
          border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          margin: '16px 0',
          backgroundColor: '#ffffff',
        }}
      >
        {isEditing ? (
          // 编辑模式
          <div className="mermaid-editor">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">编辑 Mermaid 图表</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-48 p-3 font-mono text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入 Mermaid 代码..."
              spellCheck={false}
            />
            <div className="mt-2 text-xs text-gray-500">
              提示：支持流程图、时序图、甘特图等。
              <a
                href="https://mermaid.js.org/intro/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-blue-600 hover:underline"
              >
                查看文档
              </a>
            </div>
          </div>
        ) : (
          // 预览模式
          <div className="mermaid-preview">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Mermaid 图表</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  title="编辑"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={deleteNode}
                  className="px-3 py-1 text-sm text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {error ? (
              <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                <div className="font-medium mb-1">渲染错误</div>
                <div className="text-xs">{error}</div>
              </div>
            ) : (
              <div
                ref={previewRef}
                className="mermaid-chart flex justify-center items-center min-h-[200px]"
              />
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default MermaidComponent
