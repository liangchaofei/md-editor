# Chapter 9: 编辑器工具栏

## 本章目标

实现编辑器工具栏功能：
- ✅ 浮动工具栏（选中文字时显示）
- ✅ 固定工具栏（编辑器顶部）
- ✅ 格式化按钮（加粗、斜体、删除线等）
- ✅ 标题选择器
- ✅ 列表按钮
- ✅ 按钮状态同步
- ✅ 撤销/重做功能

**学习重点：**
- Tiptap 命令系统
- 工具栏实现模式
- 按钮状态管理
- 用户体验优化

---

## 一、工具栏类型

### 1.1 浮动工具栏（Bubble Menu）

**特点：**
- 选中文字时显示
- 跟随选区位置
- 快速格式化

**适用场景：**
- 文本格式化
- 快速操作
- 类似 Medium 编辑器

### 1.2 固定工具栏（Menu Bar）

**特点：**
- 固定在编辑器顶部
- 始终可见
- 功能更全面

**适用场景：**
- 完整功能展示
- 传统编辑器体验
- 类似 Word/Google Docs

---

## 二、实现浮动工具栏

### 2.1 安装依赖

```bash
pnpm --filter client add @tiptap/extension-bubble-menu tippy.js
```

**依赖说明：**
- `@tiptap/extension-bubble-menu`: Tiptap 浮动菜单扩展
- `tippy.js`: 工具提示库（BubbleMenu 的底层实现）

### 2.2 创建 BubbleMenu 组件

创建 `client/src/components/editor/BubbleMenu.tsx`：

```typescript
import { TiptapBubbleMenu } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface BubbleMenuProps {
  editor: Editor
}

function BubbleMenu({ editor }: BubbleMenuProps) {
  if (!editor) {
    return null
  }

  return (
    <TiptapBubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: 'top', zIndex: 50 }}
      shouldShow={({ editor, state }) => {
        // 只在选中文本时显示
        const { from, to } = state.selection
        const isTextSelected = from !== to
        return isTextSelected
      }}
      className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-xl z-50"
    >
      {/* 加粗按钮 */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded p-2 hover:bg-gray-100 ${
          editor.isActive('bold') ? 'bg-gray-100 text-primary-600' : 'text-gray-700'
        }`}
        title="加粗 (Ctrl+B)"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>
      
      {/* 更多按钮... */}
    </TiptapBubbleMenu>
  )
}

export default BubbleMenu
```

### 2.3 关键配置说明

**1. 使用 onMouseDown 而不是 onClick**

这是一个非常重要的细节！工具栏按钮必须使用 `onMouseDown` 事件：

```typescript
<button
  onMouseDown={(e) => {
    e.preventDefault()  // 阻止默认行为，防止焦点转移
    editor.chain().focus().toggleBold().run()
  }}
>
  加粗
</button>
```

**为什么不能用 onClick？**
- 当用户点击按钮时，焦点会从编辑器转移到按钮
- 此时 `editor.isFocused` 变为 `false`
- 编辑器命令无法正确执行
- 使用 `onMouseDown` + `e.preventDefault()` 可以防止焦点转移

**2. tippyOptions 配置**
```typescript
tippyOptions={{ 
  duration: 100,      // 动画时长（毫秒）
  placement: 'top',   // 显示位置
  zIndex: 50          // 层级（确保在最上层）
}}
```

**3. shouldShow 函数**
```typescript
shouldShow={({ editor, state }) => {
  const { from, to } = state.selection
  const isTextSelected = from !== to
  return isTextSelected
}}
```
- 控制何时显示 BubbleMenu
- `from !== to` 表示有文本被选中
- 可以添加更多条件（如不在代码块中显示）

**4. 样式类名**
- `z-50`: 确保浮动菜单在最上层
- `shadow-xl`: 添加阴影效果
- `border border-gray-200`: 边框样式

**5. 按钮事件处理**
所有按钮都必须使用 `onMouseDown` 而不是 `onClick`：
```typescript
<button
  onMouseDown={(e) => {
    e.preventDefault()
    editor.chain().focus().toggleBold().run()
  }}
>
  加粗
</button>
```

### 2.4 导入 Tippy.js 样式

在 `client/src/styles/index.css` 中添加：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tippy.js 样式 */
@import 'tippy.js/dist/tippy.css';

/* 全局样式 */
```

**为什么需要导入 Tippy.js 样式？**
- BubbleMenu 底层使用 Tippy.js 实现定位
- Tippy.js 样式提供基础的定位和动画
- 不导入可能导致 BubbleMenu 不显示或位置错误

---

## 三、实现固定工具栏

### 3.1 创建 MenuBar 组件

