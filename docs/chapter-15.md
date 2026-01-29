# Chapter 15: 编辑器快捷键和斜杠命令

## 本章目标

在本章中，我们将为编辑器添加两个重要的用户体验功能：

1. **快捷键系统**：实现常用的编辑器快捷键（如 Ctrl+B 加粗、Ctrl+Z 撤销等）
2. **斜杠命令菜单**：实现类似 Notion 的 `/` 命令快速插入功能

这些功能将大大提升编辑器的使用效率和用户体验。

---

## 理论知识

### 1. 编辑器快捷键系统

#### 1.1 快捷键的重要性

快捷键是提升编辑效率的关键：
- **减少鼠标操作**：用户可以保持在键盘上完成大部分操作
- **提升专业感**：符合用户在其他编辑器中的使用习惯
- **提高效率**：熟练用户可以快速完成格式化操作

#### 1.2 常见编辑器快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+B` / `Cmd+B` | 加粗 | 切换选中文本的加粗状态 |
| `Ctrl+I` / `Cmd+I` | 斜体 | 切换选中文本的斜体状态 |
| `Ctrl+U` / `Cmd+U` | 下划线 | 切换选中文本的下划线 |
| `Ctrl+Shift+X` | 删除线 | 切换选中文本的删除线 |
| `Ctrl+Z` / `Cmd+Z` | 撤销 | 撤销上一步操作 |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | 重做 | 重做上一步撤销的操作 |
| `Ctrl+K` / `Cmd+K` | 插入链接 | 为选中文本添加链接 |
| `Ctrl+Alt+1-6` | 标题 | 设置标题级别 |
| `Ctrl+Shift+8` | 无序列表 | 切换无序列表 |
| `Ctrl+Shift+7` | 有序列表 | 切换有序列表 |

#### 1.3 Tiptap 快捷键实现原理

Tiptap 使用 ProseMirror 的 `keymap` 插件来处理快捷键：

```typescript
// 快捷键映射
const keymap = {
  'Mod-b': () => editor.chain().focus().toggleBold().run(),
  'Mod-i': () => editor.chain().focus().toggleItalic().run(),
}
```

- `Mod` 是一个特殊修饰符：在 Mac 上是 `Cmd`，在 Windows/Linux 上是 `Ctrl`
- `chain()` 允许链式调用多个命令
- `focus()` 确保编辑器获得焦点
- `run()` 执行命令链

### 2. 斜杠命令菜单

#### 2.1 斜杠命令的优势

斜杠命令（Slash Commands）是现代编辑器的标志性功能：
- **快速插入**：输入 `/` 即可快速插入各种内容块
- **可发现性**：用户可以通过菜单发现编辑器的所有功能
- **减少工具栏依赖**：不需要在工具栏中寻找按钮

#### 2.2 实现原理

斜杠命令的实现涉及几个关键技术：

1. **输入监听**：监听用户输入的 `/` 字符
2. **菜单定位**：在光标位置显示命令菜单
3. **模糊搜索**：根据用户输入过滤命令列表
4. **命令执行**：选择命令后执行相应操作
5. **文本替换**：删除 `/` 和搜索文本，插入选中的内容

#### 2.3 Tiptap Suggestion 扩展

Tiptap 提供了 `@tiptap/suggestion` 扩展来实现斜杠命令：

```typescript
import Suggestion from '@tiptap/suggestion'

// 配置 Suggestion
Suggestion.configure({
  char: '/', // 触发字符
  command: ({ editor, range, props }) => {
    // 执行命令
    editor.chain().focus().deleteRange(range).run()
    props.command({ editor })
  },
})
```

---

## 实现步骤

### 步骤 1：配置编辑器快捷键

Tiptap 的 StarterKit 已经内置了大部分快捷键，但我们可以自定义和扩展。

首先，让我们查看当前的快捷键配置，并添加一些自定义快捷键。

#### 1.1 创建快捷键配置文件

创建 `client/src/extensions/CustomKeymap.ts`：

