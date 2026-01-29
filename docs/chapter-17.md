# Chapter 17: 富文本增强功能

## 本章目标

在本章中，我们将为编辑器添加更多高级功能，让它成为一个功能完整的富文本编辑器：

1. **表格支持**：插入和编辑表格
2. **图片上传**：本地图片上传和显示
3. **任务列表**：可勾选的待办事项
4. **代码高亮**：为代码块添加语法高亮

这些功能将大大提升编辑器的实用性和专业性。

---

## 理论知识

### 1. 表格编辑器

#### 1.1 表格的复杂性

表格是富文本编辑器中最复杂的功能之一：
- **结构复杂**：行、列、单元格的嵌套关系
- **操作多样**：插入/删除行列、合并单元格、调整大小
- **光标处理**：单元格间的导航和选择

#### 1.2 Tiptap Table 扩展

Tiptap 提供了完整的表格支持：
- `@tiptap/extension-table` - 表格容器
- `@tiptap/extension-table-row` - 表格行
- `@tiptap/extension-table-cell` - 表格单元格
- `@tiptap/extension-table-header` - 表格表头

### 2. 图片处理

#### 2.1 图片上传流程

```
用户选择图片 → 读取文件 → 转换为 Base64/上传服务器 → 插入编辑器
```

#### 2.2 图片存储方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| Base64 | 简单，无需服务器 | 文件大，影响性能 |
| 服务器存储 | 性能好，可管理 | 需要后端支持 |
| CDN | 速度快，稳定 | 成本高 |

本章我们使用 Base64 方案（简单演示），生产环境建议使用服务器存储。

### 3. 任务列表

#### 3.1 任务列表的特点

- 可勾选的复选框
- 保存勾选状态
- 支持嵌套
- 协同编辑时状态同步

#### 3.2 数据结构

```json
{
  "type": "taskList",
  "content": [
    {
      "type": "taskItem",
      "attrs": { "checked": true },
      "content": [{ "type": "paragraph", "content": [...] }]
    }
  ]
}
```

### 4. 代码高亮

#### 4.1 语法高亮原理

使用 Prism.js 或 highlight.js 进行语法分析和着色：

```typescript
import { lowlight } from 'lowlight'

// 注册语言
import javascript from 'highlight.js/lib/languages/javascript'
lowlight.registerLanguage('javascript', javascript)

// 高亮代码
const html = lowlight.highlight('javascript', code).value
```


---

## 实现步骤

### 步骤 1：安装依赖

安装所需的 Tiptap 扩展和相关库：

```bash
cd client
pnpm add @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-image @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-code-block-lowlight lowlight
```

### 步骤 2：配置代码高亮

创建 `client/src/utils/lowlight.ts`：

```typescript
/**
 * 代码高亮配置
 */

import { lowlight } from 'lowlight'

// 导入常用语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'

// 注册语言
lowlight.registerLanguage('javascript', javascript)
lowlight.registerLanguage('typescript', typescript)
lowlight.registerLanguage('python', python)
lowlight.registerLanguage('java', java)
lowlight.registerLanguage('cpp', cpp)
lowlight.registerLanguage('css', css)
lowlight.registerLanguage('html', html)
lowlight.registerLanguage('json', json)
lowlight.registerLanguage('markdown', markdown)
lowlight.registerLanguage('bash', bash)
lowlight.registerLanguage('sql', sql)
lowlight.registerLanguage('go', go)
lowlight.registerLanguage('rust', rust)

export { lowlight }
```

### 步骤 3：更新编辑器配置

更新 `client/src/components/editor/TiptapEditor.tsx`，添加新扩展：

```typescript
// 添加导入
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from '../../utils/lowlight'

// 在 extensions 数组中添加
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // 禁用默认的 CodeBlock，使用带高亮的版本
      codeBlock: false,
    }),
    
    // ... 其他扩展
    
    // 表格
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    
    // 图片
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    
    // 任务列表
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    
    // 代码高亮
    CodeBlockLowlight.configure({
      lowlight,
    }),
  ],
  // ... 其他配置
})
```

### 步骤 4：更新工具栏

更新 `client/src/components/editor/MenuBar.tsx`，添加新功能按钮：


