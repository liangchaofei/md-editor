# Chapter 7: 文档操作功能

## 本章目标

实现文档的重命名和删除功能：
- ✅ 集成 Headless UI 组件库
- ✅ 实现删除确认对话框
- ✅ 实现右键菜单
- ✅ 实现双击重命名（内联编辑）
- ✅ 键盘快捷键支持（Enter/Escape）
- ✅ 优化用户交互体验

**学习重点：**
- Headless UI 使用
- 内联编辑实现
- 事件处理和传播
- 无障碍设计（a11y）

---

## 一、为什么选择 Headless UI？

### 1.1 什么是 Headless UI？

Headless UI 是由 Tailwind CSS 团队开发的无样式 UI 组件库，提供完整的功能和无障碍支持，但不包含任何样式。

**核心特点：**
- 完全无样式，样式由你控制
- 完整的键盘导航支持
- 符合 WAI-ARIA 规范
- 完美的 TypeScript 支持
- 与 Tailwind CSS 完美配合

### 1.2 Headless UI vs 其他组件库

| 特性 | Headless UI | Ant Design | Material-UI |
|------|-------------|------------|-------------|
| 样式 | 无样式 | 预设样式 | 预设样式 |
| 定制性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 包大小 | 小 | 大 | 大 |
| 学习曲线 | 低 | 中 | 中 |
| 无障碍 | ✅ 完整 | ✅ 良好 | ✅ 良好 |

### 1.3 Headless UI 组件

本章使用的组件：
- `Dialog`: 对话框/模态框
- `Menu`: 下拉菜单

其他可用组件：
- `Listbox`: 选择框
- `Combobox`: 组合框
- `Switch`: 开关
- `Tabs`: 标签页
- `Disclosure`: 折叠面板
- `Popover`: 弹出框
- `RadioGroup`: 单选组
- `Transition`: 过渡动画

---

## 二、安装依赖

```bash
cd client
pnpm add @headlessui/react
```

---

## 三、实现删除确认对话框

### 3.1 创建 Dialog 组件

创建 `client/src/components/dialogs/DeleteConfirmDialog.tsx`：

```typescript
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

function DeleteConfirmDialog({
  isOpen,
  title,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* 对话框容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          {/* 图标 */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600">
              {/* 警告图标 */}
            </svg>
          </div>

          {/* 标题 */}
          <DialogTitle className="mb-2 text-lg font-semibold text-gray-900">
            确认删除
          </DialogTitle>

          {/* 内容 */}
          <p className="mb-6 text-sm text-gray-600">
            确定要删除文档 <span className="font-medium">"{title}"</span> 吗？
            此操作无法撤销。
          </p>

          {/* 按钮 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {loading ? '删除中...' : '删除'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
```

**知识点：**

1. **Dialog 组件结构**
   ```
   Dialog (容器)
   ├── 背景遮罩
   └── DialogPanel (内容面板)
       ├── DialogTitle (标题)
       └── 内容和按钮
   ```

2. **无障碍特性**
   - 自动管理焦点
   - Escape 键关闭
   - 点击遮罩关闭
   - 屏幕阅读器支持

3. **z-index 管理**
   - `z-50`: 确保对话框在最上层
   - Tailwind 的 z-index 层级：0, 10, 20, 30, 40, 50

---

## 四、实现右键菜单

### 4.1 创建 Menu 组件

创建 `client/src/components/menus/DocumentMenu.tsx`：

