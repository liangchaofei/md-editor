# Chapter 30 拖拽手柄调试

## 问题

拖拽手柄没有显示

## 已做的修改

### 1. 修改 DragHandle.tsx

**位置计算**：
- 从 `absolute` 改为 `fixed` 定位
- 从 `left: -40px` 改为 `left: 8px`（编辑器左侧 8px）
- 使用 `editorContainer` 的 `scrollTop` 计算位置

**样式优化**：
- 增加背景色 `bg-gray-100`
- 增加阴影 `shadow-sm`
- 增加边框 `border border-gray-300`
- 增大图标 `w-5 h-5`
- 增大内边距 `p-1.5`
- 提高 z-index 到 `z-50`

### 2. 测试步骤

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **打开浏览器控制台**
   - 按 F12 打开开发者工具
   - 切换到 Console 标签

3. **测试拖拽手柄显示**
   - 在编辑器中输入一些文字
   - 鼠标移动到段落上
   - **预期**：在段落左侧 8px 处显示拖拽手柄（⋮⋮ 图标）

4. **检查元素**
   - 在控制台输入：
     ```javascript
     document.querySelector('.ProseMirror')
     ```
   - 检查是否返回编辑器元素

   - 输入：
     ```javascript
     document.querySelectorAll('p, h1, h2, h3')
     ```
   - 检查是否有块级元素

5. **调试事件**
   - 在 DragHandle.tsx 的 `handleMouseMove` 中添加 console.log
   - 查看是否触发事件

## 可能的问题

### 1. 编辑器容器定位

**问题**：编辑器容器可能没有 `position: relative`

**解决**：在 TiptapEditor.tsx 中添加：
```tsx
<div className="flex-1 overflow-auto relative">
  <EditorContent editor={editor} />
  <DragHandle editor={editor} />
</div>
```

### 2. z-index 层级

**问题**：拖拽手柄可能被其他元素遮挡

**解决**：已将 z-index 提高到 50

### 3. 事件监听

**问题**：mousemove 事件可能没有正确触发

**解决**：检查事件监听器是否正确添加

## 下一步

如果还是不显示，尝试：

1. **简化定位逻辑**
   - 使用固定位置测试
   - 确认手柄是否渲染

2. **添加调试日志**
   - 在 handleMouseMove 中添加 console.log
   - 查看事件是否触发

3. **检查 CSS**
   - 确认没有 CSS 规则隐藏了手柄
   - 检查 overflow 属性

4. **测试简单版本**
   - 创建一个始终显示的手柄
   - 确认渲染没有问题
