# 浏览器前进/后退按钮重复触发问题修复

## 问题描述

当用户使用浏览器的前进/后退按钮时，会出现重复触发 AI 对话的问题：

```
用户操作流程：
1. 首页输入 "写一个标书" → 跳转编辑器 → AI 开始生成 ✓
2. 点击浏览器后退按钮 → 返回首页
3. 点击浏览器前进按钮 → 返回编辑器
4. 问题：AI 又开始生成一次！❌
```

## 根本原因

React Router 的 `location.state` 在浏览器历史记录中会被保留。当用户使用前进/后退按钮时：
- `initialPrompt` 参数仍然存在
- `useEffect` 再次触发
- 导致重复调用 `handleSend()`

## 解决方案

使用 **useRef + 消息历史检查** 的组合方案：

### 1. 使用 useRef 标记
```typescript
// 使用 ref 标记是否已经触发过初始提示词
const hasTriggeredInitialPrompt = useRef(false)
```

**为什么用 ref 而不是 state？**
- `useRef` 的值在组件重新渲染时保持不变
- 即使组件卸载后重新挂载，ref 也会保持
- 不会触发重新渲染

### 2. 检查多个条件
```typescript
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
    const timer = setTimeout(() => {
      handleSend()
    }, 500)
    return () => clearTimeout(timer)
  }
}, [initialPrompt, editor, messages.length])
```

### 3. 关键检查点

| 检查项 | 作用 | 防止的问题 |
|--------|------|-----------|
| `initialPrompt` | 确保有初始提示词 | 避免空提示词触发 |
| `editor` | 确保编辑器已初始化 | 避免编辑器未就绪 |
| `messages.length === 0` | 确保是新文档 | 避免已有对话的文档重复触发 |
| `!hasTriggeredInitialPrompt.current` | 确保只触发一次 | 避免浏览器前进/后退重复触发 |

## 测试场景

### 场景 1：正常流程 ✅
```
首页输入 → 跳转编辑器 → 触发一次 AI 生成
```
**结果**：正常工作

### 场景 2：浏览器后退/前进 ✅
```
首页 → 编辑器（生成） → 后退 → 前进 → 不再生成
```
**结果**：不会重复触发（因为 `hasTriggeredInitialPrompt.current = true`）

### 场景 3：已有对话的文档 ✅
```
打开已有对话的文档 → 不触发生成
```
**结果**：不会触发（因为 `messages.length > 0`）

### 场景 4：刷新页面 ✅
```
编辑器页面刷新 → 不触发生成
```
**结果**：不会触发（因为刷新后 `initialPrompt` 为 undefined）

### 场景 5：直接访问编辑器 ✅
```
直接访问 /editor/123 → 不触发生成
```
**结果**：不会触发（因为没有 `initialPrompt`）

## 代码变更

### 修改文件
- `client/src/components/editor/AIChatPanel.tsx`

### 变更内容
```typescript
// 添加 ref 标记
const hasTriggeredInitialPrompt = useRef(false)

// 修改 useEffect 条件
useEffect(() => {
  if (
    initialPrompt && 
    editor && 
    messages.length === 0 && 
    !hasTriggeredInitialPrompt.current
  ) {
    hasTriggeredInitialPrompt.current = true
    const timer = setTimeout(() => {
      handleSend()
    }, 500)
    return () => clearTimeout(timer)
  }
}, [initialPrompt, editor, messages.length])
```

## 其他考虑的方案

### 方案 A：清除 state（不推荐）
```typescript
// 在 EditorPage 中
useEffect(() => {
  if (state?.initialPrompt) {
    // 清除 state
    navigate(location.pathname, { replace: true, state: {} })
  }
}, [state])
```
**缺点**：
- 会影响浏览器历史记录
- 用户后退时可能丢失状态
- 不够优雅

### 方案 B：只检查消息历史（不够安全）
```typescript
if (initialPrompt && editor && messages.length === 0) {
  handleSend()
}
```
**缺点**：
- 如果用户清空了消息历史，可能会重复触发
- 没有明确的"已触发"标记

### 方案 C：使用 sessionStorage（过度设计）
```typescript
const key = `triggered_${documentId}`
if (!sessionStorage.getItem(key)) {
  sessionStorage.setItem(key, 'true')
  handleSend()
}
```
**缺点**：
- 需要管理 sessionStorage
- 需要清理逻辑
- 过于复杂

## 最终方案的优势

✅ **简单**：只需要一个 ref 和几个条件检查  
✅ **可靠**：多重检查确保不会误触发  
✅ **高效**：不需要额外的存储或网络请求  
✅ **优雅**：代码清晰易懂  
✅ **安全**：覆盖所有边界情况  

## 总结

通过使用 `useRef` 标记和多重条件检查，成功解决了浏览器前进/后退按钮导致的重复触发问题。这个方案：
- 确保初始提示词只触发一次
- 不影响正常的用户操作
- 不会误触发已有对话的文档
- 代码简洁易维护

用户现在可以自由使用浏览器的前进/后退按钮，不会出现重复生成的问题。