```typescript
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

interface DocumentMenuProps {
  onRename: () => void
  onDelete: () => void
}

function DocumentMenu({ onRename, onDelete }: DocumentMenuProps) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="rounded p-1 hover:bg-gray-200">
        <svg className="h-4 w-4 text-gray-500">
          {/* 三点图标 */}
        </svg>
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-10 mt-1 w-48 rounded-lg border bg-white shadow-lg"
      >
        <div className="p-1">
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={onRename}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  focus ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                }`}
              >
                <svg className="h-4 w-4">{/* 重命名图标 */}</svg>
                重命名
              </button>
            )}
          </MenuItem>

          <MenuItem>
            {({ focus }) => (
              <button
                onClick={onDelete}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  focus ? 'bg-red-50 text-red-700' : 'text-red-600'
                }`}
              >
                <svg className="h-4 w-4">{/* 删除图标 */}</svg>
                删除
              </button>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  )
}
```

**知识点：**

1. **Menu 组件结构**
   ```
   Menu (容器)
   ├── MenuButton (触发按钮)
   └── MenuItems (菜单项容器)
       └── MenuItem (单个菜单项)
   ```

2. **anchor 定位**
   - `bottom end`: 右下角对齐
   - `bottom start`: 左下角对齐
   - `top end`: 右上角对齐
   - 其他组合...

3. **Render Props 模式**
   ```typescript
   <MenuItem>
     {({ focus, active }) => (
       <button className={focus ? 'bg-blue-50' : ''}>
         菜单项
       </button>
     )}
   </MenuItem>
   ```

---

## 五、实现内联编辑

### 5.1 重命名状态管理

在 Sidebar 组件中添加状态：

```typescript
const [renamingId, setRenamingId] = useState<number | null>(null)
const [renameValue, setRenameValue] = useState('')

// 开始重命名
const handleStartRename = (id: number, currentTitle: string) => {
  setRenamingId(id)
  setRenameValue(currentTitle)
}

// 完成重命名
const handleFinishRename = async (id: number) => {
  if (renameValue.trim() && renameValue !== documents.find(d => d.id === id)?.title) {
    await updateDocument(id, { title: renameValue.trim() })
  }
  setRenamingId(null)
  setRenameValue('')
}

// 取消重命名
const handleCancelRename = () => {
  setRenamingId(null)
  setRenameValue('')
}
```

### 5.2 DocumentItem 支持重命名

```typescript
function DocumentItem({
  title,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onDoubleClick,
  onRenameFinish,
  onRenameCancel,
  // ...
}) {
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameFinish?.()
    } else if (e.key === 'Escape') {
      onRenameCancel?.()
    }
  }

  return (
    <div onDoubleClick={isRenaming ? undefined : onDoubleClick}>
      {isRenaming ? (
        <input
          type="text"
          value={renameValue}
          onChange={e => onRenameValueChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onRenameFinish}
          autoFocus
          className="rounded border border-primary-500 px-2 py-1"
        />
      ) : (
        <span>{title}</span>
      )}
    </div>
  )
}
```

**知识点：**

1. **双击编辑**
   - `onDoubleClick`: 触发编辑模式
   - 编辑时禁用双击事件

2. **键盘快捷键**
   - `Enter`: 确认
   - `Escape`: 取消

3. **自动聚焦**
   - `autoFocus`: 输入框自动获得焦点
   - `onBlur`: 失去焦点时保存

4. **条件渲染**
   - 根据 `isRenaming` 切换显示模式

---

## 六、事件处理和传播

### 6.1 阻止事件冒泡

```typescript
<div onClick={e => e.stopPropagation()}>
  <DocumentMenu onRename={onRename} onDelete={onDelete} />
</div>
```

**为什么需要阻止冒泡？**
- 点击菜单按钮不应该触发文档选择
- 点击菜单项不应该触发父元素事件

### 6.2 事件传播顺序

```
捕获阶段 (Capture)
    ↓
目标阶段 (Target)
    ↓
冒泡阶段 (Bubble)
```

**示例：**
```typescript
// 捕获阶段
<div onClickCapture={() => console.log('父元素捕获')}>
  <button onClick={() => console.log('按钮点击')}>
    点击
  </button>
</div>

// 输出顺序：
// 1. 父元素捕获
// 2. 按钮点击
```

### 6.3 阻止默认行为

```typescript
<form onSubmit={e => {
  e.preventDefault()  // 阻止表单提交
  handleSubmit()
}}>
```

---

## 七、面试考点

### 7.1 Headless UI 原理

**Q: 什么是 Headless 组件？**

A: Headless 组件只提供逻辑和行为，不包含样式。

**优点：**
- 完全的样式控制
- 更小的包体积
- 更好的定制性

**缺点：**
- 需要自己写样式
- 开发时间稍长

**Q: Headless UI 如何实现无障碍？**

A:
1. **ARIA 属性**
   ```html
   <button
     aria-expanded="true"
     aria-haspopup="true"
     aria-controls="menu-items"
   >
   ```

2. **键盘导航**
   - Tab: 焦点移动
   - Enter/Space: 激活
   - Escape: 关闭
   - 箭头键: 菜单导航

3. **焦点管理**
   - 自动捕获焦点
   - 焦点陷阱（Focus Trap）
   - 恢复焦点

### 7.2 内联编辑实现

**Q: 如何实现内联编辑？**

A: 核心思路是条件渲染：

```typescript
{isEditing ? (
  <input
    value={value}
    onChange={e => setValue(e.target.value)}
    onBlur={handleSave}
    onKeyDown={handleKeyDown}
    autoFocus
  />
) : (
  <span onDoubleClick={handleEdit}>{value}</span>
)}
```

**Q: 如何处理编辑冲突？**

A:
1. **乐观更新**
   ```typescript
   // 立即更新 UI
   setTitle(newTitle)
   
   // 后台保存
   try {
     await api.update(id, { title: newTitle })
   } catch (error) {
     // 失败时回滚
     setTitle(oldTitle)
   }
   ```

2. **悲观更新**
   ```typescript
   // 先保存
   await api.update(id, { title: newTitle })
   
   // 成功后更新 UI
   setTitle(newTitle)
   ```

### 7.3 事件处理

**Q: stopPropagation 和 preventDefault 的区别？**

A:
- `stopPropagation()`: 阻止事件冒泡
- `preventDefault()`: 阻止默认行为

```typescript
// 阻止冒泡
<div onClick={() => console.log('父元素')}>
  <button onClick={e => {
    e.stopPropagation()  // 不会触发父元素的 onClick
    console.log('按钮')
  }}>
    点击
  </button>
</div>

// 阻止默认行为
<a href="https://example.com" onClick={e => {
  e.preventDefault()  // 不会跳转
  console.log('点击链接')
}}>
  链接
</a>
```

**Q: 如何实现事件委托？**

A: 利用事件冒泡，在父元素上监听子元素事件：

```typescript
<ul onClick={e => {
  const target = e.target as HTMLElement
  if (target.tagName === 'LI') {
    console.log('点击了:', target.textContent)
  }
}}>
  <li>项目 1</li>
  <li>项目 2</li>
  <li>项目 3</li>
</ul>
```

**优点：**
- 减少事件监听器数量
- 动态添加的元素也能响应事件

---

## 八、验证功能

### 8.1 测试步骤

1. **测试删除功能**
   - 悬停文档项，点击菜单按钮
   - 选择"删除"
   - 应该弹出确认对话框
   - 点击"删除"按钮
   - 文档应该从列表中消失

2. **测试重命名功能**
   - 方式1：双击文档标题
   - 方式2：点击菜单中的"重命名"
   - 输入框应该自动聚焦
   - 修改标题后按 Enter 保存
   - 或按 Escape 取消

3. **测试键盘操作**
   - 重命名时按 Enter 确认
   - 重命名时按 Escape 取消
   - 对话框按 Escape 关闭

4. **测试事件冒泡**
   - 点击菜单按钮不应该选中文档
   - 点击菜单项不应该选中文档
   - 编辑时点击输入框不应该触发其他事件

### 8.2 验证清单

- ✅ 删除确认对话框正常显示
- ✅ 删除功能正常工作
- ✅ 双击重命名功能正常
- ✅ 菜单重命名功能正常
- ✅ Enter 键确认重命名
- ✅ Escape 键取消重命名
- ✅ 失去焦点自动保存
- ✅ 菜单按钮悬停显示
- ✅ 事件冒泡正确处理
- ✅ 无障碍功能正常

---

## 九、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 删除确认对话框
- ✅ 右键菜单
- ✅ 双击重命名
- ✅ 键盘快捷键
- ✅ 事件处理优化

### 核心概念
- ✅ Headless UI 使用
- ✅ 内联编辑实现
- ✅ 事件传播机制
- ✅ 无障碍设计

### 最佳实践
- ✅ 组件化设计
- ✅ 用户体验优化
- ✅ 键盘导航支持
- ✅ 清晰的交互反馈

---

## 十、下一章预告

在下一章（Chapter 8）中，我们将：

1. **集成 Tiptap 编辑器**
   - 安装 Tiptap 依赖
   - 创建基础编辑器
   - 集成 StarterKit

2. **实现基础编辑功能**
   - 文本编辑
   - 格式化（加粗、斜体等）
   - 标题、列表

3. **实现自动保存**
   - 防抖保存
   - 保存状态指示
   - 错误处理

准备好了吗？让我们继续前进！🚀
