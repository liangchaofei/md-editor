# 第31章：AI 大纲生成与分段写作

在前面的章节中，我们实现了 AI 对话、智能编辑和深度思考等功能。本章将实现一个更高级的功能：**AI 大纲生成与分段写作**，让用户可以先生成文档大纲，编辑调整后再基于大纲生成完整文档。

## 31.1 功能概述

### 为什么需要大纲生成？

对于长文档的创作，直接让 AI 生成完整内容可能会遇到以下问题：
- 结构不够清晰
- 内容组织混乱
- 难以控制生成方向
- 无法灵活调整章节

**大纲生成功能**提供了一个两步走的方案：
1. **第一步**：AI 生成文档大纲（树形结构）
2. **第二步**：用户编辑调整大纲
3. **第三步**：基于大纲生成完整文档

### 核心特性

- 🌳 **树形大纲**：支持多层级章节结构
- ✏️ **可编辑**：支持添加、删除、重命名章节
- 🔄 **拖拽排序**：支持拖拽调整章节顺序
- 💭 **深度思考**：支持 DeepSeek Reasoner 的思考过程展示
- 📝 **流式生成**：实时显示文档生成进度

## 31.2 类型定义

首先创建大纲相关的类型定义。


### 创建类型文件

**`client/src/types/outline.ts`**

```typescript
/**
 * 大纲节点
 */
export interface OutlineNode {
  id: string
  title: string
  description?: string
  level: number
  order: number
  children?: OutlineNode[]
  isCollapsed?: boolean
}

/**
 * 完整大纲
 */
export interface Outline {
  id: string
  documentId: number
  title: string
  nodes: OutlineNode[]
  createdAt: string
  updatedAt: string
}

/**
 * 生成模式
 */
export type GenerationMode = 'full' | 'outline'
```

### 类型说明

- **OutlineNode**：单个章节节点
  - `id`：唯一标识
  - `title`：章节标题
  - `description`：章节描述
  - `level`：层级（0 为顶层）
  - `order`：同级排序
  - `children`：子章节
  - `isCollapsed`：是否折叠

- **Outline**：完整大纲结构
- **GenerationMode**：生成模式（全文/大纲）



## 31.3 大纲管理 Hook

创建 `useOutline` Hook 来管理大纲的状态和操作。

**`client/src/hooks/useOutline.ts`**

```typescript
import { useState, useCallback } from 'react'
import type { OutlineNode, Outline } from '../types/outline'

export function useOutline() {
  const [outline, setOutline] = useState<Outline | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 生成唯一 ID
  const generateId = (): string => {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // 生成大纲
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, prompt, model: model || 'deepseek' }),
        })

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader!.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking') {
                onThinking?.(data.data.thinking || '')
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
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate outline')
        throw err
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  // 更新节点
  const updateNode = useCallback((nodeId: string, updates: Partial<OutlineNode>) => {
    // 实现节点更新逻辑
  }, [outline])

  // 其他操作方法...

  return {
    outline,
    isGenerating,
    error,
    generateOutline,
    updateNode,
    // ...
  }
}
```

### 核心功能

1. **generateOutline**：调用 API 生成大纲
2. **updateNode**：更新节点属性
3. **addChild/addSibling**：添加子节点/兄弟节点
4. **deleteNode**：删除节点
5. **moveNode**：移动节点位置



## 31.4 服务端实现

### 大纲生成 API

**`server/src/routes/ai.ts`**

```typescript
/**
 * POST /api/ai/generate-outline
 * 生成文档大纲
 */
router.post('/generate-outline', async (ctx) => {
  const { documentId, prompt, model = 'deepseek-chat' } = ctx.request.body

  const systemPrompt = `你是一个专业的文档大纲生成助手。

【工作流程】
1. 先分析用户需求，思考文档结构
2. 然后输出 JSON 格式的大纲

【大纲要求】
- 最多 2 层结构（主章节 + 子章节）
- 主章节 3-5 个
- 每个主章节的子章节 2-4 个
- 描述简短（10-20 字）

