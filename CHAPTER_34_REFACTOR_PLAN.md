# 第34章：AIChatPanel 组件拆分重构计划

## 当前问题

`AIChatPanel.tsx` 文件过大（1000+ 行），包含太多职责：
- 对话历史管理
- 大纲生成逻辑
- AI 消息发送
- UI 渲染
- 状态管理

## 拆分目标

将单一大组件拆分为多个小组件，每个组件职责单一，易于维护和测试。

## 拆分方案

### 目录结构

```
client/src/components/editor/AIChatPanel/
├── index.tsx                    # 主组件（协调器）
├── ChatHeader.tsx               # 头部组件
├── ChatMessages.tsx             # 消息列表组件
├── ChatInput.tsx                # 输入框组件
├── MessageItem.tsx              # 单条消息组件
├── GenerationStatus.tsx         # 生成状态提示组件
└── hooks/
    ├── useChatLogic.ts          # 对话逻辑 Hook
    └── useAutoTrigger.ts        # 自动触发 Hook
```

### 组件职责划分

#### 1. index.tsx（主组件）
**职责：**
- 协调各子组件
- 管理全局状态
- 处理数据流

**状态：**
- `input` - 输入内容
- `isThinking` - 是否正在思考
- `isGenerating` - 是否正在生成
- `generationMode` - 生成模式
- `enableDeepThink` - 深度思考开关
- `model` - 当前模型
- `generatedContent` - 生成的内容

**Props：**
```typescript
interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
  documentId: number
  onSuggestionsReceived?: (suggestions: AIEditResponse, isStreaming?: boolean) => { suggestionId?: string } | void
  onStreamingChange?: (isStreaming: boolean) => void
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}
```

#### 2. ChatHeader.tsx（头部组件）
**职责：**
- 显示清空历史按钮
- 显示模型选择下拉框
- 显示关闭按钮

**Props：**
```typescript
interface ChatHeaderProps {
  hasMessages: boolean
  model: string
  isThinking: boolean
  onClearHistory: () => void
  onModelChange: (model: string) => void
  onClose: () => void
}
```

#### 3. ChatMessages.tsx（消息列表组件）
**职责：**
- 渲染消息列表
- 显示大纲视图
- 显示空状态

**Props：**
```typescript
interface ChatMessagesProps {
  messages: Message[]
  outline: OutlineNode | null
  outlineError: string | null
  generationMode: GenerationMode
  isGenerating: boolean
  onUpdateOutline: (id: string, updates: Partial<OutlineNode>) => void
  onAddSibling: (id: string) => void
  onAddChild: (id: string) => void
  onDeleteNode: (id: string) => void
  onMoveNode: (dragId: string, dropId: string, position: 'before' | 'after' | 'child') => void
  onToggleCollapse: (id: string) => void
  onGenerateDocument: () => void
}
```

#### 4. ChatInput.tsx（输入框组件）
**职责：**
- 显示模式切换按钮
- 显示深度思考开关
- 显示输入框和发送按钮
- 显示生成状态提示

**Props：**
```typescript
interface ChatInputProps {
  input: string
  isThinking: boolean
  isGenerating: boolean
  generationMode: GenerationMode
  enableDeepThink: boolean
  model: string
  generatedContent: string
  onInputChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onUndo: () => void
  onConfirm: () => void
  onModeChange: (mode: GenerationMode) => void
  onDeepThinkChange: (enabled: boolean) => void
}
```

#### 5. MessageItem.tsx（单条消息组件）
**职责：**
- 渲染单条消息
- 显示思考过程
- 显示 Token 统计

**Props：**
```typescript
interface MessageItemProps {
  message: Message
}
```

#### 6. GenerationStatus.tsx（生成状态提示组件）
**职责：**
- 显示生成完成提示
- 显示正在生成提示

**Props：**
```typescript
interface GenerationStatusProps {
  isGenerating: boolean
  generatedContent: string
  onUndo: () => void
  onConfirm: () => void
  onStop: () => void
}
```

#### 7. useChatLogic.ts（对话逻辑 Hook）
**职责：**
- 封装 `handleSend` 逻辑
- 封装 `handleStop` 逻辑
- 封装 `handleUndo` 逻辑
- 封装 `handleGenerateFromOutline` 逻辑

**返回值：**
```typescript
interface UseChatLogicReturn {
  handleSend: () => Promise<void>
  handleStop: () => void
  handleUndo: () => void
  handleGenerateFromOutline: () => Promise<void>
}
```

#### 8. useAutoTrigger.ts（自动触发 Hook）
**职责：**
- 封装自动触发逻辑
- 管理触发状态

**参数：**
```typescript
interface UseAutoTriggerParams {
  initialPrompt?: string
  documentId: number
  editor: Editor | null
  isOpen: boolean
  input: string
  handleSend: () => void
}
```

## 实现步骤

### 阶段 1：创建子组件（不改变功能）

1. 创建 `ChatHeader.tsx`
2. 创建 `MessageItem.tsx`
3. 创建 `GenerationStatus.tsx`
4. 创建 `ChatInput.tsx`
5. 创建 `ChatMessages.tsx`

### 阶段 2：提取 Hooks

1. 创建 `useChatLogic.ts`
2. 创建 `useAutoTrigger.ts`

### 阶段 3：重构主组件

1. 在 `index.tsx` 中使用新的子组件
2. 使用新的 Hooks
3. 简化主组件逻辑

### 阶段 4：测试和验证

1. 测试所有功能是否正常
2. 测试自动触发是否正常
3. 测试大纲生成是否正常
4. 测试 Token 统计是否正常

## 注意事项

1. **保持功能一致**：拆分过程中不改变任何功能
2. **逐步重构**：一次只拆分一个组件，确保每次都能正常工作
3. **保留调试日志**：暂时保留所有 console.log，方便调试
4. **类型安全**：确保所有 Props 和返回值都有正确的类型定义

## 预期效果

拆分后：
- 主组件从 1000+ 行减少到 200 行左右
- 每个子组件 50-150 行
- 代码更易读、易维护
- 更容易添加单元测试
- 更容易复用组件

## 下一步

开始实现阶段 1：创建子组件
