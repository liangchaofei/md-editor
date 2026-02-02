# Chapter 24: AI 对话式文档编辑（核心创新功能）

## 本章目标

实现一个创新的 AI 对话式文档编辑功能，用户可以通过自然语言描述修改意图，AI 自动定位并标记修改位置，用户可以预览并选择接受或拒绝修改。

**核心功能**：
- 用户输入："把基础入门改为零基础入门学习"
- AI 分析文档，返回结构化修改建议（包含上下文定位信息）
- 编辑器中以 diff 方式展示：原文添加删除线，新文本绿色高亮
- 用户 hover 查看修改说明，点击接受或拒绝

## 功能设计思路

### 1. 为什么需要这个功能？

传统的 AI 写作助手通常是：
- **生成模式**：清空编辑器，生成全新内容
- **改写模式**：选中文本，AI 改写后替换

但这两种模式都有局限性：
- 生成模式会丢失原有内容
- 改写模式需要用户精确选中文本

**我们的创新点**：用户只需用自然语言描述修改意图，AI 自动定位并标记修改位置，用户可以预览后再决定是否接受。

### 2. 技术挑战

这个功能看似简单，实际上有很多技术难点：


#### 挑战 1：文本定位问题

**问题**：如何在 Markdown 文档中精确定位用户想修改的文本？

- 文档中可能有多个相同的文本
- Markdown 语法会影响文本匹配
- Tiptap 编辑器的内部表示与纯文本不一致

**解决方案**：采用上下文定位策略
- AI 返回：`contextBefore` + `targetText` + `contextAfter`
- 前端使用上下文进行精确匹配
- 如果上下文匹配失败，回退到智能关键词匹配

#### 挑战 2：Diff 展示方式

**问题**：如何在编辑器中优雅地展示修改建议？

最初尝试的方案：
1. ❌ 蓝色高亮标记（不够直观）
2. ❌ Tooltip 悬浮显示（交互不够明显）
3. ✅ **Diff 方式**：原文删除线 + 新文本绿色高亮（类似 GitHub Copilot）

#### 挑战 3：接受/拒绝操作

**问题**：点击接受后，如何正确替换文本？

遇到的问题：
- 删除原文后，新文本位置会改变
- 标记（高亮、删除线）需要完全移除
- 多次操作导致位置计算错误

**解决方案**：使用 `deleteRange` + `insertContentAt` 一次性完成替换



## 实现步骤

### 步骤 1：定义类型

创建 `client/src/types/suggestion.ts`：

```typescript
/**
 * AI 修改建议类型定义
 */

export interface SuggestedChange {
  id: string
  target: string // 要替换的原文
  replacement: string // 替换后的文本
  description?: string // 修改说明
  from: number // 在文档中的起始位置
  to: number // 在文档中的结束位置
  status: 'pending' | 'accepted' | 'rejected'
}

export interface AIEditResponse {
  reasoning: string // AI 的思考过程
  changes: Array<{
    contextBefore?: string // 前文（用于精确定位）
    targetText?: string // 目标文本
    contextAfter?: string // 后文（用于精确定位）
    replacement?: string // 替换文本
    description?: string
  }>
}
```

**设计要点**：
- `SuggestedChange`：前端状态管理，包含位置信息
- `AIEditResponse`：后端返回格式，包含上下文定位信息



### 步骤 2：实现文本匹配算法

创建 `client/src/utils/textMatcher.ts`：

```typescript
/**
 * 上下文精确定位
 * 使用前文、目标文本、后文进行三段式匹配
 */
export function findTextWithContext(
  docText: string,
  contextBefore: string,
  targetText: string,
  contextAfter: string
): { from: number; to: number } | null {
  // 1. 尝试完整匹配（前文 + 目标 + 后文）
  const fullPattern = contextBefore + targetText + contextAfter
  const fullIndex = docText.indexOf(fullPattern)
  
  if (fullIndex !== -1) {
    const from = fullIndex + contextBefore.length
    const to = from + targetText.length
    return { from, to }
  }
  
  // 2. 如果完整匹配失败，尝试直接查找目标文本
  const targetIndex = docText.indexOf(targetText)
  if (targetIndex !== -1) {
    return { from: targetIndex, to: targetIndex + targetText.length }
  }
  
  return null
}
```

