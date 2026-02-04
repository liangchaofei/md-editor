# 第35章：拖拽问题修复方案

## 问题分析

### 当前问题
拖拽后内容格式丢失，包括：
- 有序列表失去序号
- 标题变成普通段落
- 代码块失去语法高亮
- 所有格式化信息丢失

### 根本原因

#### 1. DragAndDrop.ts 的问题
```typescript
// 当前实现
tr.delete(draggedPos, draggedPos + draggedNode.nodeSize)
tr.insert(targetPos, draggedNode)
```

**问题：**
- 直接删除和插入节点
- 没有考虑列表的父子关系
- 没有处理嵌套结构
- 位置计算可能不准确

#### 2. DragHandle.tsx 的问题
```typescript
// 只传递位置
e.dataTransfer.setData('text/plain', currentNode.pos.toString())
```

**问题：**
- 只传递了位置信息
- 没有传递节点类型和属性
- 跨文档拖拽会失败

#### 3. 列表项拖拽的特殊问题
- 列表项（li）必须在列表（ol/ul）内
- 拖拽列表项时需要保持列表结构
- 有序列表的序号是自动生成的，不是节点属性

## 解决方案

### 方案1：使用 Tiptap 官方拖拽方案（推荐）

Tiptap 提供了官方的拖拽扩展，已经处理了所有边界情况。

#### 安装依赖
```bash
pnpm add @tiptap/extension-drag-handle-react
```

#### 实现步骤
1. 移除自定义的 DragAndDrop 扩展
2. 使用官方的 DragHandle 扩展
3. 自定义拖拽手柄样式

#### 优点
- 官方维护，bug 少
- 处理了所有边界情况
- 支持所有节点类型
- 性能优化好

#### 缺点
- 需要学习新 API
- 可能需要调整现有代码

### 方案2：修复当前实现（快速）

保留当前架构，修复核心问题。

#### 修复要点

##### 1. 正确处理节点移动

```typescript
// 修复后的实现
drop: (view, event) => {
  event.preventDefault()

  const draggedPosStr = event.dataTransfer?.getData('text/plain')
  if (!draggedPosStr) return false

  const draggedPos = parseInt(draggedPosStr, 10)
  if (isNaN(draggedPos)) return false

  const dropPos = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  })

  if (!dropPos) return false

  // 获取拖拽的节点
  const $draggedPos = view.state.doc.resolve(draggedPos)
  const draggedNode = $draggedPos.nodeAfter
  
  if (!draggedNode) return false

  // 获取目标位置
  const $dropPos = view.state.doc.resolve(dropPos.pos)
  
  // 检查是否可以在目标位置插入该节点
  const canInsert = $dropPos.parent.canReplaceWith(
    $dropPos.index(),
    $dropPos.index(),
    draggedNode.type
  )
  
  if (!canInsert) {
    console.warn('无法在目标位置插入该节点类型')
    return false
  }

  // 计算实际的插入位置
  let insertPos = dropPos.pos
  
  // 如果在拖拽节点之后，需要调整位置
  if (insertPos > draggedPos) {
    insertPos -= draggedNode.nodeSize
  }

  // 执行移动
  const tr = view.state.tr
  
  // 1. 先插入节点（在删除之前）
  const slice = view.state.doc.slice(draggedPos, draggedPos + draggedNode.nodeSize)
  tr.insert(insertPos, slice.content)
  
  // 2. 再删除原位置的节点
  // 如果插入位置在删除位置之前，需要调整删除位置
  const deletePos = insertPos < draggedPos 
    ? draggedPos + draggedNode.nodeSize 
    : draggedPos
  
  tr.delete(deletePos, deletePos + draggedNode.nodeSize)
  
  view.dispatch(tr)
  
  return true
}
```

##### 2. 处理列表项拖拽

```typescript
// 特殊处理列表项
if (draggedNode.type.name === 'listItem') {
  // 检查目标位置是否在列表内
  const targetList = $dropPos.node($dropPos.depth - 1)
  
  if (targetList.type.name !== 'bulletList' && targetList.type.name !== 'orderedList') {
    // 如果目标不在列表内，需要创建新列表
    const listType = $draggedPos.node($draggedPos.depth - 1).type
    const newList = listType.create(null, draggedNode)
    tr.insert(insertPos, newList)
  } else {
    // 在列表内移动
    tr.insert(insertPos, draggedNode)
  }
  
  // 删除原位置
  tr.delete(deletePos, deletePos + draggedNode.nodeSize)
} else {
  // 普通节点移动
  tr.insert(insertPos, draggedNode)
  tr.delete(deletePos, deletePos + draggedNode.nodeSize)
}
```

##### 3. 改进拖拽数据传递

