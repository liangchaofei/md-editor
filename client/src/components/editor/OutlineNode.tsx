/**
 * OutlineNode Component
 * Renders a single node in the outline tree with editing capabilities
 */

import { useState, useRef, useEffect } from 'react'
import type { OutlineNode as OutlineNodeType } from '../../types/outline'

interface OutlineNodeProps {
  node: OutlineNodeType
  onUpdate: (nodeId: string, updates: Partial<OutlineNodeType>) => void
  onAddSibling: (nodeId: string) => void
  onAddChild: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onMove: (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => void
  onToggleCollapse: (nodeId: string) => void
  depth?: number
}

function OutlineNode({
  node,
  onUpdate,
  onAddSibling,
  onAddChild,
  onDelete,
  onMove,
  onToggleCollapse,
  depth = 0,
}: OutlineNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(node.title)
  const [showActions, setShowActions] = useState(false)
  const [dragOver, setDragOver] = useState<'before' | 'after' | 'child' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle title edit
  const handleTitleClick = () => {
    setIsEditing(true)
    setEditValue(node.title)
  }

  const handleTitleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed === '') {
      alert('Title cannot be empty')
      return
    }
    onUpdate(node.id, { title: trimmed })
    setIsEditing(false)
  }

  const handleTitleCancel = () => {
    setEditValue(node.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      handleTitleCancel()
    }
  }

  // Handle delete with confirmation
  const handleDelete = () => {
    if (confirm(`Delete "${node.title}" and all its children?`)) {
      onDelete(node.id)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('nodeId', node.id)
    e.stopPropagation()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    if (y < height * 0.25) {
      setDragOver('before')
    } else if (y > height * 0.75) {
      setDragOver('after')
    } else {
      setDragOver('child')
    }
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedNodeId = e.dataTransfer.getData('nodeId')
    if (draggedNodeId && draggedNodeId !== node.id && dragOver) {
      onMove(draggedNodeId, node.id, dragOver)
    }

    setDragOver(null)
  }

  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="outline-node-wrapper">
      {/* Drop indicator */}
      {dragOver === 'before' && (
        <div className="h-0.5 bg-blue-500 -mt-0.5" />
      )}

      <div
        className={`outline-node group flex items-start gap-2 py-2 px-2 rounded hover:bg-gray-50 ${
          dragOver === 'child' ? 'bg-blue-50 border-2 border-blue-300' : ''
        }`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag handle */}
        <div
          draggable
          onDragStart={handleDragStart}
          className="cursor-grab hover:bg-gray-200 rounded p-1 flex-shrink-0"
          title="Drag to reorder"
        >
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="3" cy="3" r="1" />
            <circle cx="3" cy="8" r="1" />
            <circle cx="3" cy="13" r="1" />
            <circle cx="8" cy="3" r="1" />
            <circle cx="8" cy="8" r="1" />
            <circle cx="8" cy="13" r="1" />
          </svg>
        </div>

        {/* Collapse/expand button */}
        {hasChildren && (
          <button
            onClick={() => onToggleCollapse(node.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            {node.isCollapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        )}

        {/* Spacer when no children */}
        {!hasChildren && <div className="w-4 flex-shrink-0" />}

        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div
              onClick={handleTitleClick}
              className="text-sm cursor-text hover:bg-gray-100 px-2 py-1 rounded"
            >
              {node.title}
            </div>
          )}

          {/* Description */}
          {node.description && !isEditing && (
            <div className="text-xs text-gray-500 px-2 mt-1">{node.description}</div>
          )}
        </div>

        {/* Action buttons */}
        <div
          className={`flex gap-1 flex-shrink-0 ${
            showActions ? 'opacity-100' : 'opacity-0'
          } transition-opacity`}
        >
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Add child section"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => onAddSibling(node.id)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Add sibling section"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="Delete section"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drop indicator */}
      {dragOver === 'after' && (
        <div className="h-0.5 bg-blue-500 -mb-0.5" />
      )}

      {/* Children */}
      {hasChildren && !node.isCollapsed && (
        <div className="outline-node-children">
          {node.children!.map((child) => (
            <OutlineNode
              key={child.id}
              node={child}
              onUpdate={onUpdate}
              onAddSibling={onAddSibling}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onMove={onMove}
              onToggleCollapse={onToggleCollapse}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default OutlineNode
