/**
 * useOutline Hook
 * Manages outline state and provides CRUD operations for outline nodes
 */

import { useState, useCallback } from 'react'
import type { OutlineNode, Outline } from '../types/outline'

interface UseOutlineReturn {
  // State
  outline: Outline | null
  isGenerating: boolean
  error: string | null

  // Actions
  generateOutline: (prompt: string, documentId: number, model?: string, onThinking?: (thinking: string) => void) => Promise<void>
  updateNode: (nodeId: string, updates: Partial<OutlineNode>) => void
  addSibling: (nodeId: string) => void
  addChild: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  moveNode: (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => void
  toggleCollapse: (nodeId: string) => void
  clearOutline: () => void

  // Utilities
  findNode: (nodeId: string) => OutlineNode | null
  serializeOutline: () => string
}

export function useOutline(): UseOutlineReturn {
  const [outline, setOutline] = useState<Outline | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate unique ID
  const generateId = (): string => {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Find node by ID (recursive search)
  const findNode = useCallback(
    (nodeId: string): OutlineNode | null => {
      if (!outline) return null

      const search = (nodes: OutlineNode[]): OutlineNode | null => {
        for (const node of nodes) {
          if (node.id === nodeId) return node
          if (node.children) {
            const found = search(node.children)
            if (found) return found
          }
        }
        return null
      }

      return search(outline.nodes)
    },
    [outline]
  )

  // Serialize outline to JSON string
  const serializeOutline = useCallback((): string => {
    if (!outline) return '{}'
    return JSON.stringify(outline, null, 2)
  }, [outline])

  // Generate outline from prompt
  const generateOutline = useCallback(
    async (
      prompt: string, 
      documentId: number, 
      model?: string,
      onThinking?: (thinking: string) => void
    ) => {
      setIsGenerating(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/generate-outline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            prompt,
            model: model || 'deepseek',
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6)
              
              const data = JSON.parse(dataStr)

              if (data.type === 'thinking') {
                // 调用回调函数传递思考过程
                if (onThinking) {
                  onThinking(data.data.thinking || '')
                } else {
                  console.warn('⚠️ onThinking 回调未定义')
                }
              } else if (data.type === 'outline') {
                const outlineData = data.data.outline
                setOutline({
                  id: generateId(),
                  documentId,
                  title: outlineData.title || 'Untitled',
                  nodes: outlineData.nodes || [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              } else if (data.type === 'error') {
                throw new Error(data.data.error || 'Unknown error')
              }
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate outline'
        setError(message)
        console.error('Outline generation error:', err)
        // 抛出错误让调用者知道失败了
        throw err
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  // Clear outline
  const clearOutline = useCallback(() => {
    setOutline(null)
    setError(null)
  }, [])

  // Update node properties
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<OutlineNode>) => {
      if (!outline) return

      const updateInTree = (nodes: OutlineNode[]): OutlineNode[] => {
        return nodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, ...updates }
          }
          if (node.children) {
            return { ...node, children: updateInTree(node.children) }
          }
          return node
        })
      }

      setOutline({
        ...outline,
        nodes: updateInTree(outline.nodes),
        updatedAt: new Date().toISOString(),
      })
    },
    [outline]
  )

  // Toggle collapse state
  const toggleCollapse = useCallback(
    (nodeId: string) => {
      const node = findNode(nodeId)
      if (!node) return

      updateNode(nodeId, { isCollapsed: !node.isCollapsed })
    },
    [findNode, updateNode]
  )

  // Add sibling node
  const addSibling = useCallback(
    (nodeId: string) => {
      if (!outline) return

      const targetNode = findNode(nodeId)
      if (!targetNode) return

      const newNode: OutlineNode = {
        id: generateId(),
        title: 'New Section',
        level: targetNode.level,
        order: targetNode.order + 1,
        children: [],
      }

      const addSiblingInTree = (nodes: OutlineNode[]): OutlineNode[] => {
        const result: OutlineNode[] = []

        for (const node of nodes) {
          result.push(node)

          if (node.id === nodeId) {
            // Insert new sibling after this node
            result.push(newNode)
          } else if (node.children) {
            // Recursively search in children
            const updatedChildren = addSiblingInTree(node.children)
            if (updatedChildren !== node.children) {
              result[result.length - 1] = { ...node, children: updatedChildren }
            }
          }
        }

        // Update order values for subsequent siblings
        return result.map((node, index) => ({ ...node, order: index }))
      }

      setOutline({
        ...outline,
        nodes: addSiblingInTree(outline.nodes),
        updatedAt: new Date().toISOString(),
      })
    },
    [outline, findNode]
  )

  // Add child node
  const addChild = useCallback(
    (nodeId: string) => {
      if (!outline) return

      const targetNode = findNode(nodeId)
      if (!targetNode) return

      const newNode: OutlineNode = {
        id: generateId(),
        title: 'New Subsection',
        level: targetNode.level + 1,
        order: 0,
        children: [],
      }

      const addChildInTree = (nodes: OutlineNode[]): OutlineNode[] => {
        return nodes.map((node) => {
          if (node.id === nodeId) {
            const existingChildren = node.children || []
            // Update order of existing children
            const updatedChildren = existingChildren.map((child, index) => ({
              ...child,
              order: index + 1,
            }))
            return {
              ...node,
              children: [newNode, ...updatedChildren],
            }
          }
          if (node.children) {
            return { ...node, children: addChildInTree(node.children) }
          }
          return node
        })
      }

      setOutline({
        ...outline,
        nodes: addChildInTree(outline.nodes),
        updatedAt: new Date().toISOString(),
      })
    },
    [outline, findNode]
  )

  // Delete node and all descendants
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!outline) return