【输出格式】
\`\`\`json
{
  "title": "文档标题",
  "nodes": [
    {
      "id": "1",
      "title": "第一章",
      "description": "简短描述",
      "level": 0,
      "order": 0,
      "children": [...]
    }
  ]
}
\`\`\`

【重要】最终必须输出完整的 JSON 大纲。`

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const stream = streamChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为以下需求生成文档大纲：\n\n${prompt}` },
    ],
    model,
    maxTokens: 4000,
  })

  let accumulatedContent = ''

  for await (const chunk of stream) {
    const parsed = JSON.parse(chunk)

    // 转发思考过程
    if (parsed.type === 'reasoning') {
      ctx.res.write(`data: ${JSON.stringify({
        type: 'thinking',
        data: { thinking: parsed.content }
      })}\n\n`)
    } else if (parsed.type === 'content') {
      accumulatedContent += parsed.content
    }
  }

  // 解析 JSON
  let jsonStr = accumulatedContent.trim()
  jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '')
  jsonStr = jsonStr.replace(/\n?```\s*$/i, '')

  const result = JSON.parse(jsonStr)

  // 发送大纲数据
  ctx.res.write(`data: ${JSON.stringify({
    type: 'outline',
    data: { outline: result }
  })}\n\n`)

  ctx.res.write(`data: ${JSON.stringify({ type: 'done', data: {} })}\n\n`)
  ctx.res.end()
})
```

### 关键点

1. **支持深度思考**：转发 reasoning 类型的 chunk
2. **JSON 清理**：移除代码块标记
3. **错误处理**：检查 JSON 完整性



## 31.5 大纲视图组件

### OutlineNode 组件

单个大纲节点，支持编辑、拖拽、添加删除。

**`client/src/components/editor/OutlineNode.tsx`**

```typescript
function OutlineNode({ node, onUpdate, onAddChild, onDelete, onMove, depth = 0 }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(node.title)

  return (
    <div style={{ paddingLeft: `${depth * 24}px` }}>
      {/* 拖拽手柄 */}
      <div draggable onDragStart={handleDragStart}>⋮⋮</div>

      {/* 标题 */}
      {isEditing ? (
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            onUpdate(node.id, { title: editValue })
            setIsEditing(false)
          }}
        />
      ) : (
        <div onClick={() => setIsEditing(true)}>{node.title}</div>
      )}

      {/* 操作按钮 */}
      <button onClick={() => onAddChild(node.id)} title="添加子章节">
        ➕
      </button>
      <button onClick={() => onDelete(node.id)} title="删除章节">
        🗑️
      </button>

      {/* 子节点 */}
      {node.children?.map((child) => (
        <OutlineNode
          key={child.id}
          node={child}
          depth={depth + 1}
          {...props}
        />
      ))}
    </div>
  )
}
```

### OutlineView 组件

完整的大纲视图，包含生成按钮。

**`client/src/components/editor/OutlineView.tsx`**

```typescript
function OutlineView({ outline, onGenerateDocument, isGenerating }) {
  return (
    <div className="outline-view">
      {/* 文档标题 */}
      <input
        type="text"
        value={outline.title}
        placeholder="文档标题"
      />

      {/* 生成按钮 */}
      <button
        onClick={onGenerateDocument}
        disabled={isGenerating}
      >
        {isGenerating ? '生成中...' : '基于大纲生成全文'}
      </button>

      {/* 大纲树 */}
      <div className="outline-tree">
        {outline.nodes.map((node) => (
          <OutlineNode key={node.id} node={node} {...props} />
        ))}
      </div>
    </div>
  )
}
```



## 31.6 集成到 AI 对话面板

在 `AIChatPanel` 中添加生成模式切换。

**`client/src/components/editor/AIChatPanel.tsx`**

```typescript
function AIChatPanel({ editor, documentId }) {
  const [generationMode, setGenerationMode] = useState<GenerationMode>('full')
  const { outline, generateOutline, clearOutline } = useOutline()

  const handleSend = async () => {
    // 根据深度思考开关选择模型
    let selectedModel = model
    if (enableDeepThink && model.startsWith('deepseek-')) {
      selectedModel = 'deepseek-reasoner'
    }

    // 大纲模式
    if (generationMode === 'outline') {
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '',
        reasoning: '',
        isStreaming: true,
      }
      addMessage(aiMessage)

      await generateOutline(userInput, documentId, selectedModel, (thinking) => {
        // 更新思考过程
        updateLastMessage(msg => ({
          ...msg,
          reasoning: (msg.reasoning || '') + thinking
        }))
      })

      updateLastMessage(msg => ({
        ...msg,
        content: '大纲已生成，请在右侧编辑后点击"基于大纲生成全文"按钮。',
        isStreaming: false
      }))
      return
    }

    // 全文模式（原有逻辑）
    // ...
  }

  return (
    <div className="ai-chat-panel">
      {/* 模式切换 */}
      <div className="mode-switch">
        <button
          onClick={() => {
            setGenerationMode('full')
            clearOutline()
          }}
          className={generationMode === 'full' ? 'active' : ''}
        >
          全文生成
        </button>
        <button
          onClick={() => setGenerationMode('outline')}
          className={generationMode === 'outline' ? 'active' : ''}
        >
          分段生成
        </button>
      </div>

      {/* 大纲视图 */}
      {outline && (
        <OutlineView
          outline={outline}
          onGenerateDocument={handleGenerateFromOutline}
          isGenerating={isGenerating}
        />
      )}

      {/* 消息列表 */}
      {/* ... */}
    </div>
  )
}
```



## 31.7 基于大纲生成文档

### 服务端实现

**`server/src/routes/ai.ts`**

```typescript
/**
 * POST /api/ai/generate-from-outline
 * 基于大纲生成文档
 */
