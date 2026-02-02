# Chapter 29: 右键菜单和快捷操作

## 本章目标

实现编辑器的右键菜单（Context Menu），提供快捷操作入口，大幅提升操作效率。

**核心功能**：
- 右键菜单基础框架
- AI 快捷操作（改写、翻译、总结、扩写、缩写）
- 格式化操作（加粗、斜体、下划线、删除线、高亮）
- 插入操作（表格、图片、链接、代码块）
- 编辑操作（复制、粘贴、删除、全选）
- 智能菜单（根据上下文显示不同选项）

**技术亮点**：
- 自定义右键菜单组件
- 菜单项配置系统
- 位置计算和边界检测
- 与现有功能集成

---

## 功能演示

### 使用场景 1：选中文字右键

**操作**：
1. 选中一段文字
2. 右键点击
3. 显示菜单：
   - AI 操作（改写、翻译、总结、扩写、缩写）
   - 格式化（加粗、斜体、高亮等）
   - 编辑（复制、剪切、删除）

### 使用场景 2：空白处右键

**操作**：
1. 在空白处右键
2. 显示菜单：
   - 插入（表格、图片、链接、代码块）
   - 粘贴
   - 全选

### 使用场景 3：图片上右键

**操作**：
1. 在图片上右键
2. 显示菜单：
   - 复制图片
   - 删除图片
   - 下载图片

---

## 架构设计

### 整体流程

```
用户右键点击
    ↓
阻止默认菜单
    ↓
获取点击位置和上下文
    ↓
计算菜单位置
    ↓
显示自定义菜单
    ↓
用户选择操作
    ↓
执行对应命令
```

### 核心模块

1. **ContextMenu 组件**（`client/src/components/editor/ContextMenu.tsx`）
   - 菜单容器
   - 位置计算
   - 显示/隐藏逻辑

2. **菜单项配置**（`client/src/utils/contextMenuItems.ts`）
   - 菜单项定义
   - 条件显示逻辑
   - 图标和快捷键

3. **集成到编辑器**（`client/src/components/editor/TiptapEditor.tsx`）
   - 监听右键事件
   - 传递编辑器实例
   - 处理菜单操作

---

## 详细实现

本章将分步实现右键菜单功能。


## 实现步骤

### 步骤 1：创建 ContextMenu 组件

创建 `client/src/components/editor/ContextMenu.tsx`：

**核心功能**：
1. **位置计算**：自动调整菜单位置，避免超出屏幕
2. **智能菜单**：根据上下文显示不同选项
3. **分组显示**：AI 操作、格式化、编辑、插入等分组
4. **快捷键提示**：显示对应的快捷键

**关键代码**：

```typescript
// 位置计算，避免超出屏幕
useEffect(() => {
  if (!isOpen || !menuRef.current) return

  const menu = menuRef.current
  const menuRect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = position.x
  let y = position.y

  // 右边界检测
  if (x + menuRect.width > viewportWidth) {
    x = viewportWidth - menuRect.width - 10
  }

  // 下边界检测
  if (y + menuRect.height > viewportHeight) {
    y = viewportHeight - menuRect.height - 10
  }

  setAdjustedPosition({ x, y })
}, [isOpen, position])
```

**菜单项配置**：

```typescript
// 根据是否有选中文本显示不同菜单
const hasSelection = selectedText.length > 0

// AI 操作组（仅在有选中文本时显示）
if (hasSelection && onAICommand) {
  menuGroups.push({
    id: 'ai',
    label: 'AI 操作',
    items: [
      { id: 'ai-rewrite', label: '改写', action: () => onAICommand('rewrite') },
      { id: 'ai-translate', label: '翻译', action: () => onAICommand('translate') },
      { id: 'ai-summarize', label: '总结', action: () => onAICommand('summarize') },
      { id: 'ai-expand', label: '扩写', action: () => onAICommand('expand') },
    ],
  })
}
```

---

### 步骤 2：集成到 TiptapEditor

在 `client/src/components/editor/TiptapEditor.tsx` 中：