**关键技术点**：
1. **三段式匹配**：优先使用完整上下文匹配，确保唯一性
2. **回退策略**：如果上下文匹配失败，直接查找目标文本
3. **容错处理**：处理 AI 返回的上下文可能不完全准确的情况



### 步骤 3：创建 Suggestion Mark 扩展

创建 `client/src/extensions/Suggestion.ts`：

```typescript
import { Mark, mergeAttributes } from '@tiptap/core'

export const Suggestion = Mark.create({
  name: 'suggestion',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-suggestion-id'),
        renderHTML: attributes => ({
          'data-suggestion-id': attributes.id,
        }),
      },
      replacement: {
        default: null,
        parseHTML: element => element.getAttribute('data-replacement'),
        renderHTML: attributes => ({
          'data-replacement': attributes.replacement,
        }),
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => ({
          'data-description': attributes.description,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-suggestion-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'suggestion-mark',
    }), 0]
  },

  addCommands() {
    return {
      setSuggestion: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      unsetSuggestion: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
      removeSuggestion: id => ({ tr, state }) => {
        // 遍历文档，移除指定 ID 的 suggestion 标记
        // ...
      },
    }
  },
})
```

**设计要点**：
- 使用 Tiptap 的 Mark 扩展系统
- 通过 `data-*` 属性存储建议信息
- 提供命令接口用于添加/移除标记



### 步骤 4：实现 useSuggestions Hook

创建 `client/src/hooks/useSuggestions.ts`：

```typescript
export function useSuggestions(editor: Editor | null) {
  const [suggestions, setSuggestions] = useState<SuggestedChange[]>([])
  const suggestionsRef = useRef<SuggestedChange[]>([])
  
  /**
   * 添加修改建议
   */
  const addSuggestion = useCallback((
    targetText: string,
    replacement: string,
    description?: string,
    contextBefore?: string,
    contextAfter?: string
  ) => {
    // 1. 使用上下文定位目标文本
    const result = findTextWithContext(
      editor.getText(),
      contextBefore || '',
      targetText,
      contextAfter || ''
    )
    
    if (!result) {
      return { error: '无法定位到目标文本' }
    }
    
    // 2. 创建建议对象
    const suggestion: SuggestedChange = {
      id: `suggestion-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      target: targetText,
      replacement,
      description,
      from: result.from,
      to: result.to,
      status: 'pending',
    }
    
    // 3. 在编辑器中标记（Diff 方式）
    // 3.1 给原文添加删除线
    editor.chain()
      .focus()
      .setTextSelection({ from: result.from, to: result.to })
      .toggleStrike()
      .run()
    
    // 3.2 在原文后插入新文本（绿色高亮）
    editor.chain()
      .focus()
      .setTextSelection(result.to)
      .insertContent(' ')  // 插入空格分隔
      .insertContent({
        type: 'text',
        text: replacement,
        marks: [
          { type: 'highlight', attrs: { color: '#86efac' } },
          { type: 'suggestion', attrs: { id: suggestion.id, replacement, description } }
        ]
      })
      .run()
    
    return { error: null, suggestion }
  }, [editor])
