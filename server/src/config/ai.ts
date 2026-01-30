/**
 * AI 配置
 */

// 获取 AI 配置（运行时读取）
export function getAIConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  }
}

// 验证配置
export function validateAIConfig() {
  const config = getAIConfig()
  if (!config.apiKey) {
    console.warn('⚠️  DEEPSEEK_API_KEY 未配置，AI 功能将不可用')
    return false
  }
  return true
}