**1. 添加状态**：

```typescript
// 右键菜单状态
const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
```

**2. 监听右键事件**：

```typescript
useEffect(() => {
  if (!editor) return

  const handleContextMenu = (e: MouseEvent) => {
    // 检查是否在编辑器内
    const editorElement = window.document.querySelector('.ProseMirror')
    if (!editorElement || !editorElement.contains(e.target as Node)) {
      return
    }

    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setIsContextMenuOpen(true)
  }

  window.document.addEventListener('contextmenu', handleContextMenu)
  return () => window.document.removeEventListener('contextmenu', handleContextMenu)
}, [editor])
```

**3. 渲染菜单**：

```typescript
<ContextMenu
  editor={editor}
  isOpen={isContextMenuOpen}
  position={contextMenuPosition}
  onClose={() => setIsContextMenuOpen(false)}
  onAICommand={openAICommand}
/>
```

---

## 验证功能

### 测试步骤

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **测试选中文字右键**
   - 在编辑器中输入一些文字
   - 选中一段文字
   - 右键点击
   - **预期结果**：
     - 显示右键菜单
     - 包含 AI 操作（改写、翻译、总结、扩写）
     - 包含格式化操作（加粗、斜体、高亮等）
     - 包含编辑操作（复制、剪切、删除）

3. **测试 AI 操作**
   - 选中文字
   - 右键 → AI 操作 → 改写
   - **预期结果**：
     - 打开 AI 改写对话框
     - 可以输入自定义需求
     - 点击发送后 AI 生成改写内容

4. **测试格式化操作**
   - 选中文字
   - 右键 → 格式化 → 加粗
   - **预期结果**：
     - 文字变为加粗
     - 菜单自动关闭

5. **测试空白处右键**
   - 在空白处右键
   - **预期结果**：
     - 显示插入操作（表格、图片、链接、代码块）
     - 显示粘贴和全选

6. **测试菜单位置**
   - 在编辑器右下角右键
   - **预期结果**：
     - 菜单自动调整位置
     - 不会超出屏幕边界

7. **测试关闭菜单**
   - 打开菜单后点击外部
   - **预期结果**：菜单关闭
   - 打开菜单后按 ESC
   - **预期结果**：菜单关闭

---

## 核心技术点

### 1. 右键菜单定位

**挑战**：
- 菜单可能超出屏幕边界
- 需要动态调整位置

**解决方案**：
```typescript
// 获取菜单尺寸和视口尺寸
const menuRect = menu.getBoundingClientRect()
const viewportWidth = window.innerWidth
const viewportHeight = window.innerHeight

// 边界检测和调整
if (x + menuRect.width > viewportWidth) {
  x = viewportWidth - menuRect.width - 10
}
if (y + menuRect.height > viewportHeight) {
  y = viewportHeight - menuRect.height - 10
}
```

### 2. 智能菜单项

**根据上下文显示不同选项**：

```typescript
// 有选中文本：显示 AI 操作和格式化
if (hasSelection) {
  // AI 操作
  // 格式化操作
  // 编辑操作（复制、剪切、删除）
}

// 无选中文本：显示插入操作
if (!hasSelection) {
  // 插入操作（表格、图片、链接）
}

// 始终显示
// 粘贴、全选
```

### 3. 事件处理

**阻止默认右键菜单**：
```typescript
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()  // 阻止浏览器默认菜单
  // 显示自定义菜单
}
```

**点击外部关闭**：
```typescript
const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
    onClose()
  }
}

// 延迟添加监听器，避免立即触发
setTimeout(() => {
  document.addEventListener('mousedown', handleClickOutside)
}, 0)
```

### 4. 与现有功能集成

**与 AI 功能集成**：
```typescript
// 右键菜单触发 AI 操作
onAICommand('rewrite')

// 打开 AI 对话框
openAICommand('rewrite')
```

**与编辑器命令集成**：
```typescript
// 格式化
editor.chain().focus().toggleBold().run()

// 插入
editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
```

---

## 用户体验优化

### 1. 视觉反馈