```typescript
// 在工具栏中添加新按钮

{/* 表格 */}
<button
  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
  className={`p-2 rounded hover:bg-gray-100 ${
    editor.isActive('table') ? 'bg-gray-200' : ''
  }`}
  title="插入表格"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
</button>

{/* 图片 */}
<button
  onClick={() => {
    const url = window.prompt('请输入图片 URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }}
  className="p-2 rounded hover:bg-gray-100"
  title="插入图片"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
</button>

{/* 任务列表 */}
<button
  onClick={() => editor.chain().focus().toggleTaskList().run()}
  className={`p-2 rounded hover:bg-gray-100 ${
    editor.isActive('taskList') ? 'bg-gray-200' : ''
  }`}
  title="任务列表"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
</button>
```

### 步骤 5：创建图片上传组件

创建 `client/src/components/editor/ImageUpload.tsx`：

```typescript
/**
 * 图片上传组件
 */

import { useRef } from 'react'
import type { Editor } from '@tiptap/core'

interface ImageUploadProps {
  editor: Editor
}

function ImageUpload({ editor }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // 检查文件大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }

    // 读取文件并转换为 Base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      editor.chain().focus().setImage({ src: base64 }).run()
    }
    reader.readAsDataURL(file)

    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded hover:bg-gray-100"
        title="上传图片"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
    </>
  )
}

export default ImageUpload
```

### 步骤 6：创建表格操作菜单

创建 `client/src/components/editor/TableMenu.tsx`：

```typescript
/**
 * 表格操作菜单
 */

import type { Editor } from '@tiptap/core'

interface TableMenuProps {
  editor: Editor
}

function TableMenu({ editor }: TableMenuProps) {
  if (!editor.isActive('table')) {
    return null
  }

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
      <button
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        ← 插入列
      </button>
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        插入列 →
      </button>
      <button
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        删除列
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      <button
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        ↑ 插入行
      </button>
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        插入行 ↓
      </button>
      <button
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        删除行
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      <button
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="px-2 py-1 text-xs bg-red-50 border border-red-300 text-red-600 rounded hover:bg-red-100"
      >
        删除表格
      </button>
    </div>
  )
}

export default TableMenu
```

### 步骤 7：更新斜杠命令

更新 `client/src/extensions/SlashCommands.ts`，添加新命令：


```typescript
// 在 slashCommandItems 数组中添加

{
  title: '表格',
  description: '插入表格',
  icon: '📊',
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  aliases: ['table', 'biaoge', '表'],
},
{
  title: '图片',
  description: '插入图片',
  icon: '🖼️',
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).run()
    const url = window.prompt('请输入图片 URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  },
  aliases: ['image', 'tupian', '图'],
},
{
  title: '任务列表',
  description: '创建待办事项',
  icon: '☑️',
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).toggleTaskList().run()
  },
  aliases: ['task', 'todo', 'checkbox', '待办', '任务'],
},
```

### 步骤 8：添加样式

在 `client/src/styles/index.css` 中添加表格和任务列表样式：

```css
/* 表格样式 */
.ProseMirror table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 1rem 0;
  overflow: hidden;
}

.ProseMirror td,
.ProseMirror th {
  min-width: 1em;
  border: 2px solid #d1d5db;
  padding: 0.5rem;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

.ProseMirror th {
  font-weight: 700;
  text-align: left;
  background-color: #f3f4f6;
}

.ProseMirror .selectedCell {
  background-color: #dbeafe;
}

.ProseMirror .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: #3b82f6;
  pointer-events: none;
}

/* 任务列表样式 */
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}

.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  margin-left: 0;
}

.ProseMirror ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
}

.ProseMirror ul[data-type="taskList"] li > div {
  flex: 1 1 auto;
}

.ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
  cursor: pointer;
  width: 1rem;
  height: 1rem;
}

/* 图片样式 */
.ProseMirror img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem 0;
  border-radius: 0.5rem;
}

.ProseMirror img.ProseMirror-selectednode {
  outline: 3px solid #3b82f6;
}

/* 代码高亮样式 */
.ProseMirror pre {
  background: #1f2937;
  color: #f3f4f6;
  font-family: 'JetBrainsMono', 'Fira Code', monospace;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

.ProseMirror pre code {
  color: inherit;
  padding: 0;
  background: none;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Highlight.js 主题样式 */
.hljs-comment,
.hljs-quote {
  color: #6b7280;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-addition {
  color: #10b981;
}

.hljs-number,
.hljs-string,
.hljs-meta .hljs-string,
.hljs-literal,
.hljs-doctag,
.hljs-regexp {
  color: #f59e0b;
}

.hljs-title,
.hljs-section,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #3b82f6;
}

.hljs-attribute,
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-class .hljs-title,
.hljs-type {
  color: #8b5cf6;
}

.hljs-symbol,
.hljs-bullet,
.hljs-subst,
.hljs-meta,
.hljs-meta .hljs-keyword,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-link {
  color: #ec4899;
}

.hljs-built_in,
.hljs-deletion {
  color: #ef4444;
}
```