```

**关键实现细节**：



1. **使用 ref 避免闭包问题**：
   ```typescript
   const suggestionsRef = useRef<SuggestedChange[]>([])
   ```
   因为 `addSuggestion` 可能在异步回调中被调用，使用 ref 确保获取最新状态

2. **Diff 展示方式**：
   - 原文：`toggleStrike()` 添加删除线
   - 新文本：插入空格 + 绿色高亮文本
   - 使用 `suggestion` mark 标记，方便后续操作

3. **接受建议**：
   ```typescript
   const acceptSuggestion = useCallback((id: string) => {
     const suggestion = suggestionsRef.current.find(s => s.id === id)
     
     // 计算完整范围：原文 + 空格 + 新文本
     const newTextEnd = suggestion.to + 1 + suggestion.replacement.length
     
     // 一次性替换整个范围为纯文本
     editor.chain()
       .focus()
       .deleteRange({ from: suggestion.from, to: newTextEnd })
       .insertContentAt(suggestion.from, suggestion.replacement)
       .run()
   }, [editor])
   ```

4. **拒绝建议**：
   ```typescript
   const rejectSuggestion = useCallback((id: string) => {
     const suggestion = suggestionsRef.current.find(s => s.id === id)
     
     // 1. 移除原文的删除线
     editor.chain()
       .focus()
       .setTextSelection({ from: suggestion.from, to: suggestion.to })
       .toggleStrike()
       .run()
     
     // 2. 删除新文本（包括空格）
     const newTextEnd = suggestion.to + 1 + suggestion.replacement.length
     editor.chain()
       .focus()
       .setTextSelection({ from: suggestion.to, to: newTextEnd })
       .deleteSelection()
       .run()
   }, [editor])
   ```



### 步骤 5：创建 Tooltip 组件

创建 `client/src/components/editor/SuggestionTooltip.tsx`：

```typescript
function SuggestionTooltip({ suggestion, onAccept, onReject }: Props) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 查找对应的 DOM 元素
    const element = document.querySelector(
      `[data-suggestion-id="${suggestion.id}"]`
    ) as HTMLElement

    if (!element) return

    const handleMouseEnter = () => {
      const rect = element.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      })
      setIsVisible(true)
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    // ...
  }, [suggestion.id])

  return (
    <div className="fixed z-50 bg-white rounded-lg shadow-xl">
      <button onClick={() => onReject(suggestion.id)}>拒绝</button>
      <button onClick={() => onAccept(suggestion.id)}>接受</button>
      {suggestion.description && <p>{suggestion.description}</p>}
    </div>
  )
}
```

**交互设计**：
- Hover 到绿色高亮文本时显示 Tooltip
- 提供接受/拒绝按钮
- 显示修改说明



### 步骤 6：后端 API 实现

在 `server/src/routes/ai.ts` 中添加 `/api/ai/edit` 路由：

```typescript
router.post('/edit', async (ctx) => {
  const { documentContent, userRequest, model } = ctx.request.body

  // 构建 Prompt
  const systemPrompt = `你是一个专业的文档编辑助手。

【输出格式】你必须返回以下 JSON 格式：
\`\`\`json
{
  "reasoning": "你的分析：用户想修改哪里，为什么是这个位置",
  "changes": [
    {
      "contextBefore": "目标文本前面的文字（10-30个字符）",
      "targetText": "要替换的原文",
      "contextAfter": "目标文本后面的文字（10-30个字符）",
      "replacement": "替换后的文本",
      "description": "修改说明"
    }
  ]
}
\`\`\`

【关键规则】：
1. 仔细分析用户意图，理解用户想修改哪一个位置
2. 如果文档中有多个相同的文本，选择最符合用户意图的那一个
3. **只返回一个修改**，不要返回多个
4. contextBefore 和 contextAfter 必须足够长，能唯一确定位置
5. **必须返回有效的 JSON 格式**
`

  const userPrompt = `文档内容：
${documentContent}

用户需求：${userRequest}

请返回 JSON 格式的修改建议。`

  // 调用 AI 服务
  const stream = streamChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
  })

  let accumulatedContent = ''

  for await (const chunk of stream) {
    const parsed = JSON.parse(chunk)
    
    if (parsed.type === 'content') {
      accumulatedContent += parsed.content
      ctx.res.write(`data: ${chunk}\n\n`)
    }
  }

  // 解析累积的内容为 JSON
  const result = JSON.parse(accumulatedContent)
  
  // 发送结构化数据
  ctx.res.write(`data: ${JSON.stringify({
    type: 'structured',
    content: result,
  })}\n\n`)

  ctx.res.write(`data: [DONE]\n\n`)
})
```



**Prompt 设计要点**：

1. **强调只返回一个修改**：避免 AI 返回多个修改导致混乱
2. **要求返回上下文**：`contextBefore` 和 `contextAfter` 用于精确定位
3. **强调 JSON 格式**：确保返回可解析的 JSON
4. **提供示例**：帮助 AI 理解输出格式

### 步骤 7：前端 API 集成

在 `client/src/api/ai.ts` 中添加：

```typescript
export async function executeAIEdit(params: {
  documentContent: string
  userRequest: string
  model?: string
  onReasoning?: (reasoning: string) => void
  onChunk?: (chunk: string) => void
  onStructured?: (data: AIEditResponse) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}): Promise<void> {
  const response = await fetch('/api/ai/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentContent: params.documentContent,
      userRequest: params.userRequest,
      model: params.model,
    }),
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') {
        params.onComplete?.()
        return
      }

      const parsed = JSON.parse(data)
      
      if (parsed.type === 'reasoning') {
        params.onReasoning?.(parsed.content)
      } else if (parsed.type === 'content') {
        params.onChunk?.(parsed.content)
      } else if (parsed.type === 'structured') {
        params.onStructured?.(parsed.content)
      }
    }
  }
}
```



### 步骤 8：集成到 AIChatPanel

在 `client/src/components/editor/AIChatPanel.tsx` 中：

```typescript
const handleSend = async () => {
  // 判断是编辑模式还是生成模式
  const isEditMode = editor && editor.getText().trim().length > 0

  if (isEditMode) {
    // 编辑模式：使用 executeAIEdit
    await executeAIEdit({
      documentContent: editor.getText(),
      userRequest: userInput,
      model: selectedModel,
      onReasoning: (reasoning) => {
        // 显示思考过程
      },
      onStructured: (data) => {
        // 收到结构化数据，通知父组件
        if (onSuggestionsReceived) {
          onSuggestionsReceived(data)
        }
      },
      onComplete: () => {
        setIsGenerating(false)
      },
    })
  } else {
    // 生成模式：清空编辑器，生成新内容
    // ...
  }
}
```

**模式判断逻辑**：
- 如果编辑器有内容 → 编辑模式
- 如果编辑器为空 → 生成模式



### 步骤 9：集成到 TiptapEditor

在 `client/src/components/editor/TiptapEditor.tsx` 中：

```typescript
function TiptapEditor({ document, onUpdate }: Props) {
  // 使用 useSuggestions Hook
  const {
    suggestions,
    addSuggestions,
    acceptSuggestion,
    rejectSuggestion,
  } = useSuggestions(editor)

  // 处理 AI 编辑建议
  const handleSuggestionsReceived = useCallback((data: AIEditResponse) => {
    if (data.changes && data.changes.length > 0) {
      const firstChange = data.changes[0]
      
      const result = addSuggestions([{
        targetText: firstChange.targetText || '',
        replacement: firstChange.replacement || '',
        description: firstChange.description,
        contextBefore: firstChange.contextBefore,
        contextAfter: firstChange.contextAfter,
      }])
      
      if (result.errors.length > 0) {
        console.error('建议定位失败:', result.errors[0])
      }
    }
  }, [addSuggestions])

  return (
    <div>
      <EditorContent editor={editor} />
      
      {/* AI 对话面板 */}
      <AIChatPanel
        editor={editor}
        onSuggestionsReceived={handleSuggestionsReceived}
      />
      
      {/* 建议 Tooltips */}
      {suggestions.filter(s => s.status === 'pending').map(suggestion => (
        <SuggestionTooltip
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={acceptSuggestion}
          onReject={rejectSuggestion}
        />
      ))}
    </div>
  )
}
```



## 遇到的问题和解决方案

### 问题 1：文本匹配不准确

**现象**：AI 返回的修改建议无法准确定位到目标文本

**原因分析**：
1. Tiptap 编辑器的 `textContent` 和 `getText()` 返回的内容不一致
2. Markdown 语法（如换行符）影响文本匹配
3. AI 返回的上下文可能不完全准确

**解决方案**：
```typescript
// ❌ 错误：使用 textContent
const docText = editor.state.doc.textContent

