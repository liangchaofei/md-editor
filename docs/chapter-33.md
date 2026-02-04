# 第33章：AI 对话面板优化与 Token 统计

本章将优化 AI 对话面板的用户界面，简化布局，添加 Token 统计功能，并修复首页自动触发问题。

## 本章目标

- 简化 AI 对话面板头部，移除冗余元素
- 优化输入框区域布局，将模式切换移到输入框上方
- 添加每条消息的 Token 统计显示（耗时、Token 数量、费用）
- 优化深度思考开关的显示逻辑（根据模型自动显示/隐藏）
- 修复首页自动触发 AI 生成的问题

## 优化效果对比

### 头部对比

**优化前：**
```
┌─────────────────────────────────────────────────────────┐
│ 🔮 AI 写作助手  正在思考中...                            │
│ [全文|分段] [📊] [🗑️] [🐛] [模型▼] [✕]                  │
└─────────────────────────────────────────────────────────┘
```

**优化后：**
```
┌─────────────────────────────────────────────────────────┐
│                              [🗑️] [模型▼] [✕]           │
└─────────────────────────────────────────────────────────┘
```

### 输入框对比

**优化前：**
```
┌─────────────────────────────────────────────────────────┐
│ 输入框...                                                │
│ [深度思考] [发送]                                        │
└─────────────────────────────────────────────────────────┘
```

**优化后：**
```
┌─────────────────────────────────────────────────────────┐
│ [分步生成] [深度思考]                                    │
│ 输入框...                                                │
│                                              [发送]     │
└─────────────────────────────────────────────────────────┘
```

## 实现步骤

### 1. 更新 Message 类型

首先更新消息类型，添加统计信息字段：

```typescript
// client/src/types/message.ts
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string  // 思考过程
  timestamp: number
  isStreaming?: boolean
  isGeneratingToEditor?: boolean
  stats?: {
    duration: number    // 耗时（秒）
    tokens: number      // Token 数量
    cost: number        // 费用（元）
  }
}
```

### 2. 添加模型工具函数

在 `modelPreferences.ts` 中添加默认模型和深度思考判断函数：

```typescript
// client/src/utils/modelPreferences.ts

// 默认模型
export const DEFAULT_MODEL = 'deepseek-chat'

/**
 * 获取默认模型
 */
export function getDefaultModel(): string {
  return loadGlobalModelPreference()
}

/**
 * 判断模型是否支持深度思考
 */
export function supportsDeepThink(model: string): boolean {
  return model.startsWith('deepseek-')
}
```

### 3. 简化 AI 对话面板头部

移除冗余元素，只保留核心功能：

```tsx
// client/src/components/editor/AIChatPanel.tsx

{/* 头部 - 简化版 */}
<div className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2">
  {/* 清空历史按钮 */}
  {messages.length > 0 && (
    <button
      onClick={() => {
        if (confirm('确定要清空对话历史吗？')) {
          clearHistory()
          setGeneratedContent('')
          clearOutline()
        }
      }}
      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      title="清空对话历史"
    >
      {/* 删除图标 */}
    </button>
  )}
  
  {/* 模型选择 */}
  <div className="relative group">
    <select
      value={model}
      onChange={(e) => {
        const newModel = e.target.value
        setModel(newModel)
        // 如果切换到不支持深度思考的模型，自动关闭深度思考
        if (!supportsDeepThink(newModel)) {
          setEnableDeepThink(false)
        }
      }}
      disabled={isThinking}
      className="appearance-none text-xs border border-gray-300 rounded-md pl-3 pr-8 py-1.5 bg-white"
    >
      {AVAILABLE_MODELS.map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  </div>
  
  {/* 关闭按钮 */}
  <button onClick={onClose}>✕</button>
</div>
```

**移除的元素：**
- ❌ "AI 写作助手"标题
- ❌ "正在思考中..."状态文字
- ❌ 生成模式切换按钮（移到输入框上方）
- ❌ Token 统计按钮（改为每条消息显示）
- ❌ 调试按钮

### 4. 优化输入框区域

将模式切换和深度思考开关移到输入框上方：

```tsx
{/* 输入框 */}
<div className="border-t border-gray-200 p-4">
  <div className="space-y-3">
    {/* 模式选择和深度思考 */}
    <div className="flex items-center gap-2 px-1">
      {/* 分步生成按钮 */}
      <button
        onClick={() => {
          if (generationMode === 'outline') {
            setGenerationMode('full')
            clearOutline()
          } else {
            setGenerationMode('outline')
          }
        }}
        disabled={isThinking || isGenerating}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${
          generationMode === 'outline'
            ? 'bg-purple-100 text-purple-700 border border-purple-300'
            : 'bg-gray-100 text-gray-600 border border-gray-300'
        }`}
      >
        {generationMode === 'outline' && <span>✓</span>}
        <span>分步生成</span>
      </button>

      {/* 深度思考开关（只在支持的模型下显示） */}
      {supportsDeepThink(model) && (
        <button
          onClick={() => setEnableDeepThink(!enableDeepThink)}
          disabled={isThinking || isGenerating}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${
            enableDeepThink
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
        >
          {enableDeepThink && <span>✓</span>}
          <span>深度思考</span>
        </button>
      )}
    </div>

    {/* 输入框和发送按钮 */}
    <div className="flex gap-2">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入您的需求..."
        disabled={isThinking || isGenerating}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm"
        rows={3}
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || isThinking || isGenerating}
        className="self-end rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        发送
      </button>
    </div>
  </div>
