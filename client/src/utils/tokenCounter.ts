/**
 * Token 计数工具
 * 简单的 Token 估算（实际 Token 数量由服务器计算）
 */

import type { Message } from '../types/message'

/**
 * 估算文本的 Token 数量
 * 简化算法：中文按字符数，英文按单词数 * 1.3
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // 分离中文和英文
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || []
  const englishText = text.replace(/[\u4e00-\u9fa5]/g, '')
  const englishWords = englishText.trim().split(/\s+/).filter(w => w.length > 0)

  // 中文：1 字符 ≈ 1.5 tokens
  // 英文：1 单词 ≈ 1.3 tokens
  return Math.ceil(chineseChars.length * 1.5 + englishWords.length * 1.3)
}

/**
 * 计算消息列表的总 Token 数
 */
export function calculateTotalTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => {
    let tokens = estimateTokens(msg.content)
    if (msg.reasoning) {
      tokens += estimateTokens(msg.reasoning)
    }
    return total + tokens
  }, 0)
}

/**
 * 估算费用（基于 DeepSeek 定价）
 * DeepSeek: ¥0.001 / 1K tokens (输入), ¥0.002 / 1K tokens (输出)
 */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  if (model.startsWith('deepseek-')) {
    // DeepSeek 定价
    const inputCost = (inputTokens / 1000) * 0.001
    const outputCost = (outputTokens / 1000) * 0.002
    return inputCost + outputCost
  } else if (model.startsWith('moonshot-')) {
    // Kimi 定价（示例）
    const inputCost = (inputTokens / 1000) * 0.012
    const outputCost = (outputTokens / 1000) * 0.012
    return inputCost + outputCost
  }
  return 0
}

/**
 * 格式化 Token 数量
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`
  } else {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
}

/**
 * 格式化费用
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `¥${(cost * 100).toFixed(2)}分`
  } else {
    return `¥${cost.toFixed(2)}`
  }
}
