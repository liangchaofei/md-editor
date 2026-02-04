# Chapter 36: 拖拽手柄和 BubbleMenu 修复

## 问题

1. **拖拽手柄图标不显示**
   - 使用 Tiptap 官方 `@tiptap/extension-drag-handle` 扩展
   - 拖拽功能正常（鼠标变成小手），但手柄图标不显示
   - 错误：`document.createElement is not a function`

2. **BubbleMenu 导入错误**
   - 用户要求使用 Tiptap 官方 BubbleMenu 替代自定义实现
   - 错误：`@tiptap/react` 不提供 `BubbleMenu` 导出

## 解决方案

### 1. 修复拖拽手柄

**问题原因：** 在 `render` 函数中使用了 `document.createElement` 而不是 `window.document.createElement`

**修复：**
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
    console.log('🎯 创建拖拽手柄:', div)
    return div
  },
})
```

**CSS 样式优化：**
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

.drag-handle svg {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  flex-shrink: 0;
}

/* 悬停时显示 - 更明显 */
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

### 2. 使用官方 BubbleMenu

**正确的导入方式：**
```typescript
// client/src/components/editor/TiptapEditor.tsx
import { BubbleMenu } from '@tiptap/react/menus'  // ✅ 从 /menus 导入
```

**使用方式：**
```typescript
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

**删除的文件：**
- `client/src/components/editor/BubbleMenu.tsx` - 不再需要自定义组件

## 优势

### 使用官方 BubbleMenu 的好处：

1. **更少的代码** - 从 90 行减少到内联使用
2. **更好的维护性** - 由 Tiptap 团队维护
3. **更好的性能** - 使用 Floating UI 优化定位
4. **更多功能** - 支持更多配置选项（offset, flip, shift, arrow 等）
5. **自动处理边界** - 自动调整位置避免溢出屏幕

### 拖拽功能特点：

1. **开关控制** - 通过顶部"拖拽"按钮开启/关闭
2. **块级拖拽** - 拖拽整个块（段落、列表、标题等）
3. **视觉反馈** - 悬停时显示手柄，拖拽时显示光标
4. **六点图标** - 清晰的拖拽指示器

## 测试步骤

1. **测试拖拽功能：**
   - 刷新浏览器
   - 点击顶部"拖拽"按钮开启拖拽
   - 在编辑器中输入多个段落或列表
   - 将鼠标悬停在段落左侧，应该看到六点图标
   - 拖拽段落到新位置

2. **测试 BubbleMenu：**
   - 在编辑器中选中一段文字
   - 应该看到"改写"按钮出现在选区上方
   - 点击"改写"按钮，应该打开 AI 对话框
   - 对话框打开时，BubbleMenu 应该自动隐藏

## 技术细节

### Tiptap v3 的变化

在 Tiptap v3 中，BubbleMenu 和 FloatingMenu 从核心包移到了单独的导出路径：

```typescript
// ❌ 错误 - Tiptap v2 的方式
import { BubbleMenu } from '@tiptap/react'

// ✅ 正确 - Tiptap v3 的方式
import { BubbleMenu } from '@tiptap/react/menus'
```

### DragHandle 配置

DragHandle 扩展需要：
1. 条件性加载（通过 `isDragEnabled` 状态控制）
2. 自定义 `render` 函数返回 DOM 元素
3. CSS 样式定义手柄的外观和行为
4. 父元素需要 `position: relative`

## 相关文档

- [Tiptap BubbleMenu 文档](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)
- [Tiptap DragHandle 文档](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle)
- [Floating UI 文档](https://floating-ui.com/)

## 总结

成功修复了拖拽手柄和 BubbleMenu 的问题，现在编辑器使用 Tiptap 官方组件，代码更简洁，功能更强大。
