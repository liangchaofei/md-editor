# Chapter 19: 编辑器区域分栏 - 为 AI 对话预留空间

## 本章目标

将编辑器区域调整为左右分栏布局，为 AI 对话功能预留空间。保持现有的三栏布局（文档列表 + 编辑器区域），在编辑器区域内部实现左右分栏（富文本编辑器 + AI 对话面板）。

**完成后的布局结构：**
```
┌────────────┬──────────────────────────────────────┐
│            │        编辑器区域（拆分）              │
│  文档列表   │  ┌──────────────┬─────────────────┐  │
│            │  │              │                 │  │
│  Sidebar   │  │   Editor     │   AI Chat       │  │
│            │  │              │                 │  │
│  (可收起)   │  │   (60%)      │   (40%)         │  │
│            │  │              │                 │  │
│            │  └──────────────┴─────────────────┘  │
└────────────┴──────────────────────────────────────┘
```

---

## 1. 理论知识

### 1.1 嵌套 Flexbox 布局

在现有的三栏布局基础上，我们需要在编辑器区域内部再次使用 Flexbox 实现左右分栏：

```
外层 Flexbox（已有）：
- Sidebar（固定宽度）
- Main（flex-1，占据剩余空间）

内层 Flexbox（新增）：
- EditorPanel（flex: 0 0 60%）
- AIChatPanel（flex: 0 0 40%）
```

### 1.2 拖拽调整宽度

实现拖拽调整需要：
1. **拖拽手柄**：中间的分隔线，监听鼠标事件
2. **状态管理**：记录当前宽度比例
3. **边界限制**：最小/最大宽度限制
4. **平滑过渡**：拖拽时实时更新，释放后保存

### 1.3 面板展开/收起

AI 面板需要支持：
- **展开状态**：显示完整的 AI 对话界面
- **收起状态**：完全隐藏，编辑器占据全部空间
- **浮动按钮**：收起时显示一个浮动按钮用于重新展开

---

## 2. 实现步骤

### 2.1 创建 AI 对话面板组件

首先创建一个基础的 AI 对话面板组件，后续章节会完善功能。

**创建文件：** `client/src/components/editor/AIChatPanel.tsx`

```tsx
/**
 * AI 对话面板组件
 * 用于显示 AI 对话界面
 */

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
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
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm text-gray-500">您好，有什么可以帮您？</p>
            <p className="text-xs text-gray-400 mt-2">输入您的需求，AI 将帮助您创作内容</p>
          </div>
        </div>

        {/* 输入框 */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入您的需求..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIChatPanel
```

**代码说明：**
- 使用 `isOpen` 控制显示/隐藏
- 头部显示标题和关闭按钮
- 中间是消息列表区域（暂时显示欢迎信息）
- 底部是输入框和发送按钮
- 使用紫色主题色区分 AI 功能

### 2.2 创建可拖拽的分隔线组件

**创建文件：** `client/src/components/editor/ResizableHandle.tsx`

```tsx
/**
 * 可拖拽的分隔线组件
 * 用于调整编辑器和 AI 面板的宽度
 */

import { useEffect, useRef } from 'react'

interface ResizableHandleProps {
  onResize: (deltaX: number) => void
}

function ResizableHandle({ onResize }: ResizableHandleProps) {
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      
      const deltaX = e.clientX - startXRef.current
      startXRef.current = e.clientX
      onResize(deltaX)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onResize])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    startXRef.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      className="group relative w-1 cursor-col-resize bg-gray-200 hover:bg-purple-400 transition-colors"
      onMouseDown={handleMouseDown}
    >
      {/* 拖拽提示 */}
      <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-12 w-1 rounded-full bg-purple-500" />
      </div>
    </div>
  )
}

export default ResizableHandle
```

**代码说明：**
- 使用 `useRef` 跟踪拖拽状态，避免重复渲染
- 监听全局的 `mousemove` 和 `mouseup` 事件
- 计算鼠标移动的距离（deltaX）并通过回调传递
- 拖拽时改变鼠标样式和禁用文本选择
- hover 时显示视觉提示

### 2.3 修改 TiptapEditor 组件

现在修改 `TiptapEditor.tsx`，将其包装在一个可调整大小的容器中。

**修改文件：** `client/src/components/editor/TiptapEditor.tsx`

在文件顶部添加导入：

```tsx
import { useState, useCallback } from 'react'
import AIChatPanel from './AIChatPanel'
import ResizableHandle from './ResizableHandle'
```

