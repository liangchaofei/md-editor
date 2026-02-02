# Chapter 30: 块级编辑和拖拽排序

## 本章目标

实现 Notion 风格的块级编辑体验，每个段落都是独立的块，可以拖拽排序、复制、删除。

**核心功能**：
- 拖拽手柄显示（6个点的图标）
- 拖拽排序段落、图片、表格等
- 块级操作菜单（点击手柄显示）
- 块级选择（点击手柄选中整个块）
- 与右键菜单集成
- 拖拽指示器（显示放置位置）

**技术亮点**：
- 自定义拖拽手柄组件
- 使用 HTML5 Drag and Drop API
- Tiptap 节点操作
- 块级选择逻辑
- 拖拽状态管理

---

## 功能演示

### 使用场景 1：拖拽排序

**操作**：
1. Hover 到段落左侧
2. 显示拖拽手柄（⋮⋮）
3. 拖动手柄
4. 显示蓝色指示线
5. 释放鼠标
6. 段落移动到新位置

### 使用场景 2：块级操作菜单

**操作**：
1. 点击拖拽手柄
2. 显示操作菜单：
   - 删除块
   - 复制块
   - 转换为...（标题、列表等）
   - 移动到...

### 使用场景 3：块级选择

**操作**：
1. 点击拖拽手柄
2. 整个块被选中（蓝色背景）
3. 可以复制、删除、拖拽

---

## 架构设计

### 整体流程

```
Hover 到段落
    ↓
显示拖拽手柄
    ↓
用户拖动手柄
    ↓
显示拖拽指示器
    ↓
释放鼠标
    ↓
移动节点到新位置
```

### 核心模块

1. **DragHandle 组件**（`client/src/components/editor/DragHandle.tsx`）
   - 拖拽手柄显示
   - 位置计算
   - 拖拽事件处理

2. **块级操作菜单**（`client/src/components/editor/BlockMenu.tsx`）
   - 操作菜单显示
   - 块级操作命令

3. **拖拽扩展**（`client/src/extensions/DragAndDrop.ts`）
   - 拖拽逻辑
   - 节点移动
   - 拖拽指示器

---

## 详细实现

本章将分步实现块级编辑功能。


## 实现步骤

### 步骤 1：安装依赖

```bash
cd client
pnpm add @tiptap/extension-dropcursor
```

**Dropcursor 扩展**：显示拖拽时的放置位置指示器（蓝色线条）

---

### 步骤 2：创建 DragHandle 组件

创建 `client/src/components/editor/DragHandle.tsx`：

**核心功能**：
1. **自动显示**：Hover 到段落时显示手柄
2. **拖拽排序**：拖动手柄移动块
3. **块级选择**：点击手柄选中整个块
4. **操作菜单**：点击显示删除、复制等操作

**关键代码**：

```typescript
// 监听鼠标移动，显示手柄
const handleMouseMove = (e: Event) => {
  const mouseEvent = e as unknown as MouseEvent
  const target = mouseEvent.target as HTMLElement
  
  // 查找最近的块级元素
  let blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote')
  
  if (!blockElement) {
    setIsVisible(false)
    return
  }
  
  // 计算手柄位置
  const rect = blockElement.getBoundingClientRect()
  setPosition({
    top: rect.top - editorRect.top,
    left: -40, // 编辑器左侧 40px
  })
  
  setIsVisible(true)
}
```

**拖拽开始**：

```typescript
const handleDragStart = (e: React.DragEvent) => {
  // 设置拖拽数据（节点位置）
  e.dataTransfer.setData('text/plain', currentNode.pos.toString())
  
  // 选中当前块
  editor.commands.setTextSelection({ 
    from: pos, 
    to: pos + node.nodeSize 
  })
}
```

**块级操作**：

```typescript
// 删除块
const handleDelete = () => {
  editor.chain().focus().deleteRange({ 
    from: pos, 
    to: pos + node.nodeSize 
  }).run()
}

// 复制块
const handleDuplicate = () => {
  editor.chain().focus().insertContentAt(
    pos + node.nodeSize, 
    node.toJSON()
  ).run()
}
```

---

### 步骤 3：创建 DragAndDrop 扩展

创建 `client/src/extensions/DragAndDrop.ts`：

**核心功能**：
- 处理拖拽放置事件
- 移动节点到新位置
- 更新文档结构

**关键代码**：

