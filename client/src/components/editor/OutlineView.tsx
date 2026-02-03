/**
 * OutlineView Component
 * Displays and manages the complete outline structure
 */

import OutlineNode from './OutlineNode'
import type { Outline, OutlineNode as OutlineNodeType } from '../../types/outline'

interface OutlineViewProps {
  outline: Outline
  onUpdate: (nodeId: string, updates: Partial<OutlineNodeType>) => void
  onAddSibling: (nodeId: string) => void
  onAddChild: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onMove: (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => void
  onToggleCollapse: (nodeId: string) => void
  onGenerateDocument: () => void
  isGenerating?: boolean
  error?: string | null
}

function OutlineView({
  outline,
  onUpdate,
  onAddSibling,
  onAddChild,
  onDelete,
  onMove,
  onToggleCollapse,
  onGenerateDocument,
  isGenerating = false,
  error = null,
}: OutlineViewProps) {
  const hasNodes = outline.nodes && outline.nodes.length > 0

  return (
    <div className="outline-view flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="outline-header p-4 border-b border-gray-200">
        {/* Title */}
        <div className="mb-3">
          <input
            type="text"
            value={outline.title}
            onChange={(e) => {
              // Update outline title (would need to be passed as a prop)
              console.log('Title update:', e.target.value)
            }}
            className="w-full text-base font-medium px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="文档标题"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerateDocument}
          disabled={isGenerating || !hasNodes}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isGenerating || !hasNodes
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              生成中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              基于大纲生成全文
            </>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Outline tree */}
      <div className="outline-tree flex-1 overflow-y-auto p-4">
        {hasNodes ? (
          <div className="space-y-1">
            {outline.nodes.map((node) => (
              <OutlineNode
                key={node.id}
                node={node}
                onUpdate={onUpdate}
                onAddSibling={onAddSibling}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onMove={onMove}
                onToggleCollapse={onToggleCollapse}
                depth={0}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No outline generated yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isGenerating && (
        <div className="outline-loading p-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">Generating document...</p>
              <p className="text-xs text-blue-700">This may take a moment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OutlineView