---

## 功能验证

### 1. 测试表格功能

1. 点击工具栏的"插入表格"按钮
2. 应该插入一个 3x3 的表格
3. 测试表格操作：
   - 插入行/列
   - 删除行/列
   - 删除表格
4. 在单元格中输入内容
5. 测试表格在协同编辑中的同步

### 2. 测试图片上传

1. 点击"上传图片"按钮
2. 选择一张图片
3. 图片应该显示在编辑器中
4. 测试图片选择和删除
5. 测试通过 URL 插入图片

### 3. 测试任务列表

1. 点击"任务列表"按钮或输入 `/任务`
2. 创建几个任务项
3. 勾选/取消勾选任务
4. 测试任务状态在协同编辑中的同步
5. 测试嵌套任务列表

### 4. 测试代码高亮

1. 插入代码块
2. 输入不同语言的代码
3. 检查语法高亮是否正确
4. 测试支持的语言：JavaScript、Python、Java 等

---

## 核心知识点

### 1. 表格编辑器实现

#### 1.1 表格数据结构

```json
{
  "type": "table",
  "content": [
    {
      "type": "tableRow",
      "content": [
        { "type": "tableHeader", "content": [...] },
        { "type": "tableHeader", "content": [...] }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        { "type": "tableCell", "content": [...] },
        { "type": "tableCell", "content": [...] }
      ]
    }
  ]
}
```

#### 1.2 表格操作命令

```typescript
// 插入表格
editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()

// 添加行/列
editor.chain().focus().addRowBefore().run()
editor.chain().focus().addColumnAfter().run()

// 删除行/列
editor.chain().focus().deleteRow().run()
editor.chain().focus().deleteColumn().run()

// 合并单元格
editor.chain().focus().mergeCells().run()
editor.chain().focus().splitCell().run()
```

### 2. 图片处理

#### 2.1 Base64 编码

```typescript
const reader = new FileReader()
reader.onload = (e) => {
  const base64 = e.target?.result as string
  // base64: data:image/png;base64,iVBORw0KGgoAAAANS...
}
reader.readAsDataURL(file)
```

#### 2.2 图片优化

```typescript
// 压缩图片
function compressImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
```

### 3. 任务列表实现

#### 3.1 任务项数据结构

```json
{
  "type": "taskItem",
  "attrs": {
    "checked": false
  },
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "任务内容" }]
    }
  ]
}
```

#### 3.2 任务状态切换

```typescript
// 切换任务状态
editor.chain().focus().toggleTaskList().run()

// 设置任务状态
editor.commands.updateAttributes('taskItem', { checked: true })
```

### 4. 代码高亮原理

#### 4.1 Lowlight 工作流程

```
代码文本 → 词法分析 → 语法树 → HTML 标记 → CSS 样式
```

#### 4.2 语言注册

```typescript
import { lowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'

lowlight.registerLanguage('javascript', javascript)
```

---

## 常见问题

### 1. 表格列宽调整不生效

**问题**：拖拽调整列宽时没有反应

**解决方案**：
- 确保 Table 扩展配置了 `resizable: true`
- 检查 CSS 中的 `column-resize-handle` 样式
- 确保表格使用 `table-layout: fixed`