```typescript
export const DragAndDrop = Extension.create({
  name: 'dragAndDrop',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragAndDrop'),
        props: {
          handleDOMEvents: {
            // 拖拽放置
            drop: (view, event) => {
              event.preventDefault()

              // 获取拖拽的节点位置
              const draggedPos = parseInt(
                event.dataTransfer?.getData('text/plain') || '', 
                10
              )
              
              // 获取放置位置
              const dropPos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })

              // 获取拖拽的节点
              const draggedNode = view.state.doc.nodeAt(draggedPos)

              // 执行移动操作
              const tr = view.state.tr
              
              // 1. 删除原位置的节点
              tr.delete(draggedPos, draggedPos + draggedNode.nodeSize)
              
              // 2. 在新位置插入节点
              tr.insert(targetPos, draggedNode)
              
              // 3. 应用事务
              view.dispatch(tr)

              return true
            },
          },
        },
      }),
    ]
  },
})
```

---

### 步骤 4：集成到 TiptapEditor

在 `client/src/components/editor/TiptapEditor.tsx` 中：

**1. 导入扩展和组件**：

```typescript
import { Dropcursor } from '@tiptap/extension-dropcursor'
import { DragAndDrop } from '../../extensions/DragAndDrop'
import DragHandle from './DragHandle'
```

**2. 添加扩展**：

```typescript
const editor = useEditor({
  extensions: [
    // ... 其他扩展
    
    // 拖拽光标
    Dropcursor.configure({
      color: '#3b82f6',
      width: 2,
    }),
    
    // 拖拽排序
    DragAndDrop,
  ],
})
```

**3. 渲染 DragHandle**：

```typescript
<div className="flex-1 overflow-auto relative">
  <EditorContent editor={editor} />
  
  {/* 拖拽手柄 */}
  <DragHandle editor={editor} />
</div>
```

---

## 验证功能

### 测试步骤

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **测试拖拽手柄显示**
   - 在编辑器中输入多个段落
   - Hover 到段落左侧
   - **预期结果**：
     - 显示拖拽手柄（⋮⋮ 图标）
     - 手柄位置在段落左侧
     - 移开鼠标后手柄消失

3. **测试拖拽排序**
   - Hover 到段落显示手柄
   - 拖动手柄
   - **预期结果**：
     - 显示蓝色拖拽指示线
     - 释放鼠标后段落移动到新位置
     - 文档结构正确更新

4. **测试块级选择**
   - 点击拖拽手柄
   - **预期结果**：
     - 整个段落被选中（蓝色背景）
     - 显示操作菜单

5. **测试删除块**
   - 点击手柄显示菜单
   - 点击"删除"
   - **预期结果**：
     - 段落被删除
     - 菜单关闭

6. **测试复制块**
   - 点击手柄显示菜单
   - 点击"复制"
   - **预期结果**：
     - 在当前块下方插入相同内容
     - 菜单关闭

7. **测试不同类型的块**
   - 测试标题、列表、代码块、表格
   - **预期结果**：
     - 所有类型的块都可以拖拽
     - 手柄位置正确

---

## 核心技术点

### 1. 块级元素检测

**查找最近的块级元素**：

```typescript
let blockElement = target.closest(
  'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, .tableWrapper'
)
```

**支持的块级元素**：
- 段落（`p`）
- 标题（`h1-h6`）
- 列表项（`li`）
- 代码块（`pre`）
- 引用（`blockquote`）
- 表格（`.tableWrapper`）

### 2. 拖拽数据传递

**使用 dataTransfer 传递节点位置**：

```typescript
// 拖拽开始：保存节点位置
e.dataTransfer.setData('text/plain', pos.toString())

// 拖拽放置：读取节点位置
const draggedPos = parseInt(
  event.dataTransfer?.getData('text/plain') || '', 
  10
)
```

### 3. 节点移动算法

**关键步骤**：

1. **获取拖拽节点**：
```typescript
const draggedNode = view.state.doc.nodeAt(draggedPos)
```

2. **计算目标位置**：
```typescript
let targetPos = dropPos.pos

// 如果放置位置在拖拽节点之后，需要调整
if (targetPos > draggedPos) {
  targetPos -= draggedNode.nodeSize
}
```

3. **执行移动**：
```typescript
const tr = view.state.tr
tr.delete(draggedPos, draggedPos + draggedNode.nodeSize)
tr.insert(targetPos, draggedNode)
view.dispatch(tr)
```

### 4. 位置计算

**手柄位置计算**：

```typescript
const rect = blockElement.getBoundingClientRect()
const editorRect = editorElement.getBoundingClientRect()

setPosition({
  top: rect.top - editorRect.top + editorElement.scrollTop,
  left: -40, // 编辑器左侧 40px
})
```

**考虑因素**：
- 块级元素的位置
- 编辑器的位置
- 滚动偏移量

---

## 用户体验优化

### 1. 视觉反馈

- **拖拽手柄**：Hover 时显示，移开后隐藏
- **拖拽指示器**：蓝色线条显示放置位置
- **块级选择**：蓝色背景高亮
- **拖拽光标**：`cursor-grab` 和 `cursor-grabbing`

### 2. 交互优化

