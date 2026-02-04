# 第 32 章：首页和路由系统

## 本章概述

在前面的章节中，我们实现了完整的编辑器功能和 AI 写作助手。但用户每次都需要先进入编辑器，然后在右侧 AI 面板中输入需求。这个流程不够直观，也不符合现代 AI 写作工具的交互模式。

本章我们将实现：
1. **AI 对话式首页**：用户可以直接在首页输入写作需求
2. **路由系统**：首页和编辑器页面的路由管理
3. **无缝衔接**：从首页到编辑器的流畅过渡
4. **参数传递**：将用户的输入和选项传递到编辑器
5. **自动触发**：到达编辑器后自动开始 AI 生成

## 功能设计

### 用户体验流程

```
首页（/）
  ↓
输入写作需求："写一个 AI 应用开发平台的标书"
  ↓
选择选项：
  - [✓] 分步生成（可选）
  - [✓] 深度思考（可选）
  ↓
点击发送
  ↓
自动创建文档并跳转到编辑器（/editor/:id）
  ↓
右侧 AI 面板自动开始生成
  ↓
显示思考过程（如果启用深度思考）
  ↓
流式生成内容到编辑器
```

### 首页设计

首页采用对话式设计，包含：
- 欢迎标题和说明
- 大型输入框（支持多行）
- 分步生成开关
- 深度思考开关
- 发送按钮
- 我的文档列表（可折叠）

## 技术实现

### 1. 安装路由依赖

首先安装 React Router：

```bash
pnpm add react-router-dom
```

### 2. 创建首页组件

创建 `client/src/pages/HomePage.tsx`：

```typescript
/**
 * 首页组件
 * AI 对话式写作界面
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../store/documentStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type GenerationMode = 'full' | 'outline'

function HomePage() {
  const navigate = useNavigate()
  const { documents, loading, fetchDocuments } = useDocumentStore()
  const [input, setInput] = useState('')
  const [generationMode, setGenerationMode] = useState<GenerationMode>('full')
  const [enableDeepThink, setEnableDeepThink] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)

  // 获取最近文档（最多显示 6 个）
  const recentDocuments = documents.slice(0, 6)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 开始创作
  const handleStartWriting = async () => {
    if (!input.trim()) return

    // 创建新文档并跳转到编辑器
    const { createDocument } = useDocumentStore.getState()
    const doc = await createDocument({
      title: input.substring(0, 50) || '无标题文档',
      content: '',
    })
    
    if (doc) {
      // 跳转到编辑器，并通过 state 传递参数
      navigate(`/editor/${doc.id}`, {
        state: {
          initialPrompt: input,
          generationMode,
          enableDeepThink,
        }
      })
    }
  }

  // ... 其他代码
}
```

**关键点：**
1. 使用 `useNavigate` 进行路由跳转
2. 通过 `state` 传递初始提示词和选项
3. 创建文档后立即跳转到编辑器

### 3. 创建编辑器页面组件

创建 `client/src/pages/EditorPage.tsx`：

```typescript
/**
 * 编辑器页面组件
 */

import { useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import EditorContainer from '../components/editor/EditorContainer'
import { useDocumentStore } from '../store/documentStore'

interface LocationState {
  initialPrompt?: string
  generationMode?: 'full' | 'outline'
  enableDeepThink?: boolean
}

function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { documents, currentDocument, setCurrentDocument, fetchDocuments } = useDocumentStore()
  
  // 获取从首页传递的状态
  const state = location.state as LocationState

  // 获取文档列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 根据 URL 参数设置当前文档
  useEffect(() => {
    if (documentId) {
      const id = parseInt(documentId, 10)
      const doc = documents.find(d => d.id === id)
      if (doc) {
        setCurrentDocument(doc)
      }
    } else if (!currentDocument && documents.length > 0) {
      // 如果没有指定文档 ID，选择第一个文档
      const firstDoc = documents[0]
      setCurrentDocument(firstDoc)
      navigate(`/editor/${firstDoc.id}`, { replace: true })
    }
  }, [documentId, documents, currentDocument, setCurrentDocument, navigate])

  return (
    <Layout onDocumentSelect={(id) => navigate(`/editor/${id}`)}>
      <EditorContainer 
        initialPrompt={state?.initialPrompt}
        initialGenerationMode={state?.generationMode}
        initialEnableDeepThink={state?.enableDeepThink}
      />
    </Layout>
  )
}

export default EditorPage
```

**关键点：**
1. 使用 `useLocation` 获取路由 state
2. 将参数传递给 `EditorContainer`
3. 处理文档选择和 URL 同步