```typescript
/**
 * 自定义快捷键扩展
 */

import { Extension } from '@tiptap/core'

export const CustomKeymap = Extension.create({
  name: 'customKeymap',

  addKeyboardShortcuts() {
    return {
      // 基础格式化快捷键（StarterKit 已包含，这里作为示例）
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      
      // 标题快捷键
      'Mod-Alt-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Alt-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-Alt-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-Alt-5': () => this.editor.commands.toggleHeading({ level: 5 }),
      'Mod-Alt-6': () => this.editor.commands.toggleHeading({ level: 6 }),
      
      // 列表快捷键
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
      
      // 清除格式
      'Mod-\\': () => this.editor.commands.clearNodes(),
      
      // 水平线
      'Mod-Shift--': () => this.editor.commands.setHorizontalRule(),
      
      // 代码块
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      
      // 引用
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
    }
  },
})
```

### 步骤 2：安装斜杠命令依赖

安装 Tiptap 的 Suggestion 扩展和相关依赖：

```bash
cd client
pnpm add @tiptap/suggestion tippy.js
```

### 步骤 3：创建斜杠命令扩展

创建 `client/src/extensions/SlashCommands.ts`：

```typescript
/**
 * 斜杠命令扩展
 */

import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import CommandsList from '../components/editor/CommandsList'

export interface CommandItem {
  title: string
  description: string
  icon: string
  command: ({ editor, range }: any) => void
  aliases?: string[]
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

// 命令列表配置
export const slashCommandItems: CommandItem[] = [
  {
    title: '标题 1',
    description: '大标题',
    icon: 'H1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
    aliases: ['h1', 'heading1', '一级标题'],
  },
  {
    title: '标题 2',
    description: '中标题',
    icon: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
    aliases: ['h2', 'heading2', '二级标题'],
  },
  {
    title: '标题 3',
    description: '小标题',
    icon: 'H3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
    aliases: ['h3', 'heading3', '三级标题'],
  },
  {
    title: '无序列表',
    description: '创建无序列表',
    icon: '•',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    aliases: ['ul', 'bullet', '列表'],
  },
  {
    title: '有序列表',
    description: '创建有序列表',
    icon: '1.',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    aliases: ['ol', 'ordered', '编号列表'],
  },
  {
    title: '代码块',
    description: '插入代码块',
    icon: '</>',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run()
    },
    aliases: ['code', 'codeblock', '代码'],
  },
  {
    title: '引用',
    description: '插入引用块',
    icon: '"',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run()
    },
    aliases: ['quote', 'blockquote', '引用块'],
  },
  {
    title: '分割线',
    description: '插入水平分割线',
    icon: '—',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    aliases: ['hr', 'divider', '分隔线'],
  },
]

// Suggestion 配置
export const slashCommandSuggestion = {
  items: ({ query }: { query: string }) => {
    return slashCommandItems.filter((item) => {
      const searchText = query.toLowerCase()
      return (
        item.title.toLowerCase().includes(searchText) ||
        item.description.toLowerCase().includes(searchText) ||
        item.aliases?.some((alias) => alias.toLowerCase().includes(searchText))
      )
    })
  },

  render: () => {
    let component: ReactRenderer
    let popup: TippyInstance[]

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
```

### 步骤 4：创建命令列表组件

创建 `client/src/components/editor/CommandsList.tsx`：

```typescript
/**
 * 斜杠命令列表组件
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { CommandItem } from '../../extensions/SlashCommands'

interface CommandsListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

const CommandsList = forwardRef((props: CommandsListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div className="slash-commands-list">
        <div className="slash-commands-empty">没有找到匹配的命令</div>
      </div>
    )
  }

  return (
    <div className="slash-commands-list">
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`slash-commands-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => selectItem(index)}
        >
          <div className="slash-commands-icon">{item.icon}</div>
          <div className="slash-commands-content">
            <div className="slash-commands-title">{item.title}</div>
            <div className="slash-commands-description">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
})

CommandsList.displayName = 'CommandsList'

export default CommandsList
```

### 步骤 5：添加斜杠命令样式

在 `client/src/styles/index.css` 中添加斜杠命令的样式：

```css
/* 斜杠命令菜单样式 */
.slash-commands-list {
  @apply bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-h-80 overflow-y-auto;
  min-width: 280px;
}

.slash-commands-item {
  @apply flex items-start gap-3 w-full px-3 py-2 rounded-md text-left transition-colors;
}

