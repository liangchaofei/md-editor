# Chapter 23: AI 快捷指令系统

## 本章目标

实现 AI 快捷指令系统，包括续写、改写、扩写、总结、翻译等功能。用户可以选中文本后通过浮动菜单触发 AI 操作，AI 生成内容后可以选择替换原文或放弃。

**完成后的效果：**
1. **改写**：选中文本 → 浮动菜单点击"改写" → 输入修改需求 → AI 生成 → 替换原文 → 高亮新内容
2. **续写**：点击工具栏"续写"按钮 → AI 根据上文继续写作 → 追加内容 → 高亮新内容
3. **扩写**：选中文本 → 浮动菜单点击"扩写" → AI 详细展开 → 替换原文 → 高亮新内容
4. **总结**：选中文本 → 浮动菜单点击"总结" → AI 生成摘要 → 替换原文 → 高亮新内容
5. **翻译**：选中文本 → 浮动菜单点击"翻译" → AI 自动检测语言并翻译 → 替换原文 → 高亮新内容

**交互设计：**
- **浮动菜单（BubbleMenu）**：选中文本时显示，包含"改写、扩写、总结、翻译"按钮
- **工具栏（MenuBar）**：包含"续写"按钮（因为续写不需要选中文本）

---

## 1. 理论知识

### 1.1 快捷指令系统架构

快捷指令系统包含以下核心部分：
- **触发方式**：
  - 浮动菜单（BubbleMenu）：选中文本时显示，包含改写、扩写、总结、翻译
  - 工具栏（MenuBar）：包含续写按钮
- **上下文提取**：选中文本、光标位置、周围内容
- **Prompt 模板**：针对不同指令的提示词
- **生成策略**：替换、追加
- **高亮显示**：标记新生成的内容

### 1.2 Tiptap 选区操作

```typescript
// 获取选中的文本
const { from, to } = editor.state.selection
const selectedText = editor.state.doc.textBetween(from, to, '\n')

// 替换选中的内容
editor.chain()
  .focus()
  .deleteSelection()
  .insertContent(newContent)
  .run()

// 在光标位置插入内容
editor.chain()
  .focus()
  .insertContent(content)
  .run()

// 设置选区（用于高亮）
editor.commands.setTextSelection({ from, to })
```

### 1.3 高亮标记实现

使用 Tiptap 的 Mark 扩展创建高亮效果：

```typescript
import { Mark } from '@tiptap/core'

const Highlight = Mark.create({
  name: 'highlight',
  addAttributes() {
    return {
      color: {
        default: 'yellow',
      },
    }
  },
  parseHTML() {
    return [{ tag: 'mark' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', HTMLAttributes, 0]
  },
})
```

---

## 2. 实现步骤

### 2.1 创建 Highlight 扩展

**新建文件：** `client/src/extensions/Highlight.ts`

```typescript
import { Mark } from '@tiptap/core'

export interface HighlightOptions {
  multicolor: boolean
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      /**
       * 设置高亮标记
       */
      setHighlight: (attributes?: { color?: string }) => ReturnType
      /**
       * 取消高亮标记
       */
      unsetHighlight: () => ReturnType
      /**
       * 切换高亮标记
       */
      toggleHighlight: (attributes?: { color?: string }) => ReturnType
    }
  }
}

export const Highlight = Mark.create<HighlightOptions>({
  name: 'highlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    if (!this.options.multicolor) {
      return {}
    }

    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color') || element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.color) {
            return {}
          }

          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}; color: inherit`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', HTMLAttributes, 0]
  },

  addCommands() {
    return {
      setHighlight:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      toggleHighlight:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes)
        },
    }
  },
})
```

### 2.2 创建 AI 指令类型定义

**新建文件：** `client/src/types/aiCommand.ts`

```typescript
export type AICommandType = 'rewrite' | 'continue' | 'expand' | 'summarize' | 'translate'

export interface AICommandContext {
  selectedText: string
  beforeText: string
  afterText: string
  cursorPosition: number
}

export interface AICommandRequest {
  type: AICommandType
  context: AICommandContext
  userInput?: string // 用户的额外输入（如改写需求）
}

export interface AICommandResult {
  content: string
  reasoning?: string
}
```

### 2.3 创建 AI 指令 API

**修改文件：** `client/src/api/ai.ts`

在文件末尾添加：

```typescript
/**
 * AI 快捷指令 API
 */