### 4. 配置路由

修改 `client/src/App.tsx`：

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 首页 */}
        <Route path="/" element={<HomePage />} />
        
        {/* 编辑器页面 */}
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:documentId" element={<EditorPage />} />
        
        {/* 默认重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**路由说明：**
- `/`：首页，AI 对话式写作界面
- `/editor`：编辑器，自动选择第一个文档
- `/editor/:documentId`：打开指定文档
- `*`：404 重定向到首页

### 5. 更新 EditorContainer

修改 `client/src/components/editor/EditorContainer.tsx`：

```typescript
interface EditorContainerProps {
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}

function EditorContainer({ 
  initialPrompt, 
  initialGenerationMode,
  initialEnableDeepThink 
}: EditorContainerProps) {
  // ... 其他代码

  return (
    <TiptapEditor
      document={currentDocument}
      onUpdate={handleContentUpdate}
      saveStatus={isSaving ? 'saving' : lastSaved ? 'saved' : 'unsaved'}
      initialPrompt={initialPrompt}
      initialGenerationMode={initialGenerationMode}
      initialEnableDeepThink={initialEnableDeepThink}
    />
  )
}
```

### 6. 更新 TiptapEditor

修改 `client/src/components/editor/TiptapEditor.tsx`：

```typescript
interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}

function TiptapEditor({ 
  document, 
  onUpdate, 
  saveStatus = 'unsaved', 
  initialPrompt, 
  initialGenerationMode,
  initialEnableDeepThink 
}: TiptapEditorProps) {
  // ... 其他代码

  return (
    // ...
    <AIChatPanel
      isOpen={isAIPanelOpen}
      onClose={() => setIsAIPanelOpen(false)}
      editor={editor}
      documentId={document.id}
      onSuggestionsReceived={handleSuggestionsReceived}
      onStreamingChange={setIsAIStreaming}
      initialPrompt={initialPrompt}
      initialGenerationMode={initialGenerationMode}
      initialEnableDeepThink={initialEnableDeepThink}
    />
  )
}
```

### 7. 更新 AIChatPanel - 自动触发

修改 `client/src/components/editor/AIChatPanel.tsx`：

```typescript
import { useState, useRef, useEffect } from 'react'

interface AIChatPanelProps {
  // ... 其他 props
  initialPrompt?: string
  initialGenerationMode?: 'full' | 'outline'
  initialEnableDeepThink?: boolean
}

function AIChatPanel({ 
  // ... 其他参数
  initialPrompt, 
  initialGenerationMode,
  initialEnableDeepThink 
}: AIChatPanelProps) {
  // 使用初始值设置状态
  const [input, setInput] = useState(initialPrompt || '')
  const [generationMode, setGenerationMode] = useState<GenerationMode>(
    initialGenerationMode || 'full'
  )
  const [enableDeepThink, setEnableDeepThink] = useState(
    initialEnableDeepThink || false
  )
  
  // 使用 ref 标记是否已经触发过初始提示词
  const hasTriggeredInitialPrompt = useRef(false)
  
  // 自动触发初始提示词（只触发一次）
  useEffect(() => {
    // 检查条件：
    // 1. 有初始提示词
    // 2. 编辑器已初始化
    // 3. 没有消息历史（说明是新文档）
    // 4. 还没有触发过
    if (
      initialPrompt && 
      editor && 
      messages.length === 0 && 
      !hasTriggeredInitialPrompt.current
    ) {
      hasTriggeredInitialPrompt.current = true
      // 延迟一点执行，确保编辑器已经完全初始化
      const timer = setTimeout(() => {
        handleSend()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [initialPrompt, editor, messages.length])

  // ... 其他代码
}
```

**关键点：**
1. 使用 `useRef` 标记是否已触发，防止重复触发
2. 检查多个条件确保安全触发
3. 延迟 500ms 确保编辑器完全初始化

### 8. 更新 Header 组件

修改 `client/src/components/layout/Header.tsx`，添加返回首页和新建文档功能：

```typescript
import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../../store/documentStore'

function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate()
  const { createDocument } = useDocumentStore()

  // 创建新文档
  const handleCreateDocument = async () => {
    const doc = await createDocument({
      title: '无标题文档',
      content: '',
    })
    if (doc) {
      navigate(`/editor/${doc.id}`)
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Logo - 点击返回首页 */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold">
          E
        </div>
        <h1 className="text-lg font-semibold text-gray-900">
          协同编辑器
        </h1>
      </button>

      {/* 新建文档按钮 */}
      <button
        onClick={handleCreateDocument}
        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        新建文档
      </button>
    </header>
  )
}
```

## 数据流详解

### 完整的数据流

```
┌─────────────────────────────────────────────────────────┐
│ 1. 首页 (HomePage)                                       │
│    - 用户输入: "写一个 AI 应用开发平台的标书"              │
│    - 选择: generationMode = 'outline'                   │
│    - 选择: enableDeepThink = true                       │
│    - 点击发送                                            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 创建文档                                              │
│    - createDocument({ title, content })                 │
│    - 返回: doc.id = 123                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 路由跳转                                              │
│    - navigate('/editor/123', {                          │
│        state: {                                         │
│          initialPrompt: "写一个...",                     │
│          generationMode: 'outline',                     │
│          enableDeepThink: true                          │
│        }                                                │
│      })                                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 编辑器页面 (EditorPage)                               │
│    - 接收 state 参数                                     │
│    - 传递给 EditorContainer                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. EditorContainer                                      │
│    - 传递给 TiptapEditor                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. TiptapEditor                                         │
│    - 传递给 AIChatPanel                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 7. AIChatPanel                                          │
│    - 设置初始状态                                        │
│    - 自动触发 handleSend()                              │
│    - 开始生成（显示思考过程）                            │
└─────────────────────────────────────────────────────────┘
```

## 重要问题和解决方案

### 问题：浏览器前进/后退重复触发

**现象：**
用户使用浏览器的前进/后退按钮时，会重复触发 AI 对话。

**原因：**
React Router 的 `location.state` 在浏览器历史记录中被保留，导致 `useEffect` 重复触发。

**解决方案：**
使用 `useRef` 标记 + 多重条件检查：

```typescript
// 使用 ref 标记是否已经触发过
const hasTriggeredInitialPrompt = useRef(false)