.slash-commands-item:hover,
.slash-commands-item.is-selected {
  @apply bg-blue-50;
}

.slash-commands-icon {
  @apply flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-md text-gray-700 font-semibold text-sm;
}

.slash-commands-item.is-selected .slash-commands-icon {
  @apply bg-blue-100 text-blue-700;
}

.slash-commands-content {
  @apply flex-1 min-w-0;
}

.slash-commands-title {
  @apply text-sm font-medium text-gray-900;
}

.slash-commands-description {
  @apply text-xs text-gray-500 mt-0.5;
}

.slash-commands-empty {
  @apply px-3 py-2 text-sm text-gray-500;
}
```

### 步骤 6：集成到编辑器

更新 `client/src/components/editor/TiptapEditor.tsx`，添加快捷键和斜杠命令扩展：

```typescript
// 在文件顶部添加导入
import { CustomKeymap } from '../../extensions/CustomKeymap'
import { SlashCommands, slashCommandSuggestion } from '../../extensions/SlashCommands'

// 在 editor 配置中添加扩展
const editor = useEditor({
  extensions: [
    // ... 其他扩展
    
    // 自定义快捷键
    CustomKeymap,
    
    // 斜杠命令
    SlashCommands.configure({
      suggestion: slashCommandSuggestion,
    }),
  ],
  // ... 其他配置
}, [document.id, ydoc, provider])
```

---

## 功能验证

### 1. 测试快捷键

启动开发服务器：

```bash
# 启动后端
cd server
pnpm dev

# 启动前端
cd client
pnpm dev
```

打开浏览器，测试以下快捷键：

1. **基础格式化**：
   - 选中文本，按 `Ctrl+B`（Mac: `Cmd+B`）应该切换加粗
   - 按 `Ctrl+I` 应该切换斜体
   - 按 `Ctrl+U` 应该切换下划线

2. **标题快捷键**：
   - 按 `Ctrl+Alt+1` 应该设置为一级标题
   - 按 `Ctrl+Alt+2` 应该设置为二级标题

3. **列表快捷键**：
   - 按 `Ctrl+Shift+8` 应该切换无序列表
   - 按 `Ctrl+Shift+7` 应该切换有序列表

### 2. 测试斜杠命令

1. **打开命令菜单**：
   - 在编辑器中输入 `/`
   - 应该看到命令菜单弹出

2. **搜索命令**：
   - 输入 `/标题` 应该过滤出标题相关命令
   - 输入 `/h1` 应该显示"标题 1"

3. **选择命令**：
   - 使用 ↑↓ 键导航
   - 按 Enter 或点击选择命令
   - 命令应该被执行，`/` 和搜索文本应该被删除

4. **测试各种命令**：
   - `/h1` → 创建一级标题
   - `/列表` → 创建无序列表
   - `/代码` → 创建代码块
   - `/引用` → 创建引用块

---

## 核心知识点

### 1. Tiptap 快捷键系统

#### 1.1 快捷键配置

```typescript
addKeyboardShortcuts() {
  return {
    'Mod-b': () => this.editor.commands.toggleBold(),
  }
}
```

- `Mod` 是跨平台修饰符（Mac: Cmd, Windows/Linux: Ctrl）
- 返回 `true` 表示快捷键已处理，阻止默认行为
- 返回 `false` 表示继续传播事件

#### 1.2 快捷键优先级

快捷键的优先级从高到低：
1. 自定义扩展的快捷键
2. 内置扩展的快捷键
3. 浏览器默认行为

### 2. Suggestion 扩展原理

#### 2.1 触发机制

```typescript
{
  char: '/',           // 触发字符
  startOfLine: false,  // 是否只在行首触发
}
```

#### 2.2 渲染流程

1. **onStart**：用户输入触发字符时调用
2. **onUpdate**：用户继续输入时调用
3. **onKeyDown**：处理键盘事件（↑↓ Enter Esc）
4. **onExit**：命令执行或取消时调用

#### 2.3 命令执行

```typescript
command: ({ editor, range, props }) => {
  // 1. 删除触发字符和搜索文本
  editor.chain().focus().deleteRange(range).run()
  
  // 2. 执行命令
  props.command({ editor })
}
```

### 3. Tippy.js 定位

Tippy.js 用于定位弹出菜单：

```typescript
tippy('body', {
  getReferenceClientRect: props.clientRect,  // 获取光标位置
  placement: 'bottom-start',                 // 菜单位置
  interactive: true,                         // 允许交互
})
```

---

## 常见问题

### 1. 快捷键不生效

**问题**：按下快捷键没有反应

**解决方案**：
- 检查编辑器是否获得焦点
- 检查快捷键是否与浏览器默认快捷键冲突
- 使用 `event.preventDefault()` 阻止默认行为

### 2. 斜杠命令菜单位置不正确

**问题**：菜单显示在错误的位置

**解决方案**：
- 检查 `clientRect` 是否正确
- 调整 Tippy.js 的 `placement` 配置
- 检查 CSS 的 `position` 和 `z-index`

### 3. 命令执行后文本没有删除

**问题**：选择命令后，`/` 和搜索文本仍然存在

**解决方案**：
```typescript
// 确保先删除 range
editor.chain().focus().deleteRange(range).run()
```

---

## 扩展功能

### 1. 添加更多命令

可以在 `slashCommandItems` 中添加更多命令：

```typescript
{
  title: '任务列表',
  description: '创建待办事项',
  icon: '☑',
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).toggleTaskList().run()
  },
  aliases: ['todo', 'task', '待办'],
}
```

### 2. 命令分组

可以将命令分组显示：

```typescript
const commandGroups = [
  {
    name: '基础块',
    items: [/* 标题、段落等 */],
  },
  {
    name: '列表',
    items: [/* 无序列表、有序列表等 */],
  },
]
```

### 3. 自定义快捷键提示

在工具栏按钮上显示快捷键提示：

```typescript
<button title="加粗 (Ctrl+B)">
  <Bold />