创建 `client/src/components/editor/MenuBar.tsx`：

```typescript
import type { Editor } from '@tiptap/react'

function MenuBar({ editor }: { editor: Editor }) {
  if (!editor) {
    return null
  }

  return (
    <div className="flex items-center gap-1 border-b bg-gray-50 p-2">
      {/* 撤销/重做 */}
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().undo().run()
        }}
        disabled={!editor.can().undo()}
      >
        撤销
      </button>
      
      {/* 格式化按钮 */}
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          editor.chain().focus().toggleBold().run()
        }}
        className={editor.isActive('bold') ? 'active' : ''}
      >
        加粗
      </button>
      
      {/* 标题按钮 */}
      {[1, 2, 3].map((level) => (
        <button
          key={level}
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleHeading({ level }).run()
          }}
          className={editor.isActive('heading', { level }) ? 'active' : ''}
        >
          H{level}
        </button>
      ))}
    </div>
  )
}
```

### 3.2 关键要点

**1. 必须使用 onMouseDown**
```typescript
// ❌ 错误：使用 onClick 会导致焦点丢失
<button onClick={() => editor.chain().focus().toggleBold().run()}>

// ✅ 正确：使用 onMouseDown + preventDefault
<button onMouseDown={(e) => {
  e.preventDefault()
  editor.chain().focus().toggleBold().run()
}}>
```

**原因：**
- 点击按钮时，焦点会从编辑器转移到按钮
- 导致 `editor.isFocused` 变为 `false`
- 编辑器命令无法正确执行
- `onMouseDown` 在焦点转移前触发
- `e.preventDefault()` 阻止焦点转移

**2. 功能分组**
1. 撤销/重做
2. 文本格式（加粗、斜体、删除线、代码）
3. 标题（H1-H6）
4. 列表（无序、有序）
5. 其他（引用、代码块、分隔线）

---

## 四、工具栏按钮最佳实践

### 4.1 事件处理

**使用 onMouseDown 而不是 onClick：**

```typescript
// ❌ 错误示例
<button onClick={() => editor.chain().focus().toggleBold().run()}>
  加粗
</button>

// ✅ 正确示例
<button
  onMouseDown={(e) => {
    e.preventDefault()  // 必须阻止默认行为
    editor.chain().focus().toggleBold().run()
  }}
>
  加粗
</button>
```

**为什么这样做？**
1. **焦点问题：** 点击按钮会导致编辑器失去焦点
2. **命令失效：** 编辑器失去焦点后，某些命令无法执行
3. **用户体验：** 用户点击按钮后需要重新点击编辑器才能继续输入

**技术原理：**
- `onMouseDown` 在 `onClick` 之前触发
- `onMouseDown` 在焦点转移之前触发
- `e.preventDefault()` 阻止默认的焦点转移行为
- `editor.chain().focus()` 确保编辑器保持焦点

### 4.2 按钮状态同步

```typescript
<button
  className={editor.isActive('bold') ? 'active' : ''}
>
  加粗
</button>
```

- 使用 `editor.isActive()` 检查当前状态
- 根据状态添加不同的样式类
- 提供视觉反馈给用户

### 4.3 禁用状态

```typescript
<button
  onMouseDown={(e) => {
    e.preventDefault()
    editor.chain().focus().undo().run()
  }}
  disabled={!editor.can().undo()}
>
  撤销
</button>
```

- 使用 `editor.can()` 检查命令是否可执行
- 不可执行时禁用按钮
- 提升用户体验

---

## 五、验证功能

### 5.1 测试步骤

1. **测试浮动工具栏**
   - 选中文字
   - 应该显示浮动工具栏
   - 点击按钮测试格式化

2. **测试固定工具栏**
   - 点击各个按钮
   - 验证格式化效果
   - 检查按钮状态同步

3. **测试快捷键**
   - Ctrl+B 加粗
   - Ctrl+I 斜体
   - Ctrl+Z 撤销
   - Ctrl+Shift+Z 重做

4. **测试撤销/重做**
   - 编辑内容
   - 点击撤销
   - 点击重做
   - 验证状态正确

### 5.2 验证清单

- ✅ 浮动工具栏正常显示
- ✅ 固定工具栏正常显示
- ✅ 格式化按钮工作正常
- ✅ 按钮状态正确同步
- ✅ 快捷键正常工作
- ✅ 撤销/重做功能正常
- ✅ 标题切换正常
- ✅ 列表功能正常

---

## 六、Tiptap 命令系统深入

### 6.1 命令链（Chain）

命令链是 Tiptap 的核心特性，允许组合多个命令：

