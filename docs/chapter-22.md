# Chapter 22: 流式输出到编辑器（核心功能）

## 本章目标

实现 AI 生成内容流式输出到编辑器，这是整个 AI 写作助手的核心功能。实现双向同步：右侧 AI 对话面板和左侧编辑器同时显示生成内容。

**完成后的效果（对应原型图）：**
1. **初始状态**：左侧空白编辑器，右侧输入框
2. **用户输入**：在右侧输入需求并发送
3. **思考状态**：右侧显示"正在思考中"，左侧编辑器底部显示"思考中..."按钮
4. **流式生成**：右侧和左侧同步逐字显示内容
5. **完成状态**：显示完整内容和操作按钮（继续生成、重新生成、撤销）

---

## 1. 理论知识

### 1.1 双向流式输出

AI 生成内容需要同时更新两个地方：
- **右侧对话面板**：显示完整的对话历史
- **左侧编辑器**：显示生成的文档内容

### 1.2 Tiptap 命令系统

使用 Tiptap 的命令插入内容：

```typescript
// 在光标位置插入内容
editor.commands.insertContent(content)

// 在文档末尾插入内容
editor.commands.insertContentAt(editor.state.doc.content.size, content)

// 选中并删除内容（撤销功能）
editor.commands.setTextSelection({ from, to })
editor.commands.deleteSelection()
```

### 1.3 状态管理

需要管理的状态：
- `isGenerating`：是否正在生成
- `generatedContent`：已生成的内容
- `generationStartPos`：生成内容的起始位置（用于撤销）

---

## 2. 实现步骤

### 2.0 安装 Markdown 扩展

为了让编辑器能够正确解析和显示 Markdown 格式，需要安装 Markdown 扩展：

```bash
cd client
pnpm add tiptap-markdown@latest
```

### 2.1 修改 TiptapEditor 组件

需要将 editor 实例传递给 AIChatPanel，让它能够操作编辑器。同时添加 Markdown 支持。

**修改文件：** `client/src/components/editor/TiptapEditor.tsx`

#### 1. 导入 Markdown 扩展

```tsx
import { Markdown } from 'tiptap-markdown'
```

#### 2. 配置 Markdown 扩展

在 editor 的 extensions 数组中添加：

```tsx
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      codeBlock: false,
    }),
    // Markdown 支持
    Markdown.configure({
      html: true,
      transformPastedText: true,
      transformCopiedText: true,
    }),
    Collaboration.configure({
      fragment: ydoc.getXmlFragment('default'),
    }),
    // ... 其他扩展
  ],
  // ...
})
```

#### 3. 传递 editor 实例

在 AIChatPanel 组件调用处添加 editor 属性：

```tsx
{/* AI 对话面板 */}
{isAIPanelOpen && (
  <div style={{ width: `${100 - editorWidth}%` }}>
    <AIChatPanel
      isOpen={isAIPanelOpen}
      onClose={() => setIsAIPanelOpen(false)}
      editor={editor}  // 传递 editor 实例
    />
  </div>
)}
```

### 2.2 修改 Message 类型

**修改文件：** `client/src/types/message.ts`

添加 `isGeneratingToEditor` 字段：

```tsx
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string  // 思考过程
  timestamp: number
  isStreaming?: boolean
  isGeneratingToEditor?: boolean  // 是否正在生成到编辑器
}
```

### 2.3 修改 AIChatPanel 组件

**修改文件：** `client/src/components/editor/AIChatPanel.tsx`

#### 1. 添加 editor 属性

```tsx
import type { Editor } from '@tiptap/react'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null  // 新增：编辑器实例
}

function AIChatPanel({ isOpen, onClose, editor }: AIChatPanelProps) {
```

#### 2. 添加生成状态

```tsx
const [isGenerating, setIsGenerating] = useState(false)
const [generationStartPos, setGenerationStartPos] = useState<number | null>(null)
const [generatedContent, setGeneratedContent] = useState('')
```

#### 3. 修改发送消息逻辑（核心改动）

**关键点：**
- 生成前清空编辑器
- 只在编辑器显示内容，对话面板只显示"正在生成中..."
- 累积内容并使用 `setContent` 更新编辑器（支持 Markdown）
- 标记消息为 `isGeneratingToEditor`