### 2. 图片上传后不显示

**问题**：选择图片后编辑器中没有显示

**解决方案**：
- 检查 Image 扩展配置 `allowBase64: true`
- 检查文件读取是否成功
- 检查 Base64 字符串格式是否正确

### 3. 任务列表复选框无法点击

**问题**：复选框显示但无法勾选

**解决方案**：
- 检查 TaskItem 配置
- 确保 CSS 中没有 `pointer-events: none`
- 检查是否有其他元素遮挡

### 4. 代码高亮不生效

**问题**：代码块没有语法高亮

**解决方案**：
- 确保语言已注册到 lowlight
- 检查 CSS 样式是否正确加载
- 确保使用 CodeBlockLowlight 而不是默认 CodeBlock

---

## 扩展功能

### 1. 图片服务器上传

```typescript
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
  
  const data = await response.json()
  return data.url
}
```

### 2. 表格导出为 CSV

```typescript
function exportTableToCSV(editor: Editor) {
  const { state } = editor
  const { selection } = state
  const table = findParentNode((node) => node.type.name === 'table')(selection)
  
  if (!table) return
  
  const rows: string[][] = []
  table.node.forEach((row) => {
    const cells: string[] = []
    row.forEach((cell) => {
      cells.push(cell.textContent)
    })
    rows.push(cells)
  })
  
  const csv = rows.map((row) => row.join(',')).join('\n')
  downloadFile(csv, 'table.csv', 'text/csv')
}
```

### 3. 代码块语言选择器

```typescript
function CodeBlockLanguageSelector({ editor }: { editor: Editor }) {
  const languages = ['javascript', 'typescript', 'python', 'java', 'cpp']
  
  return (
    <select
      onChange={(e) => {
        editor.chain().focus().updateAttributes('codeBlock', {
          language: e.target.value,
        }).run()
      }}
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>{lang}</option>
      ))}
    </select>
  )
}
```

---

## 性能优化

### 1. 图片懒加载

```typescript
Image.configure({
  HTMLAttributes: {
    loading: 'lazy',
  },
})
```

### 2. 表格虚拟滚动

对于大型表格，使用虚拟滚动优化性能：

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'
```

### 3. 代码高亮缓存

```typescript
const highlightCache = new Map<string, string>()

function getCachedHighlight(code: string, language: string): string {
  const key = `${language}:${code}`
  if (highlightCache.has(key)) {
    return highlightCache.get(key)!
  }
  const result = lowlight.highlight(language, code).value
  highlightCache.set(key, result)
  return result
}
```

---

## 面试考点

### 1. 表格编辑器实现

**问题**：如何实现一个表格编辑器？

**答案**：
- 使用嵌套的数据结构表示表格
- 实现行列的增删改操作
- 处理单元格合并和拆分
- 实现光标在单元格间的导航
- 支持拖拽调整列宽

### 2. 图片上传方案

**问题**：图片上传有哪些方案？各有什么优缺点？

**答案**：
- Base64：简单但文件大
- 服务器存储：性能好但需要后端
- CDN：速度快但成本高
- 对象存储（OSS）：推荐的生产方案

### 3. 语法高亮原理

**问题**：语法高亮是如何实现的？

**答案**：
- 词法分析：将代码分解为 token
- 语法分析：识别语言结构
- 生成 HTML：为不同 token 添加标记
- CSS 样式：为不同类型的 token 着色

---

## 本章小结

在本章中，我们实现了：

1. ✅ **表格支持**
   - 插入和编辑表格
   - 行列操作
   - 表格菜单

2. ✅ **图片上传**
   - 本地文件上传
   - Base64 编码
   - 图片显示和选择

3. ✅ **任务列表**
   - 可勾选的复选框
   - 任务状态同步
   - 嵌套支持

4. ✅ **代码高亮**
   - 多语言支持
   - 语法着色
   - 自定义主题

这些功能让编辑器更加专业和实用，满足了大部分富文本编辑需求。

---

## 下一章预告

在下一章中，我们将实现：

**Chapter 18: 文档历史版本**
- 版本快照
- 版本对比
- 版本恢复

敬请期待！ 🚀