- **Hover 效果**：鼠标悬停时高亮
- **图标**：每个操作都有对应图标
- **快捷键提示**：显示对应的快捷键
- **分组**：相关操作分组显示

### 2. 交互优化

- **快速关闭**：点击外部或按 ESC 关闭
- **自动关闭**：执行操作后自动关闭
- **位置智能**：自动避免超出屏幕

### 3. 性能优化

- **延迟监听**：避免立即触发点击外部事件
- **条件渲染**：只在需要时渲染菜单项
- **事件清理**：组件卸载时清理事件监听器

---

## 常见问题 FAQ

### Q1: 右键菜单位置不对？

**A**: 检查以下几点：
1. 是否正确获取了点击位置（`e.clientX`, `e.clientY`）
2. 是否考虑了滚动位置
3. 是否进行了边界检测

### Q2: 菜单无法关闭？

**A**: 检查：
1. 是否添加了点击外部监听器
2. 是否添加了 ESC 键监听器
3. 是否在操作后调用了 `onClose()`

### Q3: 菜单项不显示？

**A**: 检查：
1. 是否正确判断了上下文（有无选中文本）
2. 是否设置了 `hidden` 属性
3. 是否正确传递了 `editor` 实例

### Q4: AI 操作无法触发？

**A**: 检查：
1. 是否传递了 `onAICommand` 回调
2. 是否正确调用了 `openAICommand`
3. 是否有选中文本（AI 操作需要选中文本）

---

## 后续优化方向

### 短期

1. **子菜单**
   - 格式化子菜单（字体、颜色、对齐）
   - 插入子菜单（更多插入选项）

2. **自定义菜单项**
   - 用户自定义菜单项
   - 插件系统支持

3. **快捷键冲突检测**
   - 检测快捷键冲突
   - 提供自定义快捷键

### 中期

1. **菜单主题**
   - 深色模式
   - 自定义颜色

2. **菜单动画**
   - 淡入淡出动画
   - 滑动动画

3. **更多操作**
   - 块级操作（移动、复制、删除块）
   - 批量操作

---

## 总结

本章实现了编辑器的右键菜单功能：

### 核心成果

1. **右键菜单组件**：
   - ✅ 自定义菜单组件
   - ✅ 智能位置计算
   - ✅ 边界检测

2. **智能菜单项**：
   - ✅ 根据上下文显示
   - ✅ AI 操作集成
   - ✅ 格式化操作
   - ✅ 插入操作

3. **用户体验**：
   - ✅ 快速操作
   - ✅ 视觉反馈
   - ✅ 快捷键提示

### 技术亮点

1. **位置计算**：自动调整避免超出屏幕
2. **智能显示**：根据上下文显示不同选项
3. **事件处理**：点击外部关闭、ESC 关闭
4. **功能集成**：与 AI 和编辑器命令无缝集成

### 与其他章节的关系

- **Chapter 23**：AI 改写快捷指令（基础）
- **Chapter 27**：AI 对话式文档编辑（基础）
- **Chapter 29**：右键菜单（本章）
- **Chapter 30**：块级编辑和拖拽（下一章）

### 学到的知识

1. **右键菜单实现**：阻止默认、自定义菜单
2. **位置计算**：边界检测、自动调整
3. **事件处理**：点击外部、键盘事件
4. **智能 UI**：根据上下文显示

---

**提交代码**：
```bash
git add .
git commit -m "feat: 实现右键菜单和快捷操作（Chapter 29）

- 创建 ContextMenu 组件
- 实现智能菜单项（根据上下文显示）
- 集成 AI 快捷操作（改写、翻译、总结、扩写）
- 集成格式化操作（加粗、斜体、高亮等）
- 集成插入操作（表格、图片、链接、代码块）
- 实现位置计算和边界检测
- 实现点击外部关闭和 ESC 关闭
- 编写 Chapter 29 完整教程文档

新建文件：
- client/src/components/editor/ContextMenu.tsx
- docs/chapter-29.md

修改文件：
- client/src/components/editor/TiptapEditor.tsx"
```