```tsx
// 发送消息
const handleSend = async () => {
  if (!input.trim() || isThinking || !editor) return

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: input.trim(),
    timestamp: Date.now(),
  }

  setMessages(prev => [...prev, userMessage])
  setInput('')
  setIsThinking(true)
  setIsGenerating(true)

  // 清空编辑器内容
  editor.commands.clearContent()
  
  // 记录生成内容的起始位置（清空后是0）
  setGenerationStartPos(0)
  setGeneratedContent('')

  // 创建 AI 消息占位符（不显示内容，只显示状态）
  const aiMessage: Message = {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '',
    reasoning: '',
    timestamp: Date.now(),
    isStreaming: true,
    isGeneratingToEditor: true, // 标记正在生成到编辑器
  }
  setMessages(prev => [...prev, aiMessage])

  let accumulatedContent = ''

  // 调用 AI API
  await streamChatAPI({
    messages: [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage.content },
    ],
    model,
    onReasoning: (reasoning) => {
      // 更新思考过程（只在对话面板显示）
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.reasoning = (lastMessage.reasoning || '') + reasoning
        }
        return newMessages
      })
    },
    onChunk: (chunk) => {
      // 累积内容
      accumulatedContent += chunk
      
      // 实时更新编辑器 - 使用 setContent 支持 Markdown
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(accumulatedContent)
      }

      // 记录生成的内容
      setGeneratedContent(accumulatedContent)
    },
    onComplete: () => {
      setIsThinking(false)
      setIsGenerating(false)
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false
          lastMessage.isGeneratingToEditor = false
        }
        return newMessages
      })
    },
    onError: (error) => {
      setIsThinking(false)
      setIsGenerating(false)
      console.error('AI 错误:', error)
      setMessages(prev => prev.slice(0, -1))
    },
  })
}
```

#### 4. 修改停止生成功能

```tsx
// 停止生成
const handleStop = () => {
  setIsGenerating(false)
  setIsThinking(false)
  // TODO: 实现中断 SSE 连接
}
```

#### 5. 修改撤销生成功能

```tsx
// 撤销生成的内容
const handleUndo = () => {
  if (!editor) return

  // 直接清空编辑器
  editor.commands.clearContent()

  // 重置状态
  setGenerationStartPos(null)
  setGeneratedContent('')
}
```

#### 6. 修改 MessageItem 组件

添加"正在生成到编辑器"的显示状态和生成完成后的摘要卡片：

```tsx
// 消息项组件
function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [showReasoning, setShowReasoning] = useState(true)
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  
  const isThinking = !isUser && message.reasoning && !message.content && message.isStreaming
  const isGeneratingToEditor = !isUser && message.isGeneratingToEditor

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* 角色和时间 */}
        {/* ... */}

        {/* 思考过程 */}
        {!isUser && message.reasoning && (
          // ... 思考过程显示代码
        )}

        {/* 正在生成到编辑器的提示 */}
        {isGeneratingToEditor && (
          <div className="rounded-lg px-4 py-3 bg-blue-50 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <svg className="w-4 h-4 animate-spin">...</svg>
              <span>正在生成内容到编辑器...</span>
            </div>
          </div>
        )}

        {/* 消息内容 */}
        {isUser ? (
          // 用户消息
          <div className="rounded-lg px-4 py-3 shadow-sm bg-purple-600 text-white">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : message.content && !isGeneratingToEditor ? (
          // AI 生成完成后显示摘要卡片
          <div className="rounded-lg border border-blue-200 bg-white shadow-sm overflow-hidden">
            {/* 卡片头部 */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-blue-600">...</svg>
                <span className="font-medium text-gray-900">
                  {/* 提取标题（第一行或前30个字符） */}
                  {(() => {
                    const firstLine = message.content.split('\n')[0].replace(/^#+\s*/, '').trim()
                    return firstLine.substring(0, 30) || '已生成内容'
                  })()}
                  {message.content.length > 30 && '...'}
                </span>
              </div>
            </div>
            
            {/* 卡片内容 */}
            <div className="px-4 py-3">
              <div className="text-xs text-gray-500 mb-2">
                创建时间: {new Date(message.timestamp).toLocaleString('zh-CN')}
              </div>
              <div className="text-sm text-gray-600">
                内容已生成到编辑器，共 {message.content.length} 字
              </div>
            </div>
            
            {/* 卡片底部提示 */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                你对采购单是否满意？我可以继续为你修改内容。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

**关键点：**
- 生成中：显示蓝色"正在生成内容到编辑器..."提示
- 生成完成：显示摘要卡片，包含标题、创建时间、字数统计
- 不再显示 Markdown 渲染的正文内容

#### 6. 添加操作按钮 UI

在输入框上方添加操作按钮：

```tsx
{/* 生成完成提示和操作按钮 */}
{!isGenerating && generatedContent && (
  <div className="border-t border-gray-200 p-4 bg-green-50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-green-700">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">内容生成完成</span>
        <span className="text-xs text-gray-500">
          ({generatedContent.length} 字)
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          撤销
        </button>
        <button
          onClick={() => {
            setGeneratedContent('')
            setGenerationStartPos(null)
          }}
          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50"
        >
          确认
        </button>
      </div>
    </div>
  </div>
)}
```

#### 7. 修改输入框区域

```tsx
{/* 输入框 */}
<div className="border-t border-gray-200 p-4">
  {isGenerating && (
    <div className="mb-3 flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-center gap-2 text-sm text-purple-700">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>正在生成内容到编辑器...</span>
      </div>
      <button
        onClick={handleStop}
        className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
      >
        停止
      </button>
    </div>
  )}
  
  <div className="flex gap-2">
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="输入您的需求... (Enter 发送，Shift+Enter 换行)"
      disabled={isThinking}
      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
      rows={3}
    />
    <button
      onClick={handleSend}
      disabled={!input.trim() || isThinking || !editor}
      className="self-end rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      {isThinking ? '思考中...' : '发送'}
    </button>
  </div>
