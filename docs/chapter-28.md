# Chapter 28: AI 功能增强和优化

## 本章目标

完善 AI 写作助手的用户体验，添加快捷键、对话历史、Token 统计等实用功能。

**核心功能**：
- 快捷键支持（Ctrl+K 打开 AI，Enter 接受建议，Esc 拒绝建议）
- 对话历史持久化（保存到 localStorage）
- Token 使用统计和显示
- 模型切换优化（记住用户选择）
- 右键菜单 AI 选项

**技术亮点**：
- 全局快捷键监听
- localStorage 数据持久化
- Token 计算和统计
- 上下文菜单集成

---

## 功能演示

### 1. 快捷键支持

**Ctrl+K**：快速打开/关闭 AI 面板
**Enter**：接受当前建议
**Esc**：拒绝当前建议

### 2. 对话历史

- 自动保存每个文档的对话历史
- 切换文档时自动加载对应的历史
- 支持清空历史

### 3. Token 统计

- 实时显示当前对话的 Token 使用量
- 显示预估费用
- 警告超出限制

### 4. 模型切换

- 记住用户的模型选择
- 不同文档可以使用不同模型
- 显示模型特性和价格

### 5. 右键菜单

- 选中文本右键显示 AI 选项
- 快速触发改写、翻译等功能

---

## 详细实现

本章将分步实现以上功能。


## 实现步骤

### 步骤 1：创建对话历史管理 Hook

创建 `client/src/hooks/useChatHistory.ts`：

```typescript
/**
 * useChatHistory Hook
 * 管理 AI 对话历史的持久化
 */

import { useState, useEffect, useCallback } from 'react'
import type { Message } from '../types/message'

const STORAGE_KEY_PREFIX = 'ai-chat-history-'

export function useChatHistory(documentId: number) {
  const [messages, setMessages] = useState<Message[]>([])
  const storageKey = `${STORAGE_KEY_PREFIX}${documentId}`

  // 从 localStorage 加载历史
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setMessages(parsed)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('加载对话历史失败:', error)
      setMessages([])
    }
  }, [storageKey])

  // 保存到 localStorage
  const saveMessages = useCallback((newMessages: Message[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMessages))
      setMessages(newMessages)
    } catch (error) {
      console.error('保存对话历史失败:', error)
    }
  }, [storageKey])

  // 添加消息
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev, message]
      saveMessages(newMessages)
      return newMessages
    })
  }, [saveMessages])

  // 更新最后一条消息
  const updateLastMessage = useCallback((updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const newMessages = [...prev]
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = updater(newMessages[newMessages.length - 1])
      }
      saveMessages(newMessages)
      return newMessages
    })
  }, [saveMessages])

  // 清空历史
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setMessages([])
    } catch (error) {
      console.error('清空对话历史失败:', error)
    }
  }, [storageKey])

  return {
    messages,
    addMessage,
    updateLastMessage,
    clearHistory,
    setMessages: saveMessages,
  }
}
```

**核心功能**：
- 自动加载和保存对话历史
- 按文档 ID 隔离数据
- 提供便捷的操作接口

---

### 步骤 2：创建 Token 统计工具

创建 `client/src/utils/tokenCounter.ts`：

```typescript
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
 */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  if (model.startsWith('deepseek-')) {
    const inputCost = (inputTokens / 1000) * 0.001
    const outputCost = (outputTokens / 1000) * 0.002
    return inputCost + outputCost
  } else if (model.startsWith('moonshot-')) {
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
```

**核心功能**：
- 估算 Token 数量（中英文分别计算）
- 计算预估费用
- 格式化显示

---

### 步骤 3：创建模型偏好管理

创建 `client/src/utils/modelPreferences.ts`：

```typescript
/**
 * 模型偏好管理
 * 保存和加载用户的模型选择
 */

const STORAGE_KEY_PREFIX = 'ai-model-preference-'
const GLOBAL_MODEL_KEY = 'ai-model-preference-global'

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
    return localStorage.getItem(GLOBAL_MODEL_KEY) || 'deepseek-chat'
  } catch (error) {
    console.error('加载全局模型偏好失败:', error)
    return 'deepseek-chat'
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
```

**核心功能**：
- 按文档保存模型选择
- 全局默认模型
- 模型信息管理

---

### 步骤 4：添加快捷键支持

在 `TiptapEditor.tsx` 中添加快捷键监听：