router.post('/generate-from-outline', async (ctx) => {
  const { documentId, outline, originalPrompt, model = 'deepseek-chat' } = ctx.request.body

  // 将大纲转换为文本
  function formatOutlineToText(nodes: any[], level = 0): string {
    let text = ''
    for (const node of nodes) {
      const indent = '  '.repeat(level)
      text += `${indent}${level + 1}. ${node.title}\n`
      if (node.description) {
        text += `${indent}   ${node.description}\n`
      }
      if (node.children?.length > 0) {
        text += formatOutlineToText(node.children, level + 1)
      }
    }
    return text
  }

  const outlineText = formatOutlineToText(outline)

  const systemPrompt = `你是一个专业的文档写作助手。
根据提供的大纲，生成完整的文档内容。

【重要】直接输出 Markdown 格式的文档内容，不要使用代码块（\`\`\`）包裹。

要求：
1. 严格按照大纲结构生成
2. 每个章节内容要充实、专业
3. 使用 Markdown 格式（# ## ### 等）
4. 不要在开头或结尾添加代码块标记`

  const stream = streamChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请根据以下大纲生成完整文档：\n\n${outlineText}` },
    ],
    model,
  })

  for await (const chunk of stream) {
    const parsed = JSON.parse(chunk)

    // 只转发内容，不转发思考过程
    if (parsed.type === 'content') {
      ctx.res.write(`data: ${JSON.stringify({
        type: 'content',
        data: { content: parsed.content }
      })}\n\n`)
    }
  }

  ctx.res.write(`data: ${JSON.stringify({ type: 'done', data: {} })}\n\n`)
  ctx.res.end()
})
```

### 前端处理

```typescript
const handleGenerateFromOutline = async () => {
  // 强制使用非 reasoner 模型（生成文档不需要思考过程）
  const documentModel = model.includes('reasoner') ? 'deepseek-chat' : model

  const response = await fetch('/api/ai/generate-from-outline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      outline: outline.nodes,
      originalPrompt: messages.find(m => m.role === 'user')?.content || '',
      model: documentModel,
    }),
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulatedContent = ''

  // 清空编辑器
  editor.commands.clearContent()

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))

        if (data.type === 'content') {
          accumulatedContent += data.data.content || ''

          // 清理内容
          let cleanContent = accumulatedContent
          cleanContent = cleanContent.replace(/^```(?:markdown|md)?\s*\n?/i, '')
          cleanContent = cleanContent.replace(/\n?```\s*$/i, '')

          // 更新编辑器
          updateEditorContent(editor, cleanContent)
        }
      }
    }
  }

  // 生成完成，清除大纲
  clearOutline()
}
```



## 31.8 使用指南

### 基本流程

1. **切换到分段生成模式**
   - 点击 AI 面板顶部的"分段生成"按钮

2. **输入需求并生成大纲**
   - 在输入框输入文档需求，如"写一个 AI 应用开发平台的标书"
   - 可选：启用"深度思考"查看 AI 的思考过程
   - 点击"发送"

3. **编辑大纲**
   - 点击章节标题可以编辑
   - 点击 ➕ 添加子章节
   - 点击 🗑️ 删除章节
   - 拖拽章节可以调整顺序

4. **生成完整文档**
   - 点击"基于大纲生成全文"按钮
   - 等待 AI 流式生成内容到编辑器

### 最佳实践

**1. 大纲设计**
- 保持结构清晰，不超过 3 层
- 每个章节标题简洁明了
- 添加描述帮助 AI 理解意图

**2. 模型选择**
- 大纲生成：推荐使用 DeepSeek Reasoner + 深度思考
- 文档生成：自动使用 DeepSeek Chat（更快）

**3. 内容调整**
- 生成大纲后先检查结构
- 删除不需要的章节
- 添加遗漏的章节
- 调整章节顺序



## 31.9 技术要点

### 1. 深度思考支持

大纲生成支持 DeepSeek Reasoner 的思考过程：

```typescript
// 服务端转发 reasoning
if (parsed.type === 'reasoning') {
  ctx.res.write(`data: ${JSON.stringify({
    type: 'thinking',
    data: { thinking: parsed.content }
  })}\n\n`)
}

// 前端接收并显示
if (data.type === 'thinking') {
  onThinking?.(data.data.thinking || '')
}
```

### 2. JSON 解析优化

处理 AI 返回的 JSON 可能包含代码块标记：

```typescript
// 移除代码块标记
let jsonStr = accumulatedContent.trim()
jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '')
jsonStr = jsonStr.replace(/\n?```\s*$/i, '')

// 检查 JSON 完整性
const openBraces = (jsonStr.match(/\{/g) || []).length
const closeBraces = (jsonStr.match(/\}/g) || []).length

if (openBraces !== closeBraces) {
  throw new Error('JSON 不完整')
}

const result = JSON.parse(jsonStr)
```

### 3. 模型自动切换

为了优化体验，不同场景使用不同模型：

```typescript
// 大纲生成：支持 reasoner（可以深度思考）
const outlineModel = enableDeepThink ? 'deepseek-reasoner' : 'deepseek-chat'

// 文档生成：强制使用 chat（更快，不需要思考）
const documentModel = model.includes('reasoner') ? 'deepseek-chat' : model
```

### 4. Markdown 清理

生成的文档可能包含不需要的标记：

```typescript
let cleanContent = accumulatedContent

// 移除代码块标记
cleanContent = cleanContent.replace(/^```(?:markdown|md)?\s*\n?/i, '')
cleanContent = cleanContent.replace(/\n?```\s*$/i, '')

// 移除开场白
cleanContent = cleanContent.replace(/^好的[，,].*?[。\.]\s*\n*/i, '')
cleanContent = cleanContent.replace(/^根据.*?[，,].*?[：:]\s*\n*/i, '')
```



## 31.10 常见问题

### Q1: 为什么大纲生成时没有显示思考过程？

**原因**：可能没有启用深度思考，或者使用的不是 reasoner 模型。

**解决**：
1. 确保启用了"深度思考"开关
2. 确保选择的是 DeepSeek 模型（会自动切换到 reasoner）

### Q2: 生成的文档为什么显示为代码块？

**原因**：AI 返回的内容被包裹在 ` ```markdown ... ``` ` 中。

**解决**：前端已经自动清理代码块标记，如果还有问题，检查：
1. System prompt 是否明确要求不使用代码块
2. 清理逻辑是否正确执行

### Q3: 点击"基于大纲生成全文"后没有反应？

**原因**：可能使用了 reasoner 模型，AI 在思考但前端没有显示。

**解决**：代码已自动切换到 chat 模型，确保更新了最新代码。

### Q4: 如何调整大纲的层级？

**方法**：
1. 拖拽节点到目标位置
2. 根据拖拽位置自动调整层级
3. 或者删除后重新添加

### Q5: 生成的文档内容不符合预期？

**优化建议**：
1. 完善大纲的描述信息
2. 调整章节标题更明确
3. 在原始需求中提供更多细节



## 31.11 本章小结

本章实现了 AI 大纲生成与分段写作功能，主要内容包括：

### 核心功能
- ✅ 树形大纲生成
- ✅ 大纲编辑（添加、删除、重命名）
- ✅ 拖拽排序
- ✅ 深度思考支持
- ✅ 基于大纲生成完整文档
- ✅ 流式内容展示

### 技术亮点
1. **两步生成**：先大纲后内容，结构更清晰
2. **深度思考**：支持 DeepSeek Reasoner 的思考过程展示
3. **智能切换**：根据场景自动选择最优模型
4. **内容清理**：自动处理 AI 返回的格式问题
5. **实时预览**：流式生成，实时显示进度

### 文件清单
```
client/src/
├── types/outline.ts              # 类型定义
├── hooks/useOutline.ts           # 大纲管理 Hook
└── components/editor/
    ├── OutlineNode.tsx           # 大纲节点组件
    ├── OutlineView.tsx           # 大纲视图组件
    └── AIChatPanel.tsx           # 集成到对话面板

server/src/routes/ai.ts
├── POST /api/ai/generate-outline      # 生成大纲
└── POST /api/ai/generate-from-outline # 基于大纲生成文档
```

### 下一步

在下一章中，我们将：
- 优化大纲的持久化存储
- 添加大纲模板功能
- 支持大纲导入导出
- 实现大纲版本管理

---

**恭喜！** 你已经完成了 AI 大纲生成与分段写作功能的开发。这个功能为长文档创作提供了更好的控制和灵活性。

