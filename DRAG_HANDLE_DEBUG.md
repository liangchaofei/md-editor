# 拖拽手柄调试指南

## 问题：手柄图标不显示

### 检查步骤

#### 1. 检查元素是否被创建
打开浏览器开发者工具（F12），在 Elements 标签页中查找：
```html
<div class="drag-handle">
  <svg viewBox="0 0 16 16" fill="currentColor">
    <circle cx="3" cy="3" r="1.5"></circle>
    ...
  </svg>
</div>
```

**如果找不到这个元素：**
- 确认拖拽功能已开启（点击顶部"拖拽"按钮）
- 刷新页面重试

#### 2. 检查样式是否生效
在开发者工具中选中 `.drag-handle` 元素，查看 Computed 样式：
- `opacity` 应该在悬停时变为 `1`
- `position` 应该是 `absolute`
- `left` 应该是 `-2rem`

**如果样式不对：**
- 检查 CSS 是否被其他样式覆盖
- 查看 Specificity（优先级）

#### 3. 检查 z-index
确保手柄在最上层：
```css
.drag-handle {
  z-index: 50;
}
```

#### 4. 检查父元素定位
确保父元素有相对定位：
```css
.ProseMirror > * {
  position: relative;
}
```

---

## 解决方案

### 方案 1：增加手柄可见性（推荐）

如果手柄太难看到，可以让它始终显示：

```css
/* 始终显示手柄（调试用） */
.drag-handle {
  opacity: 1 !important;
  background-color: #3b82f6 !important;
}

.drag-handle svg {
  color: white !important;
}
```

### 方案 2：调整手柄位置

如果手柄位置不对：

```css
.drag-handle {
  left: -2.5rem; /* 调整左侧距离 */
  top: 0.25rem;  /* 调整顶部距离 */
}
```

### 方案 3：增大手柄尺寸

如果手柄太小：

```css
.drag-handle {
  width: 2rem;
  height: 2rem;
  padding: 0.5rem;
}

.drag-handle svg {
  width: 1.25rem;
  height: 1.25rem;
}
```

### 方案 4：添加背景色（更明显）

```css
.drag-handle {
  background-color: #f3f4f6;
  border: 2px solid #d1d5db;
}

.drag-handle:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}
```

---

## 测试代码

在浏览器控制台运行以下代码，检查手柄是否存在：

```javascript
// 查找所有拖拽手柄
const handles = document.querySelectorAll('.drag-handle')
console.log('找到', handles.length, '个拖拽手柄')

// 查看第一个手柄的样式
if (handles.length > 0) {
  const handle = handles[0]
  const styles = window.getComputedStyle(handle)
  console.log('opacity:', styles.opacity)
  console.log('position:', styles.position)
  console.log('left:', styles.left)
  console.log('display:', styles.display)
}

// 强制显示所有手柄（调试用）
handles.forEach(handle => {
  handle.style.opacity = '1'
  handle.style.backgroundColor = '#3b82f6'
})
```

---

## 常见问题

### Q1: 手柄完全看不到
**原因：** 可能是 `opacity: 0` 且没有触发悬停

**解决：**
```css
.drag-handle {
  opacity: 0.3; /* 改为半透明，更容易发现 */
}

.drag-handle:hover {
  opacity: 1;
}
```

### Q2: 手柄位置不对
**原因：** 父元素没有相对定位

**解决：**
```css
.ProseMirror > * {
  position: relative !important;
}
```

### Q3: 手柄被其他元素遮挡
**原因：** z-index 太低

**解决：**
```css
.drag-handle {
  z-index: 9999 !important;
}
```

### Q4: SVG 图标不显示
**原因：** SVG 代码有问题或样式不对

**解决：**
检查 SVG 是否正确渲染：
```javascript
const handle = document.querySelector('.drag-handle')
console.log(handle.innerHTML)
```

---

## 推荐的最终样式

```css
/* 拖拽手柄 - 更明显的版本 */
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

/* 悬停时显示 */
.ProseMirror > *:hover > .drag-handle {
  opacity: 0.6;
}

.ProseMirror > * > .drag-handle:hover {
  opacity: 1;
}

/* 确保父元素有相对定位 */
.ProseMirror > * {
  position: relative;
}
```

---

## 如果还是不行

### 最后的调试方法

1. **临时移除 opacity**
   ```css
   .drag-handle {
     opacity: 1 !important;
     background-color: red !important;
   }
   ```

2. **检查 render 函数**
   在 TiptapEditor.tsx 中添加 console.log：
   ```typescript
   render: () => {
     const div = window.document.createElement('div')
     div.classList.add('drag-handle')
     div.innerHTML = `...`
     console.log('创建拖拽手柄:', div)
     return div
   }
   ```

3. **检查扩展是否加载**
   ```javascript
   // 在浏览器控制台
   console.log(editor.extensionManager.extensions)
   ```

---

## 总结

如果手柄不显示，最可能的原因是：
1. ❌ `opacity: 0` 且没有触发悬停
2. ❌ 位置不对（在屏幕外）
3. ❌ z-index 太低被遮挡
4. ❌ 父元素没有相对定位

**快速修复：**
```css
.drag-handle {
  opacity: 1 !important;
  background-color: #3b82f6 !important;
  left: -2rem !important;
  z-index: 9999 !important;
}
```

这样手柄一定能看到，然后再慢慢调整样式。
