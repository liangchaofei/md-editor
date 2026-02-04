# 第33章 - 自动触发修复

## 问题描述

从首页输入内容并跳转到编辑器后，AI 没有自动开始思考和生成内容。

## 问题原因

`useEffect` 调用了 `handleSend()` 函数，但是 `handleSend` 在 `useEffect` 之后才定义，导致闭包问题。

## 解决方案

### 1. 移除错误位置的 useEffect

原来的 `useEffect` 在状态定义之后、`handleSend` 定义之前：

```typescript
// ❌ 错误：handleSend 还未定义
useEffect(() => {
  if (initialPrompt && editor && messages.length === 0 && !hasTriggeredInitialPrompt.current) {
    hasTriggeredInitialPrompt.current = true
    const timer = setTimeout(() => {
      handleSend()  // 这里调用的是 undefined
    }, 500)
    return () => clearTimeout(timer)
  }
}, [initialPrompt, editor, messages.length])
```

### 2. 在正确位置添加 useEffect

将 `useEffect` 移到 `handleSend` 定义之后：

```typescript
// 发送消息
const handleSend = async () => {
  // ... 函数实现
}

// 其他函数定义...

// ✅ 正确：handleSend 已经定义
useEffect(() => {
  console.log('🔍 自动触发检查:', {
    initialPrompt: !!initialPrompt,
    editor: !!editor,
    messagesLength: messages.length,
    hasTriggered: hasTriggeredInitialPrompt.current
  })
  
  if (initialPrompt && editor && messages.length === 0 && !hasTriggeredInitialPrompt.current) {
    console.log('✅ 满足自动触发条件，准备发送消息:', initialPrompt)
    hasTriggeredInitialPrompt.current = true
    const timer = setTimeout(() => {
      console.log('🚀 执行自动发送')
      handleSend()
    }, 500)
    return () => clearTimeout(timer)
  }
}, [initialPrompt, editor, messages.length, handleSend])
```

### 3. 添加调试日志

为了方便排查问题，在关键位置添加了调试日志：

**EditorPage.tsx:**
```typescript
const state = location.state as LocationState
console.log('📍 EditorPage 接收到的路由状态:', state)
```

**TiptapEditor.tsx:**
```typescript
console.log('📄 TiptapEditor 接收到的参数:', {
  initialPrompt,
  initialGenerationMode,
  initialEnableDeepThink,
  documentId: document?.id
})
```

**AIChatPanel.tsx:**
```typescript
console.log('💬 AIChatPanel 接收到的参数:', {
  initialPrompt,
  initialGenerationMode,
  initialEnableDeepThink,
  documentId,
  isOpen,
  editor: !!editor
})
```

## 测试步骤

1. 打开首页 (`http://localhost:5173/`)
2. 输入内容，例如："写一篇关于人工智能的文章"
3. 可选：开启"分步生成"或"深度思考"
4. 点击发送按钮
5. 观察控制台日志，应该看到：
   - `📍 EditorPage 接收到的路由状态`
   - `📄 TiptapEditor 接收到的参数`
   - `💬 AIChatPanel 接收到的参数`
   - `🔍 自动触发检查`
   - `✅ 满足自动触发条件`
   - `🚀 执行自动发送`
6. AI 应该自动开始思考和生成内容

## 预期行为

- ✅ 从首页输入内容后跳转到编辑器
- ✅ AI 面板自动打开
- ✅ 输入框显示用户输入的内容
- ✅ AI 自动开始思考（如果启用深度思考）
- ✅ AI 自动生成内容到编辑器
- ✅ 浏览器前进/后退不会重复触发

## 技术要点

### useEffect 依赖项

```typescript
useEffect(() => {
  // ...
}, [initialPrompt, editor, messages.length, handleSend])
```

- `initialPrompt`: 初始提示词
- `editor`: 编辑器实例
- `messages.length`: 消息数量（确保只在没有历史消息时触发）
- `handleSend`: 发送函数（确保使用最新的函数引用）

### 防止重复触发

使用 `useRef` 标记是否已经触发过：

```typescript
const hasTriggeredInitialPrompt = useRef(false)

if (!hasTriggeredInitialPrompt.current) {
  hasTriggeredInitialPrompt.current = true
  // 执行触发逻辑
}
```

这样即使 `useEffect` 多次执行（例如浏览器前进/后退），也只会触发一次。

## 相关文件

- `client/src/components/editor/AIChatPanel.tsx` - 修复自动触发逻辑
- `client/src/pages/EditorPage.tsx` - 添加调试日志
- `client/src/components/editor/TiptapEditor.tsx` - 添加调试日志

## 后续优化

调试日志可以在测试完成后移除或改为开发环境专用：

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 自动触发检查:', ...)
}
```