      const deleteFromTree = (nodes: OutlineNode[]): OutlineNode[] => {
        const filtered = nodes.filter((node) => node.id !== nodeId)
        return filtered.map((node, index) => {
          if (node.children) {
            return {
              ...node,
              order: index,
              children: deleteFromTree(node.children),
            }
          }
          return { ...node, order: index }
        })
      }

      setOutline({
        ...outline,
        nodes: deleteFromTree(outline.nodes),
        updatedAt: new Date().toISOString(),
      })
    },
    [outline]
  )

  // Move node to new position
  const moveNode = useCallback(
    (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => {
      if (!outline || nodeId === targetId) return

      const sourceNode = findNode(nodeId)
      const targetNode = findNode(targetId)

      if (!sourceNode || !targetNode) return

      // Prevent circular moves (moving parent into its own descendant)
      const isDescendant = (parentId: string, childId: string): boolean => {
        const parent = findNode(parentId)
        if (!parent || !parent.children) return false

        for (const child of parent.children) {
          if (child.id === childId) return true
          if (isDescendant(child.id, childId)) return true
        }
        return false
      }

      if (isDescendant(nodeId, targetId)) {
        console.warn('Cannot move parent into its own descendant')
        return
      }

      // Remove node from tree
      const removeFromTree = (nodes: OutlineNode[]): OutlineNode[] => {
        return nodes
          .filter((node) => node.id !== nodeId)
          .map((node) => {
            if (node.children) {
              return { ...node, children: removeFromTree(node.children) }
            }
            return node
          })
      }

      // Insert node at new position
      const insertInTree = (nodes: OutlineNode[], parentLevel: number): OutlineNode[] => {
        const result: OutlineNode[] = []

        for (const node of nodes) {
          if (node.id === targetId) {
            if (position === 'before') {
              result.push({ ...sourceNode, level: node.level })
              result.push(node)
            } else if (position === 'after') {
              result.push(node)
              result.push({ ...sourceNode, level: node.level })
            } else if (position === 'child') {
              const updatedNode = {
                ...node,
                children: [
                  { ...sourceNode, level: node.level + 1 },
                  ...(node.children || []),
                ],
              }
              result.push(updatedNode)
            }
          } else {
            if (node.children) {
              result.push({ ...node, children: insertInTree(node.children, node.level) })
            } else {
              result.push(node)
            }
          }
        }

        // Update order values
        return result.map((node, index) => ({ ...node, order: index }))
      }

      const nodesWithoutSource = removeFromTree(outline.nodes)
      const nodesWithInserted = insertInTree(nodesWithoutSource, -1)

      setOutline({
        ...outline,
        nodes: nodesWithInserted,
        updatedAt: new Date().toISOString(),
      })
    },
    [outline, findNode]
  )

  return {
    outline,
    isGenerating,
    error,
    generateOutline,
    updateNode,
    addSibling,
    addChild,
    deleteNode,
    moveNode,
    toggleCollapse,
    clearOutline,
    findNode,
    serializeOutline,
  }
}
