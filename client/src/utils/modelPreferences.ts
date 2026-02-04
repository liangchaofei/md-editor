/**
 * 模型偏好管理
 * 保存和加载用户的模型选择
 */

const STORAGE_KEY_PREFIX = 'ai-model-preference-'
const GLOBAL_MODEL_KEY = 'ai-model-preference-global'

// 默认模型
export const DEFAULT_MODEL = 'deepseek-chat'

/**
 * 保存文档的模型偏好
 */
export function saveModelPreference(documentId: number, model: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${documentId}`, model)
  } catch (error) {
    console.error('保存模型偏好失败:', error)
  }
}

/**
 * 加载文档的模型偏好
 */
export function loadModelPreference(documentId: number): string | null {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${documentId}`)
  } catch (error) {
    console.error('加载模型偏好失败:', error)
    return null
  }
}

/**
 * 保存全局默认模型
 */
export function saveGlobalModelPreference(model: string): void {
  try {
    localStorage.setItem(GLOBAL_MODEL_KEY, model)
  } catch (error) {
    console.error('保存全局模型偏好失败:', error)
  }
}

/**
 * 加载全局默认模型
 */
export function loadGlobalModelPreference(): string {
  try {
    return localStorage.getItem(GLOBAL_MODEL_KEY) || DEFAULT_MODEL
  } catch (error) {
    console.error('加载全局模型偏好失败:', error)
    return DEFAULT_MODEL
  }
}

/**
 * 模型信息
 */
export interface ModelInfo {
  id: string
  name: string
  description: string
  contextWindow: string
  pricing: string
  features: string[]
}

/**
 * 可用模型列表
 */
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: '通用对话模型，性价比高',
    contextWindow: '64K',
    pricing: '¥0.001/1K tokens (输入), ¥0.002/1K tokens (输出)',
    features: ['快速响应', '高性价比', '支持中英文'],
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    description: '深度思考模型，适合复杂任务',
    contextWindow: '64K',
    pricing: '¥0.001/1K tokens (输入), ¥0.002/1K tokens (输出)',
    features: ['深度思考', '逻辑推理', '复杂问题'],
  },
  {
    id: 'moonshot-v1-8k',
    name: 'Kimi (8K)',
    description: 'Kimi 标准模型',
    contextWindow: '8K',
    pricing: '¥0.012/1K tokens',
    features: ['快速响应', '适合短文本'],
  },
  {
    id: 'moonshot-v1-32k',
    name: 'Kimi (32K)',
    description: 'Kimi 长文本模型',
    contextWindow: '32K',
    pricing: '¥0.024/1K tokens',
    features: ['长文本支持', '上下文理解'],
  },
  {
    id: 'moonshot-v1-128k',
    name: 'Kimi (128K)',
    description: 'Kimi 超长文本模型',
    contextWindow: '128K',
    pricing: '¥0.060/1K tokens',
    features: ['超长文本', '全文档理解'],
  },
]

/**
 * 根据 ID 获取模型信息
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId)
}


/**
 * 获取默认模型
 */
export function getDefaultModel(): string {
  return DEFAULT_MODEL
}

/**
 * 检查模型是否支持深度思考
 */
export function supportsDeepThink(model: string): boolean {
  return model.startsWith('deepseek-')
}
