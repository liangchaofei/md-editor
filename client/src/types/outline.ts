/**
 * Outline type definitions
 * Types for AI-powered outline generation and document creation
 */

/**
 * Represents a single node in the outline tree
 */
export interface OutlineNode {
  /** Unique identifier for the node */
  id: string

  /** Section title */
  title: string

  /** Optional description or summary */
  description?: string

  /** Hierarchical level (0 = top level) */
  level: number

  /** Child nodes */
  children?: OutlineNode[]

  /** Order within siblings */
  order: number

  /** UI state: whether node is collapsed */
  isCollapsed?: boolean
}

/**
 * Complete outline structure
 */
export interface Outline {
  /** Unique identifier for the outline */
  id: string

  /** Associated document ID */
  documentId: number

  /** Outline title */
  title: string

  /** Root-level nodes */
  nodes: OutlineNode[]

  /** Creation timestamp */
  createdAt: string

  /** Last update timestamp */
  updatedAt: string
}

/**
 * Generation mode type
 */
export type GenerationMode = 'full' | 'outline'

/**
 * Outline generation request
 */
export interface OutlineGenerationRequest {
  documentId: number
  prompt: string
  model?: string
}

/**
 * Document generation from outline request
 */
export interface DocumentFromOutlineRequest {
  documentId: number
  outline: OutlineNode[]
  originalPrompt: string
  model?: string
}

/**
 * Outline operation types for tree manipulation
 */
export type OutlineOperation =
  | { type: 'add-sibling'; nodeId: string }
  | { type: 'add-child'; nodeId: string }
  | { type: 'delete'; nodeId: string }
  | { type: 'update-title'; nodeId: string; title: string }
  | { type: 'move'; nodeId: string; targetId: string; position: 'before' | 'after' | 'child' }
  | { type: 'toggle-collapse'; nodeId: string }

/**
 * SSE response types for outline generation
 */
export interface OutlineGenerationResponse {
  type: 'thinking' | 'outline' | 'done' | 'error'
  data: {
    thinking?: string
    outline?: Outline
    error?: string
  }
}

/**
 * SSE response types for document generation
 */
export interface DocumentGenerationResponse {
  type: 'content' | 'done' | 'error'
  data: {
    content?: string
    error?: string
  }
}