```typescript
// 单个命令
editor.chain().focus().toggleBold().run()

// 组合命令
editor.chain()
  .focus()                    // 聚焦编辑器
  .toggleBold()               // 切换加粗
  .toggleItalic()             // 切换斜体
  .run()                      // 执行所有命令

// 条件执行
if (editor.can().toggleBold()) {
  editor.chain().focus().toggleBold().run()
}
```

**为什么需要 .focus()？**
- 确保编辑器获得焦点
- 保持光标位置
- 避免选区丢失

**为什么需要 .run()？**
- 命令链是惰性的
- .run() 才会真正执行
- 可以在执行前检查条件

### 6.2 常用命令

```typescript
// 文本格式
editor.chain().focus().toggleBold().run()        // 加粗
editor.chain().focus().toggleItalic().run()      // 斜体
editor.chain().focus().toggleStrike().run()      // 删除线
editor.chain().focus().toggleCode().run()        // 行内代码

// 标题
editor.chain().focus().toggleHeading({ level: 1 }).run()  // H1
editor.chain().focus().setParagraph().run()               // 段落

// 列表
editor.chain().focus().toggleBulletList().run()   // 无序列表
editor.chain().focus().toggleOrderedList().run()  // 有序列表

// 其他
editor.chain().focus().toggleBlockquote().run()   // 引用
editor.chain().focus().toggleCodeBlock().run()    // 代码块
editor.chain().focus().setHorizontalRule().run()  // 分隔线

// 撤销/重做
editor.chain().focus().undo().run()
editor.chain().focus().redo().run()
```

### 6.3 命令检查

```typescript
// 检查是否可以执行
editor.can().undo()                    // 是否可以撤销
editor.can().redo()                    // 是否可以重做
editor.can().toggleBold()              // 是否可以加粗

// 检查当前状态
editor.isActive('bold')                // 是否已加粗
editor.isActive('heading', { level: 1 })  // 是否是 H1
editor.isActive('bulletList')          // 是否是无序列表

// 用于按钮状态
<button
  onClick={() => editor.chain().focus().undo().run()}
  disabled={!editor.can().undo()}
>
  撤销
</button>
```

### 6.4 快捷键支持

Tiptap StarterKit 内置快捷键：

| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 加粗 | Ctrl+B | Cmd+B |
| 斜体 | Ctrl+I | Cmd+I |
| 删除线 | Ctrl+Shift+X | Cmd+Shift+X |
| 代码 | Ctrl+E | Cmd+E |
| 撤销 | Ctrl+Z | Cmd+Z |
| 重做 | Ctrl+Shift+Z | Cmd+Shift+Z |
| 段落 | Ctrl+Alt+0 | Cmd+Alt+0 |
| H1-H6 | Ctrl+Alt+1-6 | Cmd+Alt+1-6 |

---

## 七、常见问题排查

### 7.1 BubbleMenu 不显示

**问题：** 选中文字后，浮动工具栏不出现

**可能原因和解决方案：**

1. **未导入 Tippy.js 样式**
   ```css
   /* 在 index.css 中添加 */
   @import 'tippy.js/dist/tippy.css';
   ```

2. **未配置 tippyOptions**
   ```typescript
   <TiptapBubbleMenu
     editor={editor}
     tippyOptions={{ duration: 100, placement: 'top', zIndex: 50 }}
   />
   ```

3. **shouldShow 函数返回 false**
   ```typescript
   shouldShow={({ state }) => {
     const { from, to } = state.selection
     return from !== to  // 确保有文本被选中
   }}
   ```

4. **z-index 层级问题**
   ```typescript
   // 添加 z-50 类名
   className="... z-50"
   ```

### 7.2 按钮状态不同步

**问题：** 点击按钮后，按钮状态没有更新

**解决方案：**
```typescript
// 确保使用 editor.isActive() 检查状态
className={editor.isActive('bold') ? 'active' : ''}
```

### 7.3 快捷键不工作

**问题：** 按 Ctrl+B 等快捷键没有反应

**解决方案：**
- StarterKit 默认包含快捷键
- 检查是否有其他组件拦截了键盘事件
- 确保编辑器已聚焦

---

## 八、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 浮动工具栏
- ✅ 固定工具栏
- ✅ 完整的格式化功能
- ✅ 撤销/重做
- ✅ 快捷键支持

### 核心概念
- ✅ Tiptap 命令系统
- ✅ 工具栏实现模式
- ✅ 按钮状态管理
- ✅ 用户体验优化

现在编辑器已经具备完整的基础编辑功能！

---

## 九、下一章预告

在下一章（Chapter 10）中，我们将优化编辑器样式和用户体验。

准备好了吗？让我们继续前进！🚀