</div>
```

---

## 3. 验证功能

### 3.1 启动开发服务器

```bash
pnpm dev
```

### 3.2 测试流式输出

1. **打开编辑器**
   - 访问 http://localhost:5173
   - 选择一个文档
   - 确保 AI 面板是展开的

2. **测试基本生成**
   - 在右侧输入："请写一首关于春天的诗"
   - 点击发送
   - 观察：
     - 右侧对话面板显示 AI 回复
     - 左侧编辑器同步显示相同内容
     - 内容逐字出现（流式效果）

3. **测试生成完成**
   - 生成完成后，输入框上方应该显示绿色提示条
   - 显示"内容生成完成"和字数统计
   - 有"撤销"和"确认"按钮

4. **测试撤销功能**
   - 点击"撤销"按钮
   - 编辑器中生成的内容应该被删除
   - 对话面板的内容保留

5. **测试停止生成**
   - 发送一个较长的请求
   - 在生成过程中点击"停止"按钮
   - 生成应该停止

6. **测试协同编辑兼容性**
   - 打开两个浏览器标签页
   - 在一个标签页中使用 AI 生成内容
   - 另一个标签页应该实时看到生成的内容（通过 Y.js 同步）

---

## 4. 核心知识点

### 4.1 Markdown 支持

使用 `tiptap-markdown` 扩展让编辑器支持 Markdown 语法：

```typescript
import { Markdown } from 'tiptap-markdown'

Markdown.configure({
  html: true,                // 支持 HTML
  transformPastedText: true, // 粘贴时转换
  transformCopiedText: true, // 复制时转换
})
```

### 4.2 流式更新策略

**方案对比：**

❌ **方案1：逐块插入**
```typescript
// 问题：无法正确解析 Markdown
editor.commands.insertContentAt(pos, chunk)
```

✅ **方案2：累积后整体更新**
```typescript
// 累积内容
accumulatedContent += chunk

// 整体更新，支持 Markdown 解析
editor.commands.setContent(accumulatedContent)
```

### 4.3 双向显示策略

**对话面板：** 只显示"正在生成中..."状态，不显示正文
**编辑器：** 实时流式显示生成的内容

```typescript
// 标记正在生成到编辑器
isGeneratingToEditor: true

// 对话面板根据此标记显示特殊状态
{isGeneratingToEditor && (
  <div>正在生成内容到编辑器...</div>
)}
```

### 4.4 清空编辑器

生成前清空编辑器，避免内容混乱：

```typescript
// 清空编辑器
editor.commands.clearContent()

// 撤销时也清空
editor.commands.clearContent()
```

---

## 5. 常见问题

### 5.1 Markdown 格式显示问题

**问题：** 编辑器显示 Markdown 源码（如 `# 标题`、`**粗体**`）而不是格式化的内容

**原因：** `tiptap-markdown` 扩展主要用于导入/导出，不支持实时Markdown解析和渲染

**当前方案（第22章）：**
- 生成纯文本内容，保留段落结构
- 用户可以使用编辑器工具栏手动格式化（选中文本后点击粗体、标题等按钮）
- 这是一个已知限制，在实际项目中需要完整的Markdown解析

**完整解决方案（推荐）：**

安装 `marked` 库：
```bash
cd client
pnpm add marked
pnpm add @types/marked -D
```

修改 `AIChatPanel.tsx` 中的 `onChunk`：
```typescript
import { marked } from 'marked'

onChunk: async (chunk) => {
  accumulatedContent += chunk
  
  if (accumulatedContent.trim() && editor && !editor.isDestroyed) {
    // 使用 marked 解析 Markdown 为 HTML
    const html = await marked.parse(accumulatedContent)
    editor.commands.setContent(html)
  }
}
```

