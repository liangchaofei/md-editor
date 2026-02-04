# 第 35 章：使用 Tiptap 官方组件优化编辑器

## 本章概述

在本章中，我们将使用 Tiptap 官方组件替换自定义实现，并修复 AI 对话框的位置问题。主要工作包括：

1. 使用 Tiptap 官方 BubbleMenu 替代自定义实现
2. 修复拖拽手柄的显示问题
3. 优化 AICommandDialog 的位置计算
4. 添加点击外部关闭功能

## 1. 使用官方 BubbleMenu

### 1.1 问题分析

之前我们自定义了 BubbleMenu 组件，需要手动处理位置计算、显示隐藏等逻辑，代码复杂且容易出错。

### 1.2 解决方案

Tiptap v3 提供了官方的 BubbleMenu 组件，从 `@tiptap/react/menus` 导入：

```typescript
// client/src/components/editor/TiptapEditor.tsx
import { BubbleMenu } from '@tiptap/react/menus'

// 使用官方 BubbleMenu
<BubbleMenu
  editor={editor}
  tippyOptions={{
    duration: 100,
    placement: 'top',
  }}
  shouldShow={({ editor, state }) => {
    // 如果对话框打开，不显示菜单
    if (isAICommandDialogOpen) return false
    
    // 检查是否有文本选中
    const { from, to } = state.selection
    return from !== to
  }}
>
  <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-xl py-1 min-w-[120px]">
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openAICommand('rewrite')
      }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer w-full"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      改写
    </button>
  </div>
</BubbleMenu>
```

### 1.3 优势

- **更少的代码**：从 90 行减少到内联使用
- **更好的维护性**：由 Tiptap 团队维护
- **更好的性能**：使用 Floating UI 优化定位
- **更多功能**：支持更多配置选项
- **自动处理边界**：自动调整位置避免溢出

## 2. 修复拖拽手柄

### 2.1 问题

使用 Tiptap 官方 `@tiptap/extension-drag-handle` 扩展时，遇到两个问题：
1. `document.createElement is not a function` 错误
2. 手柄图标不显示

### 2.2 修复 createElement 错误

```typescript
// client/src/components/editor/TiptapEditor.tsx
DragHandle.configure({
  render: () => {
    const div = window.document.createElement('div')  // ✅ 使用 window.document
    div.className = 'drag-handle'
    div.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="8" cy="3" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="8" cy="13" r="1.5" />
      </svg>
    `
    return div
  },
})
```

### 2.3 优化 CSS 样式

```css
/* client/src/styles/index.css */
.drag-handle {
  position: absolute;
  left: -2rem;
  top: 0.25rem;
  opacity: 0;
  transition: all 0.2s ease;
  cursor: grab;
  padding: 0.375rem;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
}

.drag-handle:hover {
  opacity: 1 !important;
  background-color: #f3f4f6;
  border-color: #d1d5db;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.15);
}

.drag-handle:active {
  cursor: grabbing;
  background-color: #e5e7eb;
  transform: scale(0.95);
}

/* 悬停时显示 */
.ProseMirror > *:hover > .drag-handle {
  opacity: 0.6;
}

.ProseMirror > * > .drag-handle:hover {
  opacity: 1;
}

/* 确保块级元素有相对定位 */
.ProseMirror > * {
  position: relative;
}
```

## 3. 修复 AICommandDialog 位置

### 3.1 问题分析

AICommandDialog 的位置计算没有考虑视口边界，导致：
1. 对话框可能被左侧菜单遮挡
2. 对话框可能超出视口右边界
3. 快捷菜单位置不对齐

### 3.2 添加边界检查

```typescript
// client/src/components/editor/AICommandDialog.tsx
useEffect(() => {
  if (isOpen && editor) {
    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    
    // 计算选中文本的中心位置（水平）
    const centerX = (start.left + end.left) / 2
    
    // 对话框宽度
    const dialogWidth = generatedContent || isThinking || isGenerating ? 672 : 600
    const halfWidth = dialogWidth / 2
    
    // 确保对话框不超出视口左边界
    let left = centerX
    if (left - halfWidth < 20) {
      left = halfWidth + 20
    }
    
    // 确保对话框不超出视口右边界
    const viewportWidth = window.innerWidth
    if (left + halfWidth > viewportWidth - 20) {
      left = viewportWidth - halfWidth - 20
    }
    
    // 始终显示在选中文本下方
    const top = end.bottom + 10
    
    setPosition({ top, left })
  }
}, [isOpen, editor, generatedContent, isThinking, isGenerating])
```

### 3.3 快捷菜单左对齐

```typescript
// 计算快捷菜单的左边距，使其与输入框左对齐
// 输入框宽度 600px，居中后左边距为 position.left - 300
const menuLeft = position.left - 300