```typescript
// DragHandle.tsx
const handleDragStart = (e: React.DragEvent) => {
  if (!editor || !currentNode) return

  const { pos, node } = currentNode
  
  // 传递完整的节点信息
  const dragData = {
    pos,
    nodeType: node.type.name,
    nodeSize: node.nodeSize,
  }
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-tiptap-node', JSON.stringify(dragData))
  e.dataTransfer.setData('text/plain', pos.toString()) // 兼容性
  
  // ... 其他代码
}
```

```typescript
// DragAndDrop.ts
drop: (view, event) => {
  event.preventDefault()

  // 优先使用完整数据
  const dragDataStr = event.dataTransfer?.getData('application/x-tiptap-node')
  let draggedPos: number
  
  if (dragDataStr) {
    const dragData = JSON.parse(dragDataStr)
    draggedPos = dragData.pos
  } else {
    // 降级到简单模式
    const posStr = event.dataTransfer?.getData('text/plain')
    if (!posStr) return false
    draggedPos = parseInt(posStr, 10)
  }
  
  // ... 其他代码
}
```

### 方案3：使用 ProseMirror 的 NodeView（最佳）

使用 ProseMirror 的 NodeView 实现完全自定义的拖拽。

#### 优点
- 完全控制拖拽行为
- 可以实现复杂的交互
- 性能最优

#### 缺点
- 实现复杂
- 需要深入理解 ProseMirror
- 开发时间长

## 推荐方案

### 短期（立即修复）
使用**方案2**，修复当前实现的核心问题：
1. 正确处理节点移动顺序（先插入后删除）
2. 特殊处理列表项拖拽
3. 改进数据传递

### 长期（优化体验）
迁移到**方案1**，使用 Tiptap 官方拖拽方案：
1. 更稳定可靠
2. 功能更完善
3. 持续维护

## 实施步骤

### 第1步：修复 DragAndDrop.ts
1. 修改节点移动逻辑（先插入后删除）
2. 添加节点类型检查
3. 特殊处理列表项

### 第2步：改进 DragHandle.tsx
1. 传递完整节点信息
2. 改进拖拽预览
3. 添加错误处理

### 第3步：测试
1. 测试普通段落拖拽
2. 测试标题拖拽
3. 测试有序列表拖拽
4. 测试无序列表拖拽
5. 测试代码块拖拽
6. 测试嵌套列表拖拽

### 第4步：优化体验
1. 添加拖拽预览
2. 添加插入位置指示线
3. 添加平滑动画
4. 优化性能

## 测试用例

### 用例1：普通段落拖拽
```
段落1
段落2
段落3

拖拽段落2到段落1之前
预期：段落2、段落1、段落3
```

### 用例2：有序列表拖拽
```
1. 项目1
2. 项目2
3. 项目3

拖拽项目2到项目1之前
预期：
1. 项目2
2. 项目1
3. 项目3
```

### 用例3：标题拖拽
```
# 标题1
段落1
## 标题2
段落2

拖拽标题2到标题1之前
预期：
## 标题2
# 标题1
段落1
段落2
```

### 用例4：跨类型拖拽
```
段落1
1. 列表项1
2. 列表项2

拖拽列表项1到段落1之前
预期：
1. 列表项1
段落1
2. 列表项2
```

## 实施状态

### ✅ 已完成

#### 1. DragHandle.tsx 改进
- ✅ 传递完整节点信息（位置、类型、大小）
- ✅ 添加拖拽开始日志
- ✅ 改进错误处理
- ✅ 优化代码结构

#### 2. DragAndDrop.ts 改进
- ✅ 支持完整节点数据和简单位置数据（兼容性）
- ✅ 改进位置计算（支持文本块和列表项）
- ✅ 特殊处理列表项拖拽（自动创建列表包裹）
- ✅ 根据移动方向优化操作顺序
- ✅ 添加详细日志用于调试
- ✅ 改进错误处理

#### 3. 测试文档
- ✅ 创建详细的测试指南（CHAPTER_35_DRAG_TEST_GUIDE.md）
- ✅ 包含10个测试用例
- ✅ 日志说明和常见问题解答

### 📋 待测试

请按照 `CHAPTER_35_DRAG_TEST_GUIDE.md` 中的测试用例进行测试：
1. 普通段落拖拽
2. 标题拖拽
3. 有序列表拖拽
4. 无序列表拖拽
5. 代码块拖拽
6. 列表项拖出列表
7. 跨类型拖拽
8. 嵌套列表拖拽
9. 向上拖拽
10. 向下拖拽

### 🚀 下一步优化

体验优化（可选）：
- 添加拖拽预览
- 添加插入位置指示线
- 添加平滑动画
- 优化拖拽手柄显示