在组件内部添加状态管理（在 `isVersionHistoryOpen` 状态后面）：

```tsx
// AI 面板状态
const [isAIPanelOpen, setIsAIPanelOpen] = useState(true)
const [editorWidth, setEditorWidth] = useState(60) // 编辑器宽度百分比

// 处理拖拽调整宽度
const handleResize = useCallback((deltaX: number) => {
  setEditorWidth(prev => {
    // 获取容器宽度
    const container = document.querySelector('.editor-container')
    if (!container) return prev
    
    const containerWidth = container.clientWidth
    const deltaPercent = (deltaX / containerWidth) * 100
    
    // 限制在 30% - 80% 之间
    const newWidth = Math.max(30, Math.min(80, prev + deltaPercent))
    return newWidth
  })
}, [])
```

修改返回的 JSX，将编辑器包装在分栏容器中：

```tsx
return (
  <div className="editor-container flex h-full">
    {/* 编辑器面板 */}
    <div 
      className="flex flex-col bg-white"
      style={{ width: isAIPanelOpen ? `${editorWidth}%` : '100%' }}
    >
      {/* 重连提示 */}
      <ReconnectingBanner isReconnecting={isReconnecting} />
      
      {/* 离线提示 */}
      <OfflineBanner isOffline={isOffline} />

      {/* 文档标题和连接状态 - 固定高度 */}
      <div className="flex-shrink-0 border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {document.title}
            </h1>
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
              <span>
                最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {/* AI 助手按钮 */}
            <button
              onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                isAIPanelOpen
                  ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={isAIPanelOpen ? '收起 AI 助手' : '展开 AI 助手'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 助手
            </button>
            
            {/* 版本历史按钮 */}
            <button
              onClick={() => setIsVersionHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              title="版本历史"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              版本
            </button>
            
            {/* 导出按钮 */}
            <ExportMenu editor={editor} documentTitle={document.title} />
            
            {/* 连接状态指示器 */}
            <ConnectionStatus provider={provider} />
            
            {/* 在线用户列表 */}
            <OnlineUsers provider={provider} />
          </div>
        </div>
      </div>

      {/* 固定工具栏 - 固定高度 */}
      <div className="flex-shrink-0">
        <MenuBar editor={editor} />
      </div>

      {/* 表格操作菜单 */}
      <TableMenu editor={editor} />

      {/* 浮动工具栏 */}
      <BubbleMenu editor={editor} />

      {/* 编辑器内容 - 占据剩余空间 */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* 状态栏 - 固定高度 */}
      <div className="flex-shrink-0">
        <EditorStatusBar editor={editor} saveStatus={saveStatus} provider={provider} />
      </div>

      {/* 版本历史侧边栏 */}
      <VersionHistory
        editor={editor}
        documentId={document.id}
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
      />
    </div>

    {/* 可拖拽的分隔线 */}
    {isAIPanelOpen && <ResizableHandle onResize={handleResize} />}

    {/* AI 对话面板 */}
    {isAIPanelOpen && (
      <div style={{ width: `${100 - editorWidth}%` }}>
        <AIChatPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
        />
      </div>
    )}
  </div>
)
```

**代码说明：**
- 使用 `flex` 布局实现左右分栏
- 编辑器宽度通过 `editorWidth` 状态控制
- AI 面板宽度自动计算（100% - editorWidth）
- 添加 AI 助手按钮，可以展开/收起面板
- 只有在 AI 面板展开时才显示分隔线

---

## 3. 验证功能

### 3.1 启动开发服务器

```bash
pnpm dev
```

### 3.2 测试布局

1. **查看初始布局**
   - 打开浏览器访问 http://localhost:5173
   - 选择一个文档
   - 应该看到编辑器区域分为左右两部分
   - 左侧是富文本编辑器（约 60%）
   - 右侧是 AI 对话面板（约 40%）

2. **测试拖拽调整**
   - 将鼠标移动到中间的分隔线上
   - 鼠标应该变成左右调整的样式
   - 按住鼠标左键拖动
   - 编辑器和 AI 面板的宽度应该实时调整
   - 尝试拖动到极限位置，应该被限制在 30%-80% 之间

3. **测试展开/收起**
   - 点击右上角的"AI 助手"按钮
   - AI 面板应该完全隐藏
   - 编辑器应该占据全部宽度
   - 再次点击"AI 助手"按钮
   - AI 面板应该重新显示

4. **测试响应式**
   - 调整浏览器窗口大小
   - 布局应该保持正常
   - 拖拽功能应该继续工作

### 3.3 检查样式