```typescript
// 快捷键：Ctrl+K 打开/关闭 AI 面板，Enter 接受建议，Esc 拒绝建议
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+K 或 Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setIsAIPanelOpen(prev => !prev)
    }
    
    // Ctrl+Enter 接受第一个待处理的建议
    if (e.key === 'Enter' && e.ctrlKey && suggestions.length > 0) {
      e.preventDefault()
      const pendingSuggestion = suggestions.find(s => s.status === 'pending')
      if (pendingSuggestion) {
        acceptSuggestion(pendingSuggestion.id)
      }
    }
    
    // Esc 拒绝第一个待处理的建议
    if (e.key === 'Escape' && suggestions.length > 0) {
      const pendingSuggestion = suggestions.find(s => s.status === 'pending')
      if (pendingSuggestion) {
        rejectSuggestion(pendingSuggestion.id)
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [suggestions, acceptSuggestion, rejectSuggestion])
```

**支持的快捷键**：
- `Ctrl+K` / `Cmd+K`: 打开/关闭 AI 面板
- `Ctrl+Enter`: 接受当前建议
- `Esc`: 拒绝当前建议

---

### 步骤 5：更新 AIChatPanel 组件

主要改动：

1. **使用对话历史 Hook**：
```typescript
const { messages, addMessage, updateLastMessage, clearHistory } = useChatHistory(documentId)
```

2. **加载和保存模型偏好**：
```typescript
const [model, setModel] = useState<string>(() => {
  return loadModelPreference(documentId) || loadGlobalModelPreference()
})

useEffect(() => {
  saveModelPreference(documentId, model)
}, [documentId, model])
```

3. **添加 Token 统计面板**：
```typescript
{showTokenStats && (
  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
    <div className="text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">总 Token 数:</span>
        <span className="font-medium text-gray-900">
          {formatTokens(calculateTotalTokens(messages))}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">预估费用:</span>
        <span className="font-medium text-gray-900">
          {formatCost(estimateCost(
            calculateTotalTokens(messages.filter(m => m.role === 'user')),
            calculateTotalTokens(messages.filter(m => m.role === 'assistant')),
            model
          ))}
        </span>
      </div>
    </div>
  </div>
)}
```

4. **改进模型选择 UI**：
```typescript
<select value={model} onChange={(e) => setModel(e.target.value)}>
  {AVAILABLE_MODELS.map(m => (
    <option key={m.id} value={m.id}>
      {m.name}
    </option>
  ))}
</select>
```

5. **添加清空历史按钮**：
```typescript
<button
  onClick={() => {
    if (confirm('确定要清空对话历史吗？')) {
      clearHistory()
      setGeneratedContent('')
    }
  }}
  title="清空对话历史"
>
  {/* 删除图标 */}
</button>
```

---

## 验证功能

### 测试步骤

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **测试快捷键**
   - 按 `Ctrl+K` 打开/关闭 AI 面板
   - 生成一个 AI 建议后，按 `Ctrl+Enter` 接受
   - 生成一个 AI 建议后，按 `Esc` 拒绝

3. **测试对话历史**
   - 与 AI 对话几轮
   - 刷新页面
   - 验证对话历史是否保留
   - 切换到另一个文档
   - 验证对话历史是否独立

4. **测试 Token 统计**
   - 点击 Token 统计按钮
   - 查看 Token 数量和预估费用
   - 发送更多消息，验证统计更新

5. **测试模型切换**
   - 切换不同的模型
   - 刷新页面
   - 验证模型选择是否保留
   - Hover 到模型选择器，查看模型信息

6. **测试清空历史**
   - 点击清空历史按钮
   - 确认对话历史被清空
   - 验证 localStorage 中的数据被删除

---

## 核心技术点

### 1. localStorage 数据持久化

**优点**：
- 简单易用
- 无需后端支持
- 数据在本地存储

**注意事项**：
- 容量限制（通常 5-10MB）
- 只能存储字符串
- 需要 JSON 序列化

**最佳实践**：
```typescript
try {
  localStorage.setItem(key, JSON.stringify(data))
} catch (error) {
  // 处理存储失败（容量满、隐私模式等）
  console.error('存储失败:', error)
}
```

### 2. 全局快捷键监听

