# 第33章 - AI 对话面板优化方案

## 优化目标

简化 AI 对话面板，使其更加简洁、专业，符合现代 AI 工具的设计标准。

## 优化内容

### 1. 头部简化
**移除：**
- ❌ "AI 写作助手"标题
- ❌ "正在思考中..."状态文字
- ❌ 生成模式切换按钮（移到输入框上方）
- ❌ Token 统计按钮（改为显示在消息下方）
- ❌ 调试按钮

**保留：**
- ✅ 清空历史按钮
- ✅ 模型选择下拉框
- ✅ 关闭按钮

**优化后的头部：**
```
┌─────────────────────────────────────┐
│  [模型选择▼]  [🗑️清空]  [✕关闭]     │
└─────────────────────────────────────┘
```

### 2. 模型和深度思考逻辑优化

**问题：**
- 首页有深度思考开关，但没有模型选择
- 不是所有模型都支持深度思考
- Kimi 不支持深度思考，但开关还在显示

**解决方案：**

#### 首页逻辑
```typescript
// 默认模型：deepseek-chat
const DEFAULT_MODEL = 'deepseek-chat'

// 深度思考开关
const [enableDeepThink, setEnableDeepThink] = useState(false)

// 点击发送时
if (enableDeepThink) {
  // 自动使用 deepseek-reasoner
  model = 'deepseek-reasoner'
}
```

#### 编辑器逻辑
```typescript
// 根据模型判断是否显示深度思考开关
const supportsDeepThink = model.startsWith('deepseek-')

// 只有支持的模型才显示深度思考开关
{supportsDeepThink && (
  <button>深度思考</button>
)}

// 切换模型时自动关闭深度思考
useEffect(() => {
  if (!model.startsWith('deepseek-')) {
    setEnableDeepThink(false)
  }
}, [model])
```

### 3. Token 统计优化

**移除：**
- ❌ 顶部的 Token 统计按钮
- ❌ 展开的统计面板

**新增：**
- ✅ 每条 AI 消息下方显示统计信息

**显示内容：**
```
┌─────────────────────────────────────┐
│ AI 消息内容...                       │
│                                     │
│ ⏱️ 耗时 3.2s  📊 256 tokens  💰 ¥0.01│
└─────────────────────────────────────┘
```

### 4. 输入框区域优化

**布局调整：**
```
┌─────────────────────────────────────┐
│ [分段生成] [深度思考]                │  ← 模式选择（移到这里）
│ ┌─────────────────────────────────┐ │
│ │ 输入框...                        │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ [发送]                              │
└─────────────────────────────────────┘
```

### 5. 整体布局

**优化后的完整布局：**
```
┌─────────────────────────────────────┐
│ Header: [模型▼] [🗑️] [✕]            │  ← 简化的头部
├─────────────────────────────────────┤
│                                     │
│ 消息列表区域                         │  ← 主要空间
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 用户消息                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AI 消息                          │ │
│ │ ⏱️ 3.2s 📊 256 tokens 💰 ¥0.01  │ │  ← Token 统计
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ [分段生成] [深度思考]                │  ← 模式选择
│ ┌─────────────────────────────────┐ │
│ │ 输入框...                        │ │  ← 输入区域
│ └─────────────────────────────────┘ │
│                              [发送] │
└─────────────────────────────────────┘
```

## 技术实现要点

### 1. 默认模型管理

```typescript
// utils/modelPreferences.ts
export const DEFAULT_MODEL = 'deepseek-chat'

export function getDefaultModel(): string {
  return DEFAULT_MODEL
}
```

### 2. 深度思考支持检测

```typescript
// utils/modelPreferences.ts
export function supportsDeepThink(model: string): boolean {
  return model.startsWith('deepseek-')
}
```

### 3. Token 统计计算

```typescript
// 在消息发送时记录开始时间
const startTime = Date.now()

// 在消息完成时计算
const endTime = Date.now()
const duration = (endTime - startTime) / 1000 // 秒

// 计算 token 和费用
const tokens = calculateTokens(message.content)
const cost = estimateCost(tokens, model)

// 保存到消息对象
message.stats = {
  duration,
  tokens,
  cost
}
```

### 4. 消息类型扩展

```typescript
// types/message.ts
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
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

## 参考设计

### Cursor AI Chat
- 极简的头部（只有关闭按钮）
- 模式切换在输入框上方
- 消息列表占主要空间

### GitHub Copilot Chat
- 简洁的头部
- 清晰的消息分隔
- 统计信息显示在消息下方

### Claude
- 干净的界面
- 明确的消息角色标识
- 流畅的交互体验

## 优化效果

### 视觉效果
- ✅ 更简洁的界面
- ✅ 更大的消息显示空间
- ✅ 更清晰的信息层级

### 交互体验
- ✅ 模式切换更方便（在输入框旁边）
- ✅ Token 统计更直观（每条消息都有）
- ✅ 深度思考逻辑更合理（根据模型自动显示）

### 功能完整性
- ✅ 保留所有核心功能
- ✅ 移除冗余功能
- ✅ 优化信息展示

## 实现步骤

1. 修改 Message 类型，添加 stats 字段
2. 更新 modelPreferences 工具函数
3. 优化 AIChatPanel 头部
4. 移动模式切换到输入框上方
5. 添加 Token 统计到消息组件
6. 优化深度思考显示逻辑
7. 测试所有功能
8. 编写第33章教程

## 注意事项

1. **向后兼容**：确保已有消息不会出错
2. **性能优化**：Token 计算不要阻塞 UI
3. **错误处理**：统计失败不影响消息显示
4. **用户体验**：过渡动画要流畅