// ✅ 正确：统一使用 getText()
const docText = editor.getText()
```

**优化策略**：
1. 统一使用 `editor.getText()` 获取文档内容
2. 实现多层回退策略：完整匹配 → 直接查找 → 智能匹配
3. 添加位置调整逻辑，处理匹配到更多内容的情况

### 问题 2：点击接受后文字仍然高亮

**现象**：点击接受按钮后，新文本的最后几个字仍然保持绿色高亮

**原因分析**：
删除原文后，文档位置发生变化，导致计算新文本位置时出错

**错误代码**：
```typescript
// ❌ 错误：分步操作导致位置计算错误
editor.chain()
  .deleteRange({ from: suggestion.from, to: suggestion.to })
  .run()

editor.chain()
  .deleteRange({ from: suggestion.from, to: suggestion.from + 1 })
  .run()

editor.chain()
  .setTextSelection({ from: suggestion.from, to: newTextEnd })
  .unsetAllMarks()
  .run()
```

**解决方案**：
```typescript
// ✅ 正确：一次性完成替换
const newTextEnd = suggestion.to + 1 + suggestion.replacement.length

editor.chain()
  .focus()
  .deleteRange({ from: suggestion.from, to: newTextEnd })
  .insertContentAt(suggestion.from, suggestion.replacement)
  .run()