useEffect(() => {
  if (
    initialPrompt &&                        // 1. 有初始提示词
    editor &&                                // 2. 编辑器已初始化
    messages.length === 0 &&                 // 3. 没有消息历史
    !hasTriggeredInitialPrompt.current       // 4. 还没触发过
  ) {
    hasTriggeredInitialPrompt.current = true
    const timer = setTimeout(() => {
      handleSend()
    }, 500)
    return () => clearTimeout(timer)
  }
}, [initialPrompt, editor, messages.length])
```

**为什么这样做？**
1. `useRef` 的值在组件重新渲染时保持不变
2. 即使用户使用浏览器前进/后退，ref 也会保持
3. 多重条件检查确保不会误触发

## 首页 UI 设计

### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
│  Logo  智能写作助手              [我的文档] [用户头像]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Hi，我是智能写作助手                        │
│     融合大模型能力，支持知识库学习、全文搜索文献...       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 您好，有什么可以帮您？                              │ │
│  │                                                   │ │
│  │                                                   │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [✓分步生成] [✓深度思考]          📎 🎤 [发送→]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              内容由AI生成，仅供参考                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 最近文档                                查看全部 → │   │
│  │ ┌─────────────────────────────────────────────┐ │   │
│  │ │ 📄 标书草稿              2小时前              │ │   │
│  │ └─────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 按钮状态设计

**分步生成按钮：**
```typescript
<button
  onClick={() => setGenerationMode(
    generationMode === 'outline' ? 'full' : 'outline'
  )}
  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
    generationMode === 'outline'
      ? 'bg-purple-100 text-purple-700 border border-purple-300'
      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
  }`}
>
  <svg>...</svg>
  分步生成
  {generationMode === 'outline' && <CheckIcon />}
</button>
```

**深度思考开关：**
```typescript
<button
  onClick={() => setEnableDeepThink(!enableDeepThink)}
  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
    enableDeepThink
      ? 'bg-purple-100 text-purple-700 border border-purple-300'
      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
  }`}
>
  <svg>...</svg>
  深度思考
  {enableDeepThink && <CheckIcon />}