- **延迟隐藏**：给用户时间移动到手柄上（300ms）
- **自动选中**：拖拽时自动选中块
- **菜单关闭**：点击外部或执行操作后关闭
- **平滑动画**：使用 CSS transition

### 3. 性能优化

- **事件节流**：避免频繁计算位置
- **条件渲染**：只在需要时渲染手柄
- **事件清理**：组件卸载时清理监听器

---

## 常见问题 FAQ

### Q1: 拖拽手柄不显示？

**A**: 检查以下几点：
1. 是否正确查找了块级元素
2. 是否计算了正确的位置
3. 是否设置了 `position: relative` 在父容器上

### Q2: 拖拽后位置不对？

**A**: 检查：
1. 是否正确计算了目标位置
2. 是否考虑了节点大小（nodeSize）
3. 是否处理了拖拽节点在目标位置之前/之后的情况

### Q3: 拖拽指示器不显示？

**A**: 检查：
1. 是否安装了 `@tiptap/extension-dropcursor`
2. 是否添加了 Dropcursor 扩展
3. 是否配置了颜色和宽度

### Q4: 某些块无法拖拽？

**A**: 检查：
1. 是否在 `closest` 选择器中包含了该类型
2. 是否正确获取了节点位置
3. 是否该节点类型支持移动

---

## 与 Chapter 29 的集成

### 右键菜单增强

在右键菜单中添加块级操作：

```typescript
// 在 ContextMenu.tsx 中添加
if (currentBlock) {
  menuGroups.push({
    id: 'block',
    label: '块操作',
    items: [
      {
        id: 'delete-block',
        label: '删除块',
        action: () => {
          // 删除当前块
        },
      },
      {
        id: 'duplicate-block',
        label: '复制块',
        action: () => {
          // 复制当前块
        },
      },
    ],
  })
}
```

---

## 后续优化方向

### 短期

1. **更多块级操作**
   - 转换块类型（段落 → 标题）
   - 移动到文档开头/结尾
   - 合并/拆分块

2. **多选支持**
   - Shift+点击选择多个块
   - 批量拖拽
   - 批量删除/复制

3. **拖拽预览**
   - 显示拖拽内容的预览
   - 半透明效果

### 中期

1. **跨文档拖拽**
   - 拖拽到其他文档
   - 拖拽到侧边栏

2. **拖拽到外部**
   - 拖拽到桌面保存为文件
   - 拖拽到其他应用

3. **撤销/重做优化**
   - 拖拽操作可撤销
   - 批量操作合并为一次撤销

---

## 总结

本章实现了 Notion 风格的块级编辑功能：

### 核心成果

1. **拖拽手柄**：
   - ✅ 自动显示/隐藏
   - ✅ 位置计算
   - ✅ 拖拽排序

2. **块级操作**：
   - ✅ 块级选择
   - ✅ 删除块
   - ✅ 复制块
   - ✅ 操作菜单

3. **拖拽体验**：
   - ✅ 拖拽指示器
   - ✅ 平滑动画
   - ✅ 视觉反馈

### 技术亮点

1. **块级元素检测**：自动识别不同类型的块
2. **拖拽算法**：正确处理节点移动
3. **位置计算**：精确计算手柄位置
4. **事件处理**：拖拽事件和鼠标事件

### 与其他章节的关系

- **Chapter 29**：右键菜单（基础）
- **Chapter 30**：块级编辑（本章）
- **Chapter 31**：特殊内容块（下一章）

### 学到的知识

1. **HTML5 拖拽 API**：dataTransfer、dragstart、drop
2. **ProseMirror 节点操作**：nodeAt、delete、insert
3. **块级编辑概念**：Notion 的核心体验
4. **位置计算**：getBoundingClientRect、scrollTop

---

**提交代码**：
```bash
git add .
git commit -m "feat: 实现块级编辑和拖拽排序（Chapter 30）

- 创建 DragHandle 组件（拖拽手柄）
- 创建 DragAndDrop 扩展（拖拽逻辑）
- 实现拖拽排序功能
- 实现块级选择
- 实现块级操作菜单（删除、复制）
- 集成 Dropcursor 扩展（拖拽指示器）
- 实现自动显示/隐藏手柄
- 实现位置计算和边界检测
- 编写 Chapter 30 完整教程文档

新建文件：
- client/src/components/editor/DragHandle.tsx
- client/src/extensions/DragAndDrop.ts
- docs/chapter-30.md

修改文件：
- client/src/components/editor/TiptapEditor.tsx

依赖：
- @tiptap/extension-dropcursor"
```

---

## 下一章预告

Chapter 31 将实现特殊内容块：
- Callout 提示框（信息、警告、错误、成功）
- Toggle 折叠块
- Quote 引用块
- Divider 分隔线

这些特殊块将让文档更加丰富和美观！