- AI 面板应该有紫色主题色
- 分隔线 hover 时应该有视觉反馈
- AI 助手按钮在展开时应该高亮显示
- 所有元素应该对齐整齐

---

## 4. 核心知识点

### 4.1 Flexbox 嵌套布局

```css
/* 外层容器 */
.editor-container {
  display: flex;
  height: 100%;
}

/* 编辑器面板 */
.editor-panel {
  width: 60%; /* 动态设置 */
  display: flex;
  flex-direction: column;
}

/* AI 面板 */
.ai-panel {
  width: 40%; /* 动态设置 */
  display: flex;
  flex-direction: column;
}
```

### 4.2 拖拽实现原理

```typescript
// 1. 记录拖拽开始位置
const handleMouseDown = (e: MouseEvent) => {
  isDragging = true
  startX = e.clientX
}

// 2. 计算移动距离
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging) return
  const deltaX = e.clientX - startX
  startX = e.clientX
  onResize(deltaX)
}

// 3. 结束拖拽
const handleMouseUp = () => {
  isDragging = false
}
```

### 4.3 宽度百分比计算

```typescript
// 将像素移动距离转换为百分比
const deltaPercent = (deltaX / containerWidth) * 100

// 限制在合理范围内
const newWidth = Math.max(30, Math.min(80, currentWidth + deltaPercent))
```

---

## 5. 常见问题

### 5.1 拖拽时文本被选中

**问题：** 拖拽分隔线时，编辑器中的文本被选中

**解决：** 在拖拽开始时禁用文本选择

```typescript
document.body.style.userSelect = 'none'
```

### 5.2 拖拽不流畅

**问题：** 拖拽时有卡顿

**解决：** 使用 `useRef` 而不是 `useState` 跟踪拖拽状态，避免重复渲染

### 5.3 宽度计算不准确

**问题：** 拖拽后宽度比例不对

**解决：** 确保使用容器的实际宽度计算百分比，而不是窗口宽度

---

## 6. 面试考点

### 6.1 Flexbox 布局

**问题：** Flexbox 和 Grid 的区别？

**答案：**
- Flexbox 是一维布局（行或列）
- Grid 是二维布局（行和列）
- Flexbox 更适合组件内部布局
- Grid 更适合页面整体布局

### 6.2 拖拽实现

**问题：** 如何实现拖拽功能？

**答案：**
1. 监听 `mousedown` 事件，记录起始位置
2. 监听 `mousemove` 事件，计算移动距离
3. 监听 `mouseup` 事件，结束拖拽
4. 使用 `useRef` 避免重复渲染
5. 注意清理事件监听器

### 6.3 性能优化

**问题：** 如何优化拖拽性能？

**答案：**
1. 使用 `useRef` 而不是 `useState` 跟踪拖拽状态
2. 使用 `useCallback` 缓存回调函数
3. 使用 CSS `transform` 而不是 `width` 实现动画（如果需要）
4. 使用 `requestAnimationFrame` 节流更新（如果需要）

---

## 7. 下一步

在下一章（Chapter 20），我们将：
1. 集成 DeepSeek API
2. 实现后端 AI 代理路由
3. 实现流式响应（SSE）
4. 创建前端 AI API 客户端

---

## 8. 本章总结

本章我们实现了编辑器区域的左右分栏布局：

**完成的功能：**
- ✅ 创建 AI 对话面板组件（基础版）
- ✅ 创建可拖拽的分隔线组件
- ✅ 修改 TiptapEditor 支持分栏布局
- ✅ 实现拖拽调整宽度
- ✅ 实现 AI 面板展开/收起
- ✅ 添加 AI 助手按钮

**技术要点：**
- 嵌套 Flexbox 布局
- 拖拽事件处理
- 宽度百分比计算
- 状态管理

**用户体验：**
- 平滑的拖拽调整
- 清晰的视觉反馈
- 合理的宽度限制
- 灵活的展开/收起

现在编辑器已经为 AI 功能做好了准备，下一章我们将集成 DeepSeek API！

---

**Commit 信息：**
```
feat: 编辑器区域调整为左右分栏，右侧添加 AI 对话面板

- 创建 AIChatPanel 组件（基础版）
- 创建 ResizableHandle 可拖拽分隔线组件
- 修改 TiptapEditor 支持分栏布局
- 实现拖拽调整编辑器和 AI 面板宽度
- 实现 AI 面板展开/收起功能
- 添加 AI 助手按钮
- 宽度限制在 30%-80% 之间
```