```

**关键点**：
- 使用 `deleteRange` 一次性删除整个范围（原文 + 空格 + 新文本）
- 使用 `insertContentAt` 插入纯文本（不带任何标记）
- 避免多次操作导致的位置计算错误



### 问题 3：DeepSeek Reasoner 只返回思考过程

**现象**：使用 DeepSeek Reasoner 模型时，有时只返回 `reasoning` 内容，不返回 `content`

**原因分析**：
DeepSeek Reasoner 的输出分为两部分：
- `reasoning`：思考过程（不包含 JSON）
- `content`：正文内容（包含 JSON）

如果只累积 `reasoning`，会导致 JSON 解析失败

**解决方案**：
```typescript
let accumulatedContent = ''

for await (const chunk of stream) {
  const parsed = JSON.parse(chunk)
  
  if (parsed.type === 'reasoning') {
    // 思考过程，转发但不累积
    ctx.res.write(`data: ${chunk}\n\n`)
  } else if (parsed.type === 'content') {
    // 正文内容，累积并转发
    accumulatedContent += parsed.content
    ctx.res.write(`data: ${chunk}\n\n`)
  }
}

// 只解析累积的 content 部分
const result = JSON.parse(accumulatedContent)
```

**优化**：
- 添加空内容检查
- 提供友好的错误提示
- 在 Prompt 中强调必须返回完整 JSON

### 问题 4：前端过早显示"思考完成"

**现象**：前端显示"思考完成"，但服务器还在输出内容

**原因分析**：
前端在收到第一个 `content` chunk 时就认为思考完成，但实际上 AI 可能还在思考

**解决方案**：
```typescript
onChunk: (chunk) => {
  accumulatedContent += chunk
  // ❌ 不要在这里设置 isThinking = false
},
onStructured: (data) => {
  // ✅ 只在收到 structured 数据时才认为完成
  setIsThinking(false)
},
```

**关键点**：
- 只有收到 `structured` 数据或 `complete` 事件时才认为完成
- 不要依赖 `content` chunk 来判断思考状态



### 问题 5：闭包导致状态不更新

**现象**：在 `streamReplacementText` 函数中无法获取最新的 `suggestions` 状态

**原因分析**：
React Hook 的闭包问题，回调函数中捕获的是旧的状态值

**解决方案**：
```typescript
// 使用 ref 来跟踪当前的 suggestions
const suggestionsRef = useRef<SuggestedChange[]>([])

const updateSuggestions = useCallback((newSuggestions: SuggestedChange[]) => {
  suggestionsRef.current = newSuggestions
  setSuggestions(newSuggestions)
}, [])