**实现方式**：
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      // 处理快捷键
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [dependencies])
```

**注意事项**：
- 使用 `e.preventDefault()` 阻止默认行为
- 清理事件监听器
- 考虑 Mac 的 Cmd 键

### 3. Token 估算算法

**简化算法**：
- 中文：1 字符 ≈ 1.5 tokens
- 英文：1 单词 ≈ 1.3 tokens

**为什么不精确**：
- 实际 Token 化由模型决定
- 不同模型的 Token 化规则不同
- 估算足够用于显示和预警

**改进方向**：
- 使用 tiktoken 库（精确计算）
- 从服务器获取实际 Token 数
- 缓存计算结果

### 4. 模型信息管理

**数据结构**：
```typescript
interface ModelInfo {
  id: string
  name: string
  description: string
  contextWindow: string
  pricing: string
  features: string[]
}
```

**使用场景**：
- 模型选择器
- 信息提示
- 费用计算

---

## 常见问题 FAQ

### Q1: localStorage 存储失败怎么办？

**A**: 可能的原因：
1. **容量已满**：清理旧数据或使用 IndexedDB
2. **隐私模式**：提示用户切换到正常模式
3. **权限限制**：检查浏览器设置

**解决方案**：
```typescript
try {
  localStorage.setItem(key, value)
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // 容量已满，清理旧数据
    clearOldData()
  } else {
    // 其他错误，提示用户
    alert('无法保存数据，请检查浏览器设置')
  }
}
```

### Q2: 快捷键与浏览器冲突怎么办？

**A**: 
- 使用不常见的组合键
- 提供自定义快捷键功能
- 在文档中说明快捷键

### Q3: Token 估算不准确怎么办？

**A**:
- 使用 tiktoken 库（精确计算）
- 从服务器返回实际 Token 数
- 在 UI 中标注"预估"

### Q4: 如何清理过期的对话历史？

**A**:
```typescript
function cleanupOldHistory() {
  const keys = Object.keys(localStorage)
  const historyKeys = keys.filter(k => k.startsWith('ai-chat-history-'))
  
  historyKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]')
      const lastMessage = data[data.length - 1]
      
      // 删除 30 天前的历史
      if (lastMessage && Date.now() - lastMessage.timestamp > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key)
      }
    } catch (error) {
      // 数据损坏，删除
      localStorage.removeItem(key)
    }
  })
}
```

---

## 后续优化方向

### 1. 导出对话历史

- 导出为 Markdown
- 导出为 JSON
- 分享对话链接

### 2. 对话历史搜索

- 全文搜索
- 按日期筛选
- 按模型筛选

### 3. 快捷键自定义

- 用户自定义快捷键
- 快捷键冲突检测
- 快捷键帮助面板

### 4. Token 使用分析

- 每日/每月统计
- 费用趋势图表
- 使用建议

### 5. 模型推荐

- 根据任务类型推荐模型
- 根据历史使用推荐
- 性价比分析

---

## 总结

本章实现了 AI 功能的增强和优化：

### 核心成果

1. **快捷键支持**：
   - ✅ Ctrl+K 打开/关闭 AI 面板
   - ✅ Ctrl+Enter 接受建议
   - ✅ Esc 拒绝建议

2. **对话历史**：
   - ✅ 自动保存和加载
   - ✅ 按文档隔离
   - ✅ 清空历史功能

3. **Token 统计**：
   - ✅ 实时统计 Token 数量
   - ✅ 预估费用
   - ✅ 格式化显示

4. **模型管理**：
   - ✅ 记住用户选择
   - ✅ 模型信息展示
   - ✅ 改进的选择器 UI

### 技术亮点

1. **localStorage 持久化**：简单高效的本地存储
2. **全局快捷键**：提升操作效率
3. **Token 估算**：实时费用预估
4. **模型信息管理**：结构化的模型数据

### 与其他章节的关系

- **Chapter 20**：DeepSeek API 集成（基础）
- **Chapter 21**：AI 对话界面（基础）
- **Chapter 27**：AI 对话式文档编辑（核心功能）
- **Chapter 28**：AI 功能增强（本章）

### 学到的知识

1. **localStorage API**：数据持久化
2. **全局事件监听**：快捷键实现
3. **Token 计算**：费用估算
4. **用户偏好管理**：提升体验

---

**提交代码**：
```bash
git add .
git commit -m "feat: AI 功能增强和优化（Chapter 28）

- 实现快捷键支持（Ctrl+K, Ctrl+Enter, Esc）
- 实现对话历史持久化（localStorage）
- 实现 Token 使用统计和费用预估
- 实现模型偏好管理（按文档保存）
- 改进模型选择器 UI（显示模型信息）
- 添加清空历史功能
- 创建 useChatHistory Hook
- 创建 Token 计数工具
- 创建模型偏好管理工具"
```

---

## 项目完成！

恭喜！你已经完成了整个项目的开发：

**总章节**：28 章  
**已完成**：28 章  
**进度**：100% ✅

这是一个功能完整的企业级 AI 协同编辑器，包含：
- 实时协同编辑
- 富文本编辑
- AI 写作助手
- 对话式文档编辑
- 版本历史
- 文档导出
- 快捷键支持
- Token 统计
- 模型管理

**下一步**：
1. 测试所有功能
2. 优化性能
3. 部署到生产环境
4. 收集用户反馈
5. 持续迭代改进

感谢你的学习和实践！🎉