</button>
```

---

## 性能优化

### 1. 命令搜索优化

使用防抖优化搜索：

```typescript
import { useDebouncedCallback } from 'use-debounce'

const debouncedSearch = useDebouncedCallback((query) => {
  // 搜索逻辑
}, 150)
```

### 2. 菜单渲染优化

使用虚拟滚动优化长列表：

```typescript
import { FixedSizeList } from 'react-window'
```

### 3. 快捷键处理优化

避免在快捷键处理函数中执行耗时操作：

```typescript
'Mod-b': () => {
  // ✅ 好的做法：直接执行命令
  return this.editor.commands.toggleBold()
  
  // ❌ 不好的做法：执行耗时操作
  // await someAsyncOperation()
}
```

---

## 面试考点

### 1. 快捷键系统设计

**问题**：如何设计一个可扩展的快捷键系统？

**答案**：
- 使用键盘事件监听
- 实现快捷键注册机制
- 支持快捷键优先级
- 处理快捷键冲突
- 支持跨平台（Mod 键）

### 2. 命令模式

**问题**：斜杠命令使用了什么设计模式？

**答案**：
- **命令模式**：将操作封装为命令对象
- **策略模式**：不同命令有不同的执行策略
- **工厂模式**：根据用户输入创建命令

### 3. 事件处理

**问题**：如何处理键盘事件的优先级？

**答案**：
- 使用事件捕获和冒泡机制
- 实现事件拦截（`event.stopPropagation()`）
- 返回 `true/false` 控制事件传播

---

## 本章小结

在本章中，我们实现了：

1. ✅ **自定义快捷键系统**
   - 基础格式化快捷键
   - 标题快捷键
   - 列表快捷键
   - 其他实用快捷键

2. ✅ **斜杠命令菜单**
   - 命令触发和搜索
   - 命令列表渲染
   - 键盘导航
   - 命令执行

3. ✅ **用户体验优化**
   - 快速插入内容
   - 键盘友好
   - 可发现性强

这些功能大大提升了编辑器的使用效率，让用户可以更专注于内容创作。

---

## 下一章预告

在下一章中，我们将实现：

**Chapter 16: 文档导出功能**
- 导出为 Markdown 格式
- 导出为 HTML 格式
- 导出为 PDF 格式
- 复制为富文本

敬请期待！ 🚀