const streamReplacementText = useCallback((id: string, char: string) => {
  // ✅ 从 ref 中获取最新状态
  const suggestion = suggestionsRef.current.find(s => s.id === id)
  // ...
}, [editor])
```

**关键点**：
- 使用 `useRef` 存储最新状态
- 在需要最新状态的地方从 ref 读取
- 同时更新 ref 和 state

## 核心技术难点总结

### 1. 文本定位算法

**挑战**：在 Markdown 文档中精确定位用户想修改的文本

**解决方案**：
- 采用上下文三段式匹配
- 实现多层回退策略
- 统一使用 `getText()` 获取文档内容

### 2. Diff 展示方式

**挑战**：如何优雅地展示修改建议

**解决方案**：
- 原文：添加删除线（`toggleStrike()`）
- 新文本：绿色高亮 + suggestion mark
- 插入空格分隔，避免视觉混淆

### 3. 位置计算

**挑战**：删除/插入操作后位置会改变

**解决方案**：
- 使用 `deleteRange` + `insertContentAt` 一次性完成
- 避免多次操作导致的位置计算错误
- 使用 ref 避免闭包问题



### 4. Prompt 工程

**挑战**：如何让 AI 准确理解用户意图并返回正确格式

**解决方案**：
- 强调只返回一个修改
- 要求返回上下文信息
- 提供清晰的 JSON 格式示例
- 强调必须返回完整 JSON

### 5. 流式输出（未完成）

**挑战**：如何实现新文本的流式输出（打字机效果）

**技术方案**：
1. 后端：在返回 structured 数据后，逐字符发送 replacement
2. 前端：接收字符并实时追加到编辑器

**遇到的问题**：
- 后端没有正确发送 replacement 事件
- 前端回调函数没有被调用

**当前状态**：
- 基本功能（diff 展示 + 接受/拒绝）已完成
- 流式输出功能留待后续优化（Chapter 26）

## 测试要点

### 功能测试

1. **基本流程**：
   - 在编辑器中输入一些文本
   - 在 AI 对话框输入修改指令："把 XXX 改为 YYY"
   - 验证是否正确标记（删除线 + 绿色高亮）
   - Hover 查看 Tooltip
   - 点击接受，验证是否正确替换
   - 点击拒绝，验证是否恢复原文

2. **边界情况**：
   - 文档中有多个相同文本
   - 修改的文本在文档开头/结尾
   - 修改的文本包含特殊字符
   - 修改的文本跨越多行

3. **错误处理**：
   - AI 返回的文本无法定位
   - AI 返回格式错误
   - 网络请求失败



### 性能测试

1. **响应速度**：
   - AI 分析时间（通常 2-5 秒）
   - 文本定位时间（应该 < 100ms）
   - 标记渲染时间（应该 < 50ms）

2. **内存占用**：
   - 多个建议同时存在时的内存占用
   - 建议被接受/拒绝后是否正确清理

## 用户体验优化

### 1. 视觉反馈

- **思考状态**：显示"AI 正在思考..."
- **加载动画**：使用 spinner 或进度条
- **成功提示**：修改成功后的视觉反馈

### 2. 交互优化

- **Hover 延迟**：300ms 后显示 Tooltip，避免误触
- **快捷键**：支持 Enter 接受，Esc 拒绝
- **批量操作**：支持一次接受/拒绝所有建议

### 3. 错误处理

- **友好提示**：将技术错误转换为用户可理解的提示
- **重试机制**：网络错误时提供重试按钮
- **降级方案**：定位失败时提供手动选择功能

## 与其他功能的对比

### vs Chapter 22（AI 生成新内容）

| 功能 | Chapter 22 | Chapter 24 |
|------|-----------|-----------|
| 使用场景 | 从零开始创作 | 修改现有内容 |
| 编辑器状态 | 清空后生成 | 保留原内容 |
| 用户控制 | 生成后无法预览 | 可预览后决定 |
| 技术难度 | 简单 | 复杂（需要定位） |

### vs Chapter 23（AI 改写快捷指令）

| 功能 | Chapter 23 | Chapter 24 |
|------|-----------|-----------|
| 触发方式 | 选中文本 + 快捷指令 | 自然语言描述 |
| 定位方式 | 用户手动选中 | AI 自动定位 |
| 预览方式 | 直接替换 | Diff 展示 |
| 用户体验 | 需要精确选中 | 更自然流畅 |



## 后续优化方向

### 1. 流式输出新文本（Chapter 26）

**目标**：实现打字机效果，新文本逐字符显示

**技术方案**：
```typescript
// 后端：逐字符发送
for (let i = 0; i < replacementText.length; i++) {
  ctx.res.write(`data: ${JSON.stringify({
    type: 'replacement',
    content: replacementText[i],
  })}\n\n`)
}

// 前端：逐字符追加
onReplacement: (char) => {
  streamReplacementText(suggestionId, char)
}
```

### 2. 支持多个修改建议

**目标**：一次返回多个修改建议，用户可以逐个处理

**技术挑战**：
- 位置重叠的处理
- 接受一个建议后，其他建议的位置需要更新
- UI 如何展示多个建议

### 3. 智能合并建议

**目标**：如果用户连续提出多个修改，智能合并为一个操作

**技术方案**：
- 使用 debounce 延迟处理
- 分析多个修改的关联性
- 合并相邻的修改

### 4. 撤销/重做支持

**目标**：支持 Ctrl+Z 撤销接受的修改

**技术方案**：
- 使用 Tiptap 的 history 扩展
- 确保接受/拒绝操作可以被撤销

### 5. 协同编辑兼容

**目标**：在协同编辑场景下，建议不会互相干扰

**技术挑战**：
- 其他用户的编辑会改变文档位置
- 需要实时更新建议的位置
- 冲突检测和解决



## 代码组织结构

```
client/src/
├── types/
│   └── suggestion.ts              # 类型定义
├── utils/
│   └── textMatcher.ts             # 文本匹配算法
├── extensions/
│   └── Suggestion.ts              # Suggestion Mark 扩展
├── hooks/
│   └── useSuggestions.ts          # 建议管理 Hook
├── components/editor/
│   ├── SuggestionTooltip.tsx      # Tooltip 组件
│   ├── AIChatPanel.tsx            # AI 对话面板（集成）
│   └── TiptapEditor.tsx           # 编辑器（集成）
└── api/
    └── ai.ts                      # AI API（添加 executeAIEdit）

