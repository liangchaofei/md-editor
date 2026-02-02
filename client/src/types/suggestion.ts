/**
 * AI 修改建议类型定义
 */

export interface SuggestedChange {
  id: string
  target: string // 要替换的原文（精确匹配）
  replacement: string // 替换后的文本
  description?: string // 修改说明
  from: number // 在文档中的起始位置
  to: number // 在文档中的结束位置
  status: 'pending' | 'accepted' | 'rejected' // 状态
}

export interface AIEditResponse {
  reasoning: string // AI 的思考过程
  changes: Array<{
    contextBefore?: string // 前文（用于精确定位）
    targetText?: string // 目标文本
    contextAfter?: string // 后文（用于精确定位）
    searchKeywords?: string // 搜索关键词（旧方案，兼容）
    target?: string // 要替换的原文（旧方案，兼容）
    replacement?: string  // 替换文本（流式模式下可能为空）
    description?: string
  }>
}

export interface SuggestionState {
  suggestions: SuggestedChange[]
  isProcessing: boolean
  error: string | null
}