</button>
```

## 使用场景

### 场景 1：快速生成（默认）

1. 用户访问首页 `/`
2. 输入："写一篇关于 AI 的文章"
3. 不选择任何选项
4. 点击发送
5. 跳转到编辑器，直接开始生成

### 场景 2：分步生成

1. 用户访问首页 `/`
2. 输入："写一个项目方案"
3. 点击"分步生成"（显示 ✓）
4. 点击发送
5. 跳转到编辑器，先生成大纲
6. 编辑大纲后，点击"基于大纲生成全文"

### 场景 3：深度思考

1. 用户访问首页 `/`
2. 输入："写一个复杂的技术方案"
3. 点击"深度思考"（显示 ✓）
4. 点击发送
5. 跳转到编辑器，右侧显示思考过程
6. 思考完成后，开始生成内容

### 场景 4：分步 + 深度思考

1. 用户访问首页 `/`
2. 输入："写一个 AI 应用开发平台的标书"
3. 点击"分步生成"和"深度思考"（都显示 ✓）
4. 点击发送
5. 跳转到编辑器，右侧显示思考过程
6. 生成大纲（带深度思考）
7. 编辑大纲后，生成全文

### 场景 5：从首页打开已有文档

1. 用户访问首页 `/`
2. 点击"我的文档"按钮
3. 看到最近文档列表
4. 点击某个文档卡片
5. 跳转到编辑器页面

### 场景 6：在编辑器中返回首页

1. 用户在编辑器页面
2. 点击 Header 中的 Logo
3. 返回首页

## 技术亮点

### 1. 状态管理

使用路由 state 传递参数，避免全局状态污染：

```typescript
navigate(`/editor/${doc.id}`, {
  state: {
    initialPrompt: input,
    generationMode,
    enableDeepThink,
  }
})
```

### 2. 自动触发机制

使用 `useEffect` + `useRef` 实现安全的自动触发：

```typescript
const hasTriggeredInitialPrompt = useRef(false)

useEffect(() => {
  if (
    initialPrompt && 
    editor && 
    messages.length === 0 && 
    !hasTriggeredInitialPrompt.current
  ) {
    hasTriggeredInitialPrompt.current = true
    setTimeout(() => handleSend(), 500)
  }
}, [initialPrompt, editor, messages.length])
```

### 3. 视觉反馈

按钮状态清晰，用户知道选择了什么：
- 选中：紫色背景 + ✓ 图标
- 未选中：白色背景 + 灰色边框

### 4. 体验流畅

从首页到编辑器无缝衔接：
- 创建文档 → 跳转 → 自动生成
- 全程可见 AI 工作过程

## 测试要点

### 功能测试

1. ✅ 首页输入 → 编辑器生成
2. ✅ 分步生成模式切换
3. ✅ 深度思考开关
4. ✅ 文档列表显示和跳转
5. ✅ Logo 返回首页
6. ✅ 新建文档功能

### 边界测试

1. ✅ 空输入不能发送
2. ✅ 浏览器前进/后退不重复触发
3. ✅ 已有对话的文档不触发
4. ✅ 刷新页面不触发
5. ✅ 直接访问编辑器不触发

### 性能测试

1. ✅ 路由跳转流畅
2. ✅ 参数传递正确
3. ✅ 自动触发及时
4. ✅ 无内存泄漏

## 常见问题

### Q1: 为什么使用路由 state 而不是 URL 参数？

**A:** 路由 state 的优势：
- 不会暴露在 URL 中（更简洁）
- 可以传递复杂对象
- 不需要序列化/反序列化
- 浏览器历史记录中保留

### Q2: 如何防止浏览器前进/后退重复触发？

**A:** 使用 `useRef` 标记 + 多重条件检查：
```typescript
const hasTriggeredInitialPrompt = useRef(false)

if (
  initialPrompt && 
  editor && 
  messages.length === 0 && 
  !hasTriggeredInitialPrompt.current
) {
  hasTriggeredInitialPrompt.current = true
  handleSend()
}
```

### Q3: 为什么延迟 500ms 触发？

**A:** 确保编辑器完全初始化：
- Tiptap 编辑器需要时间初始化
- Y.js 协同需要建立连接
- 延迟触发避免错误

### Q4: 如何处理已有对话的文档？

**A:** 检查消息历史：
```typescript
if (messages.length === 0) {
  // 只有新文档才触发
  handleSend()
}
```

## 总结

本章我们实现了完整的首页和路由系统，包括：

1. **AI 对话式首页**：用户可以直接输入写作需求
2. **路由管理**：首页和编辑器的路由配置
3. **参数传递**：通过路由 state 传递参数
4. **自动触发**：到达编辑器后自动开始生成
5. **防重复触发**：使用 ref 标记防止重复
6. **视觉反馈**：清晰的按钮状态和交互

这个设计大大提升了用户体验：
- 降低使用门槛（直接在首页输入）
- 流程更流畅（自动跳转和生成）
- 体验更连贯（全程可见 AI 工作）
- 功能更清晰（简化的选项）

下一章我们将继续优化 AI 对话面板的 UI 设计，使其更加简洁高效。