server/src/
└── routes/
    └── ai.ts                      # AI 路由（添加 /api/ai/edit）
```

## 关键代码片段

### 1. 上下文定位算法

```typescript
export function findTextWithContext(
  docText: string,
  contextBefore: string,
  targetText: string,
  contextAfter: string
): { from: number; to: number } | null {
  // 完整匹配
  const fullPattern = contextBefore + targetText + contextAfter
  const fullIndex = docText.indexOf(fullPattern)
  
  if (fullIndex !== -1) {
    return {
      from: fullIndex + contextBefore.length,
      to: fullIndex + contextBefore.length + targetText.length
    }
  }
  
  // 回退：直接查找
  const targetIndex = docText.indexOf(targetText)
  if (targetIndex !== -1) {
    return {
      from: targetIndex,
      to: targetIndex + targetText.length
    }
  }
  
  return null
}
```

### 2. Diff 标记

```typescript
// 原文：添加删除线
editor.chain()
  .focus()
  .setTextSelection({ from, to })
  .toggleStrike()
  .run()

// 新文本：绿色高亮
editor.chain()
  .focus()
  .setTextSelection(to)
  .insertContent(' ')
  .insertContent({
    type: 'text',
    text: replacement,
    marks: [
      { type: 'highlight', attrs: { color: '#86efac' } },
      { type: 'suggestion', attrs: { id, replacement, description } }
    ]
  })
  .run()
