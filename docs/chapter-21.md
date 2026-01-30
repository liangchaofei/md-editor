# Chapter 21: AI 对话界面基础

## 本章目标

完善 AI 对话面板组件，实现消息列表展示、输入框交互、"正在思考中"状态、Markdown 渲染等功能。

**完成后的功能：**
- ✅ 实现消息列表展示（用户消息 + AI 回复）
- ✅ 实现输入框和发送功能
- ✅ 实现"正在思考中"加载状态
- ✅ 实现 Markdown 渲染
- ✅ 实现代码高亮显示
- ✅ 实现消息时间戳
- ✅ 集成前端 AI API 客户端

---

## 1. 理论知识

### 1.1 消息数据结构

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}
```

### 1.2 Markdown 渲染

使用 `react-markdown` 库渲染 AI 返回的 Markdown 格式内容：
- 支持标题、列表、代码块等
- 支持代码语法高亮
- 支持链接、图片等

### 1.3 流式消息更新

AI 流式响应时，需要实时更新最后一条消息的内容：
```typescript
// 每次收到新的 chunk
setMessages(prev => {
  const last = prev[prev.length - 1]
  return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
})
```

---

## 2. 安装依赖

### 2.1 前端依赖

```bash
cd client
pnpm add react-markdown remark-gfm rehype-highlight
```

**依赖说明：**
- `react-markdown`：Markdown 渲染组件
- `remark-gfm`：支持 GitHub Flavored Markdown（表格、删除线等）
- `rehype-highlight`：代码语法高亮

---

## 3. 创建消息类型定义

**创建文件：** `client/src/types/message.ts`

```typescript
/**
 * 消息类型定义
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export type MessageRole = Message['role']
```

---

## 4. 完善 AI 对话面板组件

**修改文件：** `client/src/components/editor/AIChatPanel.tsx`


完整代码如下：

```tsx
/**
 * AI 对话面板组件
 * 用于显示 AI 对话界面
 */

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { streamChatAPI } from '../../api/ai'
import type { Message } from '../../types/message'
import 'highlight.js/styles/github-dark.css'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsThinking(true)

    // 创建 AI 消息占位符
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    setMessages(prev => [...prev, aiMessage])

    // 调用 AI API
    await streamChatAPI({
      messages: [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content },
      ],
      onChunk: (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content += chunk
          }
          return newMessages
        })
      },
      onComplete: () => {
        setIsThinking(false)
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.isStreaming = false
          }
          return newMessages
        })
      },
      onError: (error) => {
        setIsThinking(false)
        console.error('AI 错误:', error)
        // 移除失败的消息
        setMessages(prev => prev.slice(0, -1))
        // 可以添加错误提示
      },
    })
  }

  // 按 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">AI 写作助手</h2>
          {isThinking && (
            <span className="text-xs text-purple-600">正在思考中...</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="收起 AI 面板"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm text-gray-500">您好，有什么可以帮您？</p>
              <p className="text-xs text-gray-400 mt-2">输入您的需求，AI 将帮助您创作内容</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入框 */}
        <div className="border-t border-gray-200 p-4">
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
              disabled={!input.trim() || isThinking}
              className="self-end rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isThinking ? '思考中...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 消息项组件
function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* 角色和时间 */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs font-medium text-gray-600">
            {isUser ? '我' : 'AI 助手'}
          </span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>

        {/* 消息内容 */}
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // 自定义代码块样式
                  code: ({ node, inline, className, children, ...props }) => {
                    return inline ? (
                      <code className="bg-gray-200 text-purple-600 px-1 py-0.5 rounded text-xs" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content || '...'}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIChatPanel
```

**代码说明：**
- 使用 `useState` 管理消息列表和输入状态
- 使用 `useRef` 实现自动滚动到底部
- 使用 `ReactMarkdown` 渲染 AI 回复
- 支持流式更新消息内容
- 显示"正在思考中"状态
- 支持 Enter 发送，Shift+Enter 换行

---

## 5. 创建消息类型文件

**创建文件：** `client/src/types/message.ts`

```typescript
/**
 * 消息类型定义
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export type MessageRole = Message['role']
```

---

## 6. 添加代码高亮样式

Markdown 代码块需要高亮样式。我们已经在组件中导入了 `highlight.js/styles/github-dark.css`。

如果需要其他主题，可以更换：
- `github.css` - GitHub 亮色主题
- `github-dark.css` - GitHub 暗色主题
- `monokai.css` - Monokai 主题
- `atom-one-dark.css` - Atom One Dark 主题

---

## 7. 验证功能

### 7.1 启动开发服务器

```bash
pnpm dev
```

### 7.2 测试对话功能

1. **打开编辑器**
   - 访问 http://localhost:5173
   - 选择一个文档
   - 右侧应该显示 AI 对话面板

2. **发送消息**
   - 在输入框输入："你好，请介绍一下你自己"
   - 点击"发送"按钮或按 Enter
   - 应该看到：
     - 用户消息显示在右侧（紫色气泡）
     - 头部显示"正在思考中..."
     - AI 回复逐字显示在左侧（灰色气泡）
     - 回复完成后，思考状态消失

3. **测试 Markdown 渲染**
   - 输入："请用 Markdown 格式写一个简单的代码示例"
   - AI 回复应该正确渲染：
     - 标题、列表等格式
     - 代码块有语法高亮
     - 行内代码有特殊样式

4. **测试多轮对话**
   - 继续发送消息
   - 消息列表应该保持历史记录
   - 自动滚动到最新消息

5. **测试快捷键**
   - Enter 键发送消息
   - Shift+Enter 换行

---

## 8. 核心知识点

### 8.1 流式消息更新

```typescript
// 每次收到新的 chunk，更新最后一条消息
onChunk: (chunk) => {
  setMessages(prev => {
    const newMessages = [...prev]
    const lastMessage = newMessages[newMessages.length - 1]
    if (lastMessage.role === 'assistant') {
      lastMessage.content += chunk
    }
    return newMessages
  })
}
```

### 8.2 自动滚动

```typescript
const messagesEndRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

### 8.3 Markdown 渲染

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}        // GitHub Flavored Markdown
  rehypePlugins={[rehypeHighlight]}  // 代码高亮
>
  {message.content}
</ReactMarkdown>
```

---

## 9. 常见问题

### 9.1 代码高亮不显示

**问题：** 代码块没有语法高亮

**解决：**
1. 确保导入了 highlight.js 样式
2. 确保安装了 `rehype-highlight`
3. 检查代码块的语言标记

### 9.2 消息不自动滚动

**问题：** 新消息出现时不自动滚动到底部

**解决：** 确保 `messagesEndRef` 正确绑定到最后一个元素

### 9.3 流式更新卡顿

**问题：** AI 回复时界面卡顿

**解决：** 可以添加防抖，批量更新消息

---

## 10. 面试考点

### 10.1 React 状态更新

**问题：** 如何在不可变状态中更新数组的最后一个元素？

**答案：**
```typescript
setMessages(prev => {
  const newMessages = [...prev]  // 复制数组
  const lastMessage = newMessages[newMessages.length - 1]
  lastMessage.content += chunk   // 修改最后一个元素
  return newMessages
})
```

### 10.2 Markdown 安全性

**问题：** 渲染用户输入的 Markdown 有什么安全风险？

**答案：**
- XSS 攻击风险
- react-markdown 默认会转义 HTML
- 不要使用 `dangerouslySetInnerHTML`
- 使用 `rehype-sanitize` 插件进一步清理

### 10.3 流式渲染优化

**问题：** 如何优化流式渲染性能？

**答案：**
1. 使用 `useCallback` 缓存回调函数
2. 使用 `useMemo` 缓存计算结果
3. 添加防抖，批量更新
4. 使用虚拟滚动处理大量消息

---

## 11. 下一步

在下一章（Chapter 22），我们将：
1. 实现 AI 生成内容流式输出到编辑器
2. 实现双向同步（对话面板 + 编辑器）
3. 实现停止生成功能
4. 实现撤销生成内容
5. 优化流式输出性能

---

## 12. 本章总结

本章我们完成了 AI 对话界面的基础功能：

**完成的功能：**
- ✅ 实现消息列表展示
- ✅ 实现输入框和发送功能
- ✅ 实现"正在思考中"状态
- ✅ 实现 Markdown 渲染
- ✅ 实现代码语法高亮
- ✅ 实现消息时间戳
- ✅ 集成前端 AI API 客户端
- ✅ 实现自动滚动

**技术要点：**
- React 状态管理
- 流式数据处理
- Markdown 渲染
- 代码高亮
- 自动滚动

**用户体验：**
- 实时显示 AI 回复
- 清晰的消息布局
- 流畅的交互体验
- 完整的对话历史

现在 AI 对话界面已经完成，下一章我们将实现最核心的功能：将 AI 生成的内容流式输出到编辑器！

---

**Commit 信息：**
```
feat: 实现 AI 对话界面和消息展示

- 完善 AIChatPanel 组件
- 实现消息列表展示
- 实现输入框和发送功能
- 实现"正在思考中"状态
- 集成 react-markdown 渲染 Markdown
- 集成 rehype-highlight 代码高亮
- 实现自动滚动到最新消息
- 支持 Enter 发送，Shift+Enter 换行
- 创建 Message 类型定义
```