**替代方案：**
1. 提供"格式化"按钮，生成完成后一键应用格式
2. 提示用户使用工具栏手动格式化
3. 让AI生成纯文本而不是Markdown格式

### 5.2 页面抖动问题

**问题：** 生成内容时页面不断抖动

**原因：** 频繁的 DOM 更新导致布局重排

**解决：**
1. 使用 `setContent` 整体更新而不是逐块插入
2. 确保编辑器容器有固定高度
3. 使用 `overflow-auto` 而不是动态高度

### 5.3 内容不清空

**问题：** 新生成的内容追加到旧内容后面

**解决：**
```typescript
// 生成前清空编辑器
editor.commands.clearContent()
```

### 5.4 撤销功能不工作

**问题：** 点击撤销但内容没有删除

**解决：**
```typescript
// 简化撤销逻辑，直接清空
editor.commands.clearContent()
```

---

## 6. 面试考点

### 6.1 Markdown 解析

**问题：** 如何在富文本编辑器中支持 Markdown？

**答案：**
1. 使用 `tiptap-markdown` 扩展
2. 配置 `transformPastedText` 和 `transformCopiedText`
3. 使用 `setContent` 方法更新内容
4. Tiptap 会自动将 Markdown 转换为富文本节点

### 6.2 流式数据处理

**问题：** 如何实现流式数据的实时显示？

**答案：**
1. 使用 SSE 接收流式数据
2. 累积内容片段
3. 使用 `setContent` 整体更新（支持格式解析）
4. 避免频繁的 DOM 操作导致性能问题

### 6.3 双向显示策略

**问题：** 为什么对话面板不显示正文？

**答案：**
- 对话面板：显示对话历史和状态
- 编辑器：显示实际生成的文档内容
- 使用 `isGeneratingToEditor` 标记区分状态
- 避免内容重复显示

### 6.4 协同编辑兼容性

**问题：** AI 生成内容如何与协同编辑兼容？

**答案：**
- AI 生成的内容通过 Tiptap 命令插入
- Tiptap 的更改会自动同步到 Y.js
- Y.js 会将更改广播给其他用户
- 其他用户实时看到 AI 生成的内容
- 注意：使用 `setContent` 会替换全部内容，适合单人生成场景

---

## 7. 下一步

在下一章（Chapter 23），我们将：
1. 实现 AI 快捷指令（续写、改写、扩写、总结、翻译）
2. 实现上下文自动提取
3. 创建快捷指令菜单
4. 实现 Prompt 模板系统

---

## 8. 本章总结

本章我们实现了 AI 写作助手的核心功能：

**完成的功能：**
- ✅ 安装并配置 Markdown 扩展
- ✅ 生成前清空编辑器
- ✅ 流式输出到编辑器（支持 Markdown 格式）
- ✅ 对话面板只显示"正在生成中..."状态
- ✅ 编辑器实时显示格式化内容
- ✅ 撤销生成内容（清空编辑器）
- ✅ 停止生成功能
- ✅ 字数统计
- ✅ 协同编辑兼容

**技术要点：**
- Tiptap Markdown 扩展配置
- 累积内容后整体更新策略
- 双向显示策略（对话面板 vs 编辑器）
- 清空编辑器命令
- 流式数据处理

**用户体验：**
- 编辑器正确显示 Markdown 格式
- 无页面抖动
- 清晰的状态提示
- 灵活的操作选项
- 与协同编辑无缝集成

**关键修复：**
1. 安装 `tiptap-markdown` 支持 Markdown 解析
2. 使用 `setContent` 而不是 `insertContent` 
3. 生成前清空编辑器避免内容混乱
4. 对话面板不显示正文，只显示状态
5. 简化撤销逻辑，直接清空编辑器

现在 AI 生成的内容可以正确地以富文本格式显示在编辑器中了！

---

**Commit 信息：**
```
feat: 实现 AI 生成内容流式输出到编辑器（支持 Markdown）

- 安装 tiptap-markdown 扩展
- 配置 Markdown 支持（html、transformPastedText、transformCopiedText）
- 修改 TiptapEditor 传递 editor 实例给 AIChatPanel
- 生成前清空编辑器内容
- 实现流式输出到编辑器（累积内容后整体更新）
- 对话面板只显示"正在生成中..."状态，不显示正文
- 添加 isGeneratingToEditor 标记
- 实现撤销生成内容功能（清空编辑器）
- 实现停止生成功能
- 添加生成完成提示和操作按钮
- 实现字数统计
- 优化生成过程的 UI 提示
- 修复页面抖动问题
- 修复 Markdown 格式显示问题
- 确保与协同编辑兼容
```