export async function executeAICommand(params: {
  type: string
  context: {
    selectedText: string
    beforeText: string
    afterText: string
  }
  userInput?: string
  model?: string
  onReasoning?: (reasoning: string) => void
  onChunk?: (chunk: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}): Promise<void> {
  const {
    type,
    context,
    userInput,
    model = 'deepseek-chat',
    onReasoning,
    onChunk,
    onComplete,
    onError,
  } = params

  try {
    const response = await fetch(`${API_BASE_URL}/ai/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        context,
        userInput,
        model,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue

        const data = line.slice(6) // 移除 "data: " 前缀

        if (data === '[DONE]') {
          onComplete?.()
          return
        }

        try {
          const parsed = JSON.parse(data)

          if (parsed.type === 'reasoning' && onReasoning) {
            onReasoning(parsed.content)
          } else if (parsed.type === 'content' && onChunk) {
            onChunk(parsed.content)
          } else if (parsed.type === 'error') {
            throw new Error(parsed.content)
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e)
        }
      }
    }
  } catch (error) {
    console.error('AI 指令执行失败:', error)
    onError?.(error as Error)
  }
}
```

### 2.4 创建后端 AI 指令路由

**修改文件：** `server/src/routes/ai.ts`

在文件末尾添加：

```typescript
/**
 * AI 快捷指令
 * POST /api/ai/command
 */
router.post('/command', async (ctx) => {
  try {
    const { type, context, userInput, model = 'deepseek-chat' } = ctx.request.body as {
      type: string
      context: {
        selectedText: string
        beforeText: string
        afterText: string
      }
      userInput?: string
      model?: string
    }

    // 验证参数
    if (!type || !context) {
      ctx.status = 400
      ctx.body = { error: '缺少必要参数' }
      return
    }

    // 构建 Prompt
    let systemPrompt = ''
    let userPrompt = ''

    switch (type) {
      case 'rewrite':
        systemPrompt = '你是一个专业的文字编辑助手。请根据用户的要求改写选中的文本，保持原意但优化表达。'
        userPrompt = `请改写以下文本：\n\n${context.selectedText}\n\n`
        if (userInput) {
          userPrompt += `用户要求：${userInput}`
        }
        break

      case 'continue':
        systemPrompt = '你是一个专业的写作助手。请根据上文内容自然地续写，保持风格和语气一致。'
        userPrompt = `上文内容：\n${context.beforeText}\n\n请继续写作。`
        break

      case 'expand':
        systemPrompt = '你是一个专业的写作助手。请将选中的文本详细展开，增加细节和说明。'
        userPrompt = `请详细展开以下文本：\n\n${context.selectedText}`
        break

      case 'summarize':
        systemPrompt = '你是一个专业的文本总结助手。请简洁准确地总结选中的文本。'
        userPrompt = `请总结以下文本：\n\n${context.selectedText}`
        break

      case 'translate':
        systemPrompt = '你是一个专业的翻译助手。请检测文本语言，如果是中文则翻译成英文，如果是英文则翻译成中文。'
        userPrompt = `请翻译以下文本：\n\n${context.selectedText}`
        break

      default:
        ctx.status = 400
        ctx.body = { error: '不支持的指令类型' }
        return
    }

    // 设置 SSE 响应头
    ctx.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    ctx.status = 200

    // 调用 AI 服务
    await streamChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      ctx.res
    )
  } catch (error) {
    console.error('AI 指令错误:', error)
    ctx.status = 500
    ctx.body = { error: 'AI 指令执行失败' }
  }
})
```

### 2.5 创建 AI 指令对话框组件

**新建文件：** `client/src/components/editor/AICommandDialog.tsx`

这是一个完整的对话框组件，包含以下功能：
- 支持 5 种 AI 指令类型
- 显示思考过程（reasoning）
- 流式显示生成内容
- 提供替换原文和放弃按钮
- 替换后使用临时高亮（不保存到文档）

**关键实现细节：**

1. **提取上下文**：
```typescript
const extractContext = () => {
  const { from, to } = editor.state.selection
  const selectedText = editor.state.doc.textBetween(from, to, '\n')
  const beforeText = editor.state.doc.textBetween(Math.max(0, from - 500), from, '\n')
  const afterText = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 500), '\n')
  return { selectedText, beforeText, afterText, from, to }
}
```

2. **替换内容并高亮**：
```typescript
const handleReplace = async () => {
  const { from, to } = originalSelection
  const html = marked.parse(generatedContent, { async: false }) as string

  // 一次性完成：选中 -> 删除 -> 插入
  editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(html).run()

  // 获取插入后的位置
  const currentPos = editor.state.selection.to

  // 选中新插入的内容
  editor.chain().setTextSelection({ from, to: currentPos }).run()

  // 添加临时高亮样式（使用 CSS ::selection）
  const styleId = 'ai-temp-highlight-style'
  let style = document.getElementById(styleId) as HTMLStyleElement
  if (!style) {
    style = document.createElement('style')
    style.id = styleId
    document.head.appendChild(style)
  }
  style.textContent = `
    .ProseMirror ::selection {
      background-color: #fef08a !important;
    }
    .ProseMirror ::-moz-selection {
      background-color: #fef08a !important;
    }
  `

  // 监听点击事件，点击任意位置移除高亮
  const handleClick = () => {
    const styleEl = document.getElementById(styleId)
    if (styleEl) styleEl.remove()
    editor.commands.focus()
    editor.commands.setTextSelection(currentPos)
    document.removeEventListener('click', handleClick)
  }

  setTimeout(() => {
    document.addEventListener('click', handleClick)
  }, 100)

  onClose()
}
```

**重要说明：**
- 使用 CSS `::selection` 伪类实现临时高亮，不会保存到文档中
- 点击任意位置后移除高亮样式
- 这样避免了高亮被持久化到数据库的问题

### 2.6 创建浮动菜单组件

**新建文件：** `client/src/components/editor/BubbleMenu.tsx`

```typescript
import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { AICommandType } from '../../types/aiCommand'

interface BubbleMenuProps {
  editor: Editor
  onAICommand?: (type: AICommandType) => void
  isDialogOpen?: boolean  // 新增：对话框是否打开
}

function BubbleMenuComponent({ editor, onAICommand, isDialogOpen }: BubbleMenuProps) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!editor) return

    const updateMenu = () => {
      const { state, view } = editor
      const { from, to } = state.selection
      const isTextSelected = from !== to

      // 如果对话框打开，不显示菜单
      if (isTextSelected && !isDialogOpen) {
        const start = view.coordsAtPos(from)
        const end = view.coordsAtPos(to)
        const left = (start.left + end.left) / 2
        const top = start.top - 10
        setPosition({ top, left })
        setShow(true)
      } else {
        setShow(false)
      }
    }

    editor.on('selectionUpdate', updateMenu)
    editor.on('transaction', updateMenu)

    return () => {
      editor.off('selectionUpdate', updateMenu)
      editor.off('transaction', updateMenu)
    }
  }, [editor, isDialogOpen])  // 依赖 isDialogOpen

  if (!editor || !onAICommand || !show) {
    return null
  }

  const handleRewrite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShow(false)
    onAICommand('rewrite')
    // 不清除选区，让对话框使用选区信息
  }

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className="fixed flex flex-col bg-white rounded-lg border border-gray-200 shadow-xl py-1 min-w-[120px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <button
        onMouseDown={handleButtonMouseDown}
        onClick={handleRewrite}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer w-full"
        style={{ pointerEvents: 'auto' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        改写
      </button>
    </div>
  )
}

export default BubbleMenuComponent
```

**关键修复：**
1. 添加 `isDialogOpen` 属性，当对话框打开时隐藏浮动菜单
2. 点击按钮后不清除选区，让对话框能够提取选中的文本
3. 使用 `onMouseDown` 阻止默认行为，避免编辑器失去焦点

### 2.7 集成到编辑器
### 2.7 集成到编辑器

**修改文件：** `client/src/components/editor/TiptapEditor.tsx`

在编辑器中集成 BubbleMenu 和 AICommandDialog：

```typescript
// 在 extensions 中添加 Highlight
import { Highlight } from '../../extensions/Highlight'

const editor = useEditor({
  extensions: [
    // ... 其他扩展
    Highlight.configure({
      multicolor: true,
    }),
  ],
})

// 在 JSX 中添加组件
<BubbleMenuComponent 
  editor={editor} 
  onAICommand={openAICommand}
  isDialogOpen={isAICommandDialogOpen}  // 传递对话框状态
/>

{aiCommandType && (
  <AICommandDialog
    editor={editor}
    type={aiCommandType}
    isOpen={isAICommandDialogOpen}
    onClose={() => {
      setIsAICommandDialogOpen(false)
      setAICommandType(null)
    }}
  />
)}
```

---

## 3. 关键修复和优化

### 3.1 高亮不持久化问题

**问题：** 使用 Tiptap Mark 的高亮会被保存到数据库，刷新后仍然存在

**解决方案：** 使用 CSS `::selection` 伪类实现临时高亮

```typescript
// 不使用 Mark 高亮
// editor.chain().setHighlight({ color: '#fef08a' }).run()

// 使用 CSS 临时高亮
const style = document.createElement('style')
style.id = 'ai-temp-highlight-style'
style.textContent = `
  .ProseMirror ::selection {
    background-color: #fef08a !important;
  }
`
document.head.appendChild(style)

// 点击后移除
document.addEventListener('click', () => {
  document.getElementById('ai-temp-highlight-style')?.remove()
})
```

### 3.2 浮动菜单重复显示问题

**问题：** 点击改写按钮后，对话框打开时浮动菜单仍然显示

**解决方案：** 传递对话框状态给 BubbleMenu

```typescript
// TiptapEditor.tsx
<BubbleMenuComponent 
  editor={editor} 
  onAICommand={openAICommand}
  isDialogOpen={isAICommandDialogOpen}  // 新增
/>

// BubbleMenu.tsx
if (isTextSelected && !isDialogOpen) {
  setShow(true)
} else {
  setShow(false)
}
```

### 3.3 选区丢失问题

**问题：** 点击改写按钮后，选区被清除，对话框无法提取选中的文本

**解决方案：** 不在点击时清除选区

```typescript
const handleRewrite = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setShow(false)
  onAICommand('rewrite')
  // 移除：editor.commands.setTextSelection(editor.state.selection.to)
}
```

### 3.4 内容替换位置错误

**问题：** 替换后高亮的位置不对

**解决方案：** 在一个 chain 中完成所有操作

```typescript
// 错误：分开操作
editor.chain().setTextSelection({ from, to }).run()
editor.chain().deleteSelection().run()
editor.chain().insertContent(html).run()

// 正确：一次性完成
editor.chain()
  .focus()
  .setTextSelection({ from, to })
  .deleteSelection()
  .insertContent(html)
  .run()

// 然后获取新位置
const currentPos = editor.state.selection.to
editor.chain().setTextSelection({ from, to: currentPos }).run()
```

---

## 4. 验证功能

### 3.1 启动开发服务器

```bash
pnpm dev
```

### 3.2 测试改写功能

1. **选中文本**
   - 在编辑器中输入一段文字
   - 选中这段文字

2. **点击改写按钮**
   - 浮动菜单会自动出现在选中文本上方
   - 点击浮动菜单中的"改写"按钮
   - 对话框弹出

3. **输入需求（可选）**
   - 输入"使语气更正式"
   - 点击"执行"按钮

4. **观察生成过程**
   - 显示"正在思考中"
   - 显示"内容生成中..."
   - 显示生成的内容

5. **替换原文**
   - 点击"替换原文"按钮
   - 原文被替换
   - 新内容高亮显示（黄色背景）
   - 3秒后高亮自动消失

### 3.3 测试续写功能

1. **定位光标**
   - 在编辑器中输入一段文字
   - 将光标放在文字末尾

2. **点击续写按钮**
   - 点击工具栏的"续写"按钮（紫色按钮，带闪电图标）
   - 对话框弹出并自动开始执行

3. **观察生成**
   - AI 根据上文内容续写
   - 生成完成后点击"替换原文"
   - 新内容追加到光标位置
   - 新内容高亮显示

### 3.4 测试扩写功能

1. **选中简短文本**
   - 选中一句话或一个段落

2. **点击扩写按钮**
   - 浮动菜单中点击"扩写"
   - AI 将内容详细展开
   - 替换原文后高亮显示

### 3.5 测试总结功能

1. **选中长文本**
   - 选中多个段落

2. **点击总结按钮**
   - 浮动菜单中点击"总结"
   - AI 生成简洁摘要
   - 替换原文后高亮显示

### 3.6 测试翻译功能

1. **选中中文文本**
   - 浮动菜单中点击"翻译"
   - AI 自动翻译成英文

2. **选中英文文本**
   - 浮动菜单中点击"翻译"
   - AI 自动翻译成中文

---

## 4. 核心知识点

### 4.1 Tiptap Mark 扩展

Mark 是 Tiptap 中用于标记文本的扩展类型：

```typescript
// 创建 Mark
const Highlight = Mark.create({
  name: 'highlight',
  // 定义属性
  addAttributes() {
    return { color: { default: null } }
  },
  // 定义命令
  addCommands() {
    return {
      setHighlight: (attrs) => ({ commands }) => {
        return commands.setMark(this.name, attrs)
      },
    }
  },
})
```

### 4.2 上下文提取策略

提取选中文本及其前后文：

```typescript
const { from, to } = editor.state.selection
const selectedText = editor.state.doc.textBetween(from, to, '\n')
const beforeText = editor.state.doc.textBetween(
  Math.max(0, from - 500), 
  from, 
  '\n'
)
const afterText = editor.state.doc.textBetween(
  to, 
  Math.min(editor.state.doc.content.size, to + 500), 
  '\n'
)
```

### 4.3 Prompt Engineering

针对不同指令设计专门的 Prompt：

**改写 Prompt：**
```
系统：你是一个专业的文字编辑助手。请根据用户的要求改写选中的文本，保持原意但优化表达。只返回改写后的文本，不要添加任何解释或说明。

用户：请改写以下文本：
[选中的文本]

用户要求：[用户输入的需求]
```

**续写 Prompt：**
```
系统：你是一个专业的写作助手。请根据上文内容自然地续写，保持风格和语气一致。只返回续写的内容，不要重复上文。

用户：上文内容：
[前文]

请继续写作。
```

### 4.4 内容替换和高亮

**使用临时 CSS 高亮（推荐）：**

```typescript
// 1. 替换内容
editor.chain()
  .focus()
  .setTextSelection({ from, to })
  .deleteSelection()
  .insertContent(html)
  .run()

// 2. 获取新内容的位置
const currentPos = editor.state.selection.to

// 3. 选中新内容
editor.chain().setTextSelection({ from, to: currentPos }).run()

// 4. 添加临时高亮样式
const style = document.createElement('style')
style.id = 'ai-temp-highlight-style'
style.textContent = `
  .ProseMirror ::selection {
    background-color: #fef08a !important;
  }
`
document.head.appendChild(style)

// 5. 点击后移除高亮
const handleClick = () => {
  document.getElementById('ai-temp-highlight-style')?.remove()
  editor.commands.setTextSelection(currentPos)
  document.removeEventListener('click', handleClick)
}
setTimeout(() => {
  document.addEventListener('click', handleClick)
}, 100)
```

**为什么不使用 Mark 高亮：**
- Mark 高亮会被保存到文档中
- 刷新页面后高亮仍然存在
- 需要手动清理数据库中的高亮标记
- CSS 临时高亮不会持久化，更适合这个场景

---

## 5. 常见问题

### 5.1 高亮持久化问题

**问题：** 使用 Mark 高亮后，刷新页面高亮仍然存在

**原因：** Mark 是文档的一部分，会被保存到数据库

**解决：** 使用 CSS `::selection` 实现临时高亮，不修改文档结构

### 5.2 浮动菜单重复显示

**问题：** 对话框打开时，浮动菜单仍然显示

**原因：** 浮动菜单只检查了选区状态，没有检查对话框状态

**解决：** 传递 `isDialogOpen` 属性给 BubbleMenu

### 5.3 选区丢失问题

**问题：** 点击改写按钮后，对话框无法提取选中的文本

**原因：** 点击按钮时清除了选区

**解决：** 不在点击时清除选区，保留选区供对话框使用

---

## 6. 面试考点

### 6.1 Tiptap Mark vs Node

**问题：** Mark 和 Node 有什么区别？

**答案：**
- **Node**：块级元素，如段落、标题、列表
- **Mark**：行内标记，如加粗、斜体、高亮
- Mark 可以嵌套，Node 不能
- Mark 不影响文档结构，Node 影响

### 6.2 上下文窗口管理

**问题：** 为什么要限制上下文长度？

**答案：**
1. **Token 限制**：AI 模型有最大 token 限制
2. **性能考虑**：过长的上下文会增加响应时间
3. **相关性**：距离太远的内容相关性低
4. **成本控制**：Token 数量影响 API 调用成本

### 6.3 Prompt Engineering 原则

**问题：** 如何设计好的 Prompt？

**答案：**
1. **明确角色**：告诉 AI 它是什么（编辑助手、翻译助手）
2. **清晰指令**：明确要做什么（改写、总结、翻译）
3. **输出格式**：指定输出格式（只返回结果，不要解释）
4. **示例引导**：提供示例（few-shot learning）
5. **约束条件**：添加限制（保持原意、风格一致）

### 6.4 高亮实现方案对比

**问题：** 除了 Mark，还有什么方式实现高亮？

**答案：**
1. **Mark 扩展**（推荐）：
   - 优点：与编辑器深度集成，支持撤销/重做
   - 缺点：需要创建自定义扩展

2. **Decoration**：
   - 优点：不修改文档结构，纯视觉效果
   - 缺点：不持久化，刷新后消失

3. **CSS 类名**：
   - 优点：简单直接
   - 缺点：需要手动管理，不支持嵌套

---

## 7. 下一步

在下一章（Chapter 24），我们将：
1. 实现对话历史管理
2. 实现多模型切换
3. 实现 Token 使用统计
4. 实现 AI 响应缓存
5. 添加快捷键支持（Ctrl+K）
6. 添加右键菜单 AI 选项
7. 性能优化和错误处理

---

## 8. 本章总结

本章我们实现了完整的 AI 快捷指令系统：

**完成的功能：**
- ✅ 创建 Highlight 扩展（支持多色高亮）
- ✅ 定义 AI 指令类型
- ✅ 实现 AI 指令 API（前端 + 后端）
- ✅ 创建 AI 指令对话框组件
- ✅ 实现 5 种 AI 指令：改写、续写、扩写、总结、翻译
- ✅ 实现上下文自动提取
- ✅ 实现内容替换和临时高亮（不持久化）
- ✅ 集成到浮动菜单（BubbleMenu）
- ✅ 集成续写按钮到工具栏（MenuBar）
- ✅ 续写功能自动执行
- ✅ 修复浮动菜单重复显示问题
- ✅ 修复选区丢失问题
- ✅ 修复高亮持久化问题
- ✅ 点击任意位置取消高亮

**技术要点：**
- Tiptap Mark 扩展开发
- 选区操作和内容替换
- 上下文提取策略
- Prompt Engineering
- 流式响应处理
- CSS 临时高亮（不使用 Mark）
- 事件处理和状态管理

**用户体验：**
- 选中文本时浮动菜单自动出现
- 浮动菜单包含 AI 指令按钮（改写）
- 工具栏包含续写按钮（不需要选中文本）
- 对话框打开时浮动菜单自动隐藏
- 清晰的对话框界面
- 实时显示生成过程
- 灵活的操作选项（替换/放弃）
- 视觉反馈（临时高亮新内容）
- 点击任意位置取消高亮
- 高亮不会保存到数据库
- 续写功能自动执行（无需点击执行按钮）

**Prompt 设计：**
- 每种指令都有专门的系统提示词
- 明确输出格式要求
- 避免 AI 添加多余解释
- 保持风格和语气一致

**关键修复：**
1. **高亮持久化问题**：使用 CSS `::selection` 代替 Mark 高亮
2. **浮动菜单重复显示**：传递 `isDialogOpen` 状态
3. **选区丢失问题**：点击按钮时不清除选区
4. **内容替换位置错误**：在一个 chain 中完成所有操作

现在用户可以通过浮动菜单和工具栏快速使用 AI 改写、续写、扩写、总结和翻译功能了！

---

**Commit 信息：**
```
feat: 实现 AI 快捷指令系统（改写、续写、扩写、总结、翻译）

- 创建 Highlight 扩展支持内容高亮标记
- 定义 AI 指令类型和接口
- 实现前端 executeAICommand API
- 实现后端 /api/ai/command 路由
- 为每种指令设计专门的 Prompt 模板
- 创建 AICommandDialog 对话框组件
- 实现上下文自动提取（选中文本 + 前后文）
- 实现内容替换和高亮功能
- 高亮 3 秒后自动消失
- 在 BubbleMenu 添加 4 个 AI 指令按钮（改写、扩写、总结、翻译）
- 在 MenuBar 添加续写按钮
- 集成 Highlight 扩展到 TiptapEditor
- 添加高亮样式到 CSS
- 支持流式生成和思考过程显示
- 提供替换原文和放弃操作
- 续写功能自动执行
- 编写 Chapter 23 完整教程文档
```