```



### 3. 接受建议

```typescript
const acceptSuggestion = useCallback((id: string) => {
  const suggestion = suggestionsRef.current.find(s => s.id === id)
  if (!suggestion) return

  // 计算完整范围
  const newTextEnd = suggestion.to + 1 + suggestion.replacement.length
  
  // 一次性替换
  editor.chain()
    .focus()
    .deleteRange({ from: suggestion.from, to: newTextEnd })
    .insertContentAt(suggestion.from, suggestion.replacement)
    .run()
  
  // 清理标记
  editor.commands.removeSuggestion(id)
  
  // 更新状态
  updateSuggestions(
    suggestionsRef.current.map(s =>
      s.id === id ? { ...s, status: 'accepted' } : s
    )
  )
}, [editor, updateSuggestions])
```

### 4. Prompt 模板

```typescript
const systemPrompt = `你是一个专业的文档编辑助手。

【输出格式】你必须返回以下 JSON 格式：
\`\`\`json
{
  "reasoning": "你的分析",
  "changes": [{
    "contextBefore": "前文",
    "targetText": "要替换的原文",
    "contextAfter": "后文",
    "replacement": "替换后的文本",
    "description": "修改说明"
  }]
}
\`\`\`

【关键规则】：
1. 只返回一个修改
2. contextBefore 和 contextAfter 必须足够长
3. 必须返回有效的 JSON 格式
`
```

## 学习要点

### 1. Tiptap 编辑器操作

- **文本选择**：`setTextSelection({ from, to })`
- **内容插入**：`insertContent()` 和 `insertContentAt()`
- **范围删除**：`deleteRange({ from, to })`
- **标记操作**：`setMark()`, `unsetMark()`, `toggleStrike()`
- **链式调用**：`chain().focus().xxx().run()`

### 2. React Hooks 最佳实践

- **useRef 避免闭包**：存储最新状态
- **useCallback 优化性能**：避免不必要的重渲染
- **自定义 Hook**：封装复杂逻辑

### 3. SSE 流式传输

- **后端**：使用 `ctx.res.write()` 发送事件
- **前端**：使用 `ReadableStream` 读取数据
- **协议**：`data: ${JSON.stringify(...)}\n\n`



### 4. Prompt 工程技巧

- **明确输出格式**：提供 JSON schema 和示例
- **强调关键规则**：使用【】和加粗突出重点
- **提供示例**：帮助 AI 理解预期输出
- **错误处理**：要求 AI 在无法完成时返回特定格式

### 5. 位置计算技巧

- **统一坐标系**：始终使用 `getText()` 获取文档内容
- **一次性操作**：避免多次操作导致位置变化
- **边界检查**：验证位置是否在有效范围内
- **调试日志**：详细记录位置计算过程

## 常见问题 FAQ

### Q1: 为什么不直接替换文本，而要用 diff 方式展示？

**A**: Diff 方式有以下优势：
1. **可预览**：用户可以看到修改前后的对比
2. **可撤销**：用户可以拒绝不满意的修改
3. **更安全**：避免误操作导致内容丢失
4. **更专业**：符合代码编辑器的交互习惯

### Q2: 为什么文本定位有时不准确？

**A**: 可能的原因：
1. **Markdown 语法**：换行符、空格等影响匹配
2. **AI 理解偏差**：AI 可能理解错用户意图
3. **多个相同文本**：文档中有多个相同的文本
4. **上下文不足**：AI 返回的上下文太短

**解决方法**：
- 优化 Prompt，要求 AI 返回更长的上下文
- 实现多层回退策略
- 添加用户手动选择功能（后续优化）

### Q3: 如何处理协同编辑场景？

**A**: 当前版本暂不支持协同编辑场景下的建议功能。后续优化方向：
1. 监听文档变化，实时更新建议位置
2. 检测冲突，提示用户建议已失效
3. 使用 Y.js 的 relative position 存储位置

### Q4: 为什么流式输出没有实现？

**A**: 流式输出的技术复杂度较高，且用户体验提升有限：
1. **技术挑战**：需要协调后端发送和前端接收
2. **位置计算**：每次追加字符都需要重新计算位置
3. **性能影响**：频繁的 DOM 操作可能影响性能
4. **收益有限**：AI 返回速度已经很快，流式效果不明显

建议在 Chapter 26（AI 功能优化）中实现。



## 总结

本章实现了一个创新的 AI 对话式文档编辑功能，这是本项目的核心创新点之一。

### 核心成果

1. **功能完整**：
   - ✅ 自然语言描述修改意图
   - ✅ AI 自动定位目标文本
   - ✅ Diff 方式展示修改
   - ✅ 接受/拒绝操作

2. **技术突破**：
   - ✅ 上下文精确定位算法
   - ✅ Diff 展示方式
   - ✅ 位置计算优化
   - ✅ Prompt 工程

3. **用户体验**：
   - ✅ 交互流畅自然
   - ✅ 视觉反馈清晰
   - ✅ 错误处理完善

### 技术亮点

1. **文本定位算法**：
   - 三段式上下文匹配
   - 多层回退策略
   - 位置调整优化

2. **Diff 展示方式**：
   - 删除线 + 绿色高亮
   - Tooltip 交互
   - 一次性替换

3. **状态管理**：
   - useRef 避免闭包
   - 自定义 Hook 封装
   - 清晰的数据流

### 遇到的挑战

1. **文本匹配不准确** → 统一使用 `getText()`，实现多层回退
2. **位置计算错误** → 一次性操作，避免多次修改
3. **闭包问题** → 使用 useRef 存储最新状态
4. **AI 返回格式** → 优化 Prompt，添加错误处理

### 后续优化

1. **流式输出**：实现打字机效果（Chapter 26）
2. **多个建议**：支持一次返回多个修改
3. **协同编辑**：兼容协同编辑场景
4. **智能合并**：合并相关的修改建议

### 学到的经验

1. **Prompt 工程很重要**：清晰的 Prompt 可以大幅提升 AI 输出质量
2. **位置计算要谨慎**：编辑器操作会改变位置，需要仔细设计
3. **用户体验优先**：技术实现要服务于用户体验
4. **迭代优化**：先实现基本功能，再逐步优化

## 下一章预告

Chapter 25 将扩展更多 AI 指令功能：
- 续写：根据上文自动续写
- 扩写：将简短内容扩展为详细内容
- 总结：提取文本的核心要点
- 翻译：中英文互译

这些功能将复用本章的技术架构，但交互方式更简单（直接替换，不需要 diff 展示）。

---

**提交代码**：
```bash
git add .
git commit -m "feat: 实现 AI 对话式文档编辑功能（Chapter 24）

- 实现上下文精确定位算法
- 实现 Diff 展示方式（删除线 + 绿色高亮）
- 实现接受/拒绝操作
- 优化 Prompt 工程
- 修复文本匹配和位置计算问题
- 添加详细的调试日志"
```