</div>
```

### 5. 添加 Token 统计功能

#### 5.1 在消息发送时记录开始时间

```typescript
const handleSend = async () => {
  if (!input.trim() || isThinking || !editor) return

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: input.trim(),
    timestamp: Date.now(),
  }

  addMessage(userMessage)
  const userInput = input.trim()
  setInput('')
  
  // 记录开始时间用于统计
  const startTime = Date.now()
  
  // ... 后续逻辑
}
```

#### 5.2 在消息完成时计算统计信息

```typescript
// 全文生成模式
onComplete: () => {
  // 计算统计信息
  const duration = (Date.now() - startTime) / 1000
  const tokens = Math.ceil((userInput.length + accumulatedContent.length) / 2)
  const cost = tokens * 0.000001
  
  updateLastMessage(msg => ({
    ...msg,
    isStreaming: false,
    content: accumulatedContent,
    stats: { duration, tokens, cost }
  }))
}
```

#### 5.3 在 MessageItem 中显示统计信息

```tsx
{/* Token 统计信息 */}
{message.stats && (
  <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t">
    <div className="flex items-center gap-1">
      <span>⏱️</span>
      <span>{message.stats.duration.toFixed(1)}秒</span>
    </div>
    <div className="flex items-center gap-1">
      <span>📊</span>
      <span>{message.stats.tokens.toLocaleString()} tokens</span>
    </div>
    <div className="flex items-center gap-1">
      <span>💰</span>
      <span>¥{message.stats.cost.toFixed(4)}</span>
    </div>
  </div>
)}
```

### 6. 修复首页自动触发问题

这是本章最复杂的部分。问题的根源是组件重新渲染导致 `useEffect` 多次执行。

#### 6.1 保存路由状态

在 `EditorPage` 中使用 `useRef` 保存初始状态：

```typescript
// client/src/pages/EditorPage.tsx
function EditorPage() {
  const location = useLocation()
  const state = location.state as LocationState
  
  // 使用 ref 保存初始状态，防止在重新渲染时丢失
  const initialStateRef = useRef<LocationState | null>(null)
  
  useEffect(() => {
    if (state && !initialStateRef.current) {
      initialStateRef.current = state
    }
  }, [state])
  
  const initialState = initialStateRef.current
  
  return (
    <Layout>
      <EditorContainer 
        initialPrompt={initialState?.initialPrompt}
        initialGenerationMode={initialState?.generationMode}
        initialEnableDeepThink={initialState?.enableDeepThink}
      />
    </Layout>
  )
}
```

#### 6.2 实现自动触发逻辑

在 `AIChatPanel` 中实现自动触发：

```typescript
// 保存已处理的 prompt 标识，避免重复触发
const processedKeyRef = useRef<string | null>(null)

// 自动触发初始提示词（只触发一次）
useEffect(() => {
  if (!initialPrompt) return
  
  // 生成唯一标识
  const currentKey = `${documentId}-${initialPrompt}`
  
  // 如果已处理过，直接返回
  if (processedKeyRef.current === currentKey) return
  
  // 立即标记为已处理（防止重复执行）
  processedKeyRef.current = currentKey
  
  // 等待编辑器初始化后触发
  const checkAndTrigger = () => {
    if (editor && isOpen && input) {
      handleSend()
    } else {
      setTimeout(checkAndTrigger, 500)
    }
  }
  
  const timer = setTimeout(checkAndTrigger, 300)
  return () => clearTimeout(timer)
}, [initialPrompt, documentId]) // 只依赖这两个
```

**关键点：**

1. **立即标记**：在检查条件之前就标记为已处理
2. **最小依赖**：只依赖 `initialPrompt` 和 `documentId`
3. **轮询检查**：使用递归 `setTimeout` 等待编辑器初始化
4. **唯一标识**：使用 `documentId + initialPrompt` 组合

## 技术要点

### 1. Token 统计计算

```typescript
// 粗略估算（实际应使用 tiktoken）
const tokens = Math.ceil((input.length + output.length) / 2)
const cost = tokens * 0.000001
```

### 2. 深度思考逻辑

```typescript
// 判断模型是否支持
export function supportsDeepThink(model: string): boolean {
  return model.startsWith('deepseek-')
}

// 切换模型时自动关闭
if (!supportsDeepThink(newModel)) {
  setEnableDeepThink(false)
}

// 只在支持的模型下显示
{supportsDeepThink(model) && <button>深度思考</button>}
```

### 3. 自动触发的陷阱

**常见问题：**
1. useEffect 多次执行
2. useRef 值保留
3. 状态初始化顺序

**解决方案：**
1. 最小化依赖项
2. 立即标记
3. 轮询等待

## 测试要点

- ✅ 头部功能正常
- ✅ 模式切换正常
- ✅ 深度思考开关显示逻辑正确
- ✅ Token 统计显示正确
- ✅ 自动触发工作正常
- ✅ 浏览器前进/后退不重复触发

## 总结

本章完成了 AI 对话面板的全面优化：

1. **简化界面**：移除冗余元素
2. **优化布局**：模式切换移到输入框上方
3. **Token 统计**：为每条消息添加统计信息
4. **智能显示**：根据模型自动显示/隐藏深度思考
5. **自动触发**：修复首页自动触发问题

这些优化使 AI 对话面板更加简洁、易用，提升了用户体验。