return (
  <div 
    className="ai-command-dialog fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2"
    style={{
      top: `${position.top + 60}px`,
      left: `${menuLeft}px`,
      width: '200px',
    }}
  >
    {/* 菜单项 */}
  </div>
)
```

## 4. 点击外部关闭功能

### 4.1 实现逻辑

```typescript
// client/src/components/editor/AICommandDialog.tsx
useEffect(() => {
  if (!isOpen || generatedContent || isThinking || isGenerating) return

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    // 检查点击是否在对话框内部（包括输入框和快捷菜单）
    const isInsideDialog = target.closest('.ai-command-dialog')
    
    if (!isInsideDialog) {
      handleCancel()
    }
  }

  // 延迟添加监听器，避免立即触发
  const timer = setTimeout(() => {
    document.addEventListener('mousedown', handleClickOutside)
  }, 100)

  return () => {
    clearTimeout(timer)
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [isOpen, generatedContent, isThinking, isGenerating])
```

### 4.2 关键点

1. **仅在初始状态生效**：生成内容时不会被点击外部关闭
2. **准确判断区域**：使用 `closest('.ai-command-dialog')` 判断
3. **延迟添加监听**：避免立即触发关闭
4. **保留 Esc 键**：按 Esc 键仍然可以关闭

## 5. 位置计算原理

### 5.1 坐标系统

Tiptap 的 `editor.view.coordsAtPos()` 返回的是相对于视口的绝对坐标：

```typescript
const start = editor.view.coordsAtPos(from)
// start = { top: 100, bottom: 120, left: 200, right: 300 }
```

这些坐标已经考虑了：
- 页面滚动位置
- 左侧菜单栏
- 编辑器容器位置

### 5.2 居中对齐

使用 CSS `transform: translateX(-50%)` 实现水平居中：

```typescript
style={{
  left: `${centerX}px`,        // 中心点位置
  transform: 'translateX(-50%)', // 向左偏移自身宽度的 50%
}}
```

### 5.3 边界检查

```typescript
// 左边界检查
if (left - halfWidth < 20) {
  left = halfWidth + 20  // 确保左侧至少有 20px 边距
}

// 右边界检查
if (left + halfWidth > viewportWidth - 20) {
  left = viewportWidth - halfWidth - 20  // 确保右侧至少有 20px 边距
}
```

## 6. 测试要点

### 6.1 BubbleMenu 测试

1. 选中文字，检查是否显示"改写"按钮
2. 点击"改写"，检查 BubbleMenu 是否消失
3. 取消选择，检查 BubbleMenu 是否消失

### 6.2 拖拽功能测试

1. 点击"拖拽"按钮开启功能
2. 悬停在段落左侧，检查是否显示六点图标
3. 拖拽段落到新位置，检查是否正常工作

### 6.3 对话框位置测试

1. 在编辑器左侧选中文字，检查对话框是否完整显示
2. 在编辑器右侧选中文字，检查对话框是否完整显示
3. 在编辑器中间选中文字，检查对话框是否居中
4. 检查快捷菜单是否与输入框左对齐

### 6.4 点击外部关闭测试

1. 打开对话框，点击外部区域，检查是否关闭
2. 点击输入框，检查是否不关闭
3. 点击快捷菜单，检查是否不关闭
4. 开始生成内容后，点击外部，检查是否不关闭

## 7. 性能优化

### 7.1 位置计算优化

位置计算依赖于多个状态，使用 `useEffect` 的依赖数组控制更新时机：

```typescript
useEffect(() => {
  // 位置计算逻辑
}, [isOpen, editor, generatedContent, isThinking, isGenerating])
```

### 7.2 事件监听优化

使用延迟添加和及时清理避免内存泄漏：

```typescript
const timer = setTimeout(() => {
  document.addEventListener('mousedown', handleClickOutside)
}, 100)

return () => {
  clearTimeout(timer)
  document.removeEventListener('mousedown', handleClickOutside)
}
```

## 8. 总结

本章我们完成了以下优化：

1. ✅ 使用 Tiptap 官方 BubbleMenu，代码更简洁
2. ✅ 修复拖拽手柄显示问题
3. ✅ 优化 AICommandDialog 位置计算，支持边界检查
4. ✅ 添加点击外部关闭功能
5. ✅ 快捷菜单左对齐到输入框

这些优化让编辑器的交互体验更加流畅，UI 组件的位置更加准确，用户体验得到了显著提升。

## 相关文件

- `client/src/components/editor/TiptapEditor.tsx` - 编辑器主组件
- `client/src/components/editor/AICommandDialog.tsx` - AI 对话框
- `client/src/styles/index.css` - 样式文件
- `CHAPTER_36_BUBBLE_MENU_DIALOG_FIX.md` - 详细修复记录
