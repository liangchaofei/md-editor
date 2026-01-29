# Chapter 16: 文档导出功能

## 本章目标

在本章中，我们将为编辑器添加文档导出功能，让用户可以将编辑的内容导出为不同格式：

1. **导出为 Markdown**：将富文本转换为 Markdown 格式
2. **导出为 HTML**：导出完整的 HTML 文件
3. **导出为纯文本**：去除所有格式，只保留文本
4. **复制为富文本**：复制到剪贴板，可粘贴到其他应用
5. **打印功能**：优化打印样式

这些功能将大大提升编辑器的实用性，让用户可以在不同场景下使用编辑的内容。

---

## 理论知识

### 1. 内容序列化

#### 1.1 什么是序列化

序列化是将编辑器的内部数据结构转换为其他格式的过程：

```
ProseMirror Document → Markdown
ProseMirror Document → HTML
ProseMirror Document → Plain Text
```

#### 1.2 Tiptap 的序列化机制

Tiptap 提供了多种序列化方法：

```typescript
// 获取 HTML
const html = editor.getHTML()

// 获取 JSON
const json = editor.getJSON()

// 获取纯文本
const text = editor.getText()
```

### 2. Markdown 导出

#### 2.1 为什么需要 Markdown

Markdown 是一种轻量级标记语言：
- **可读性强**：纯文本格式，易于阅读和编辑
- **通用性好**：被广泛支持（GitHub、博客平台等）
- **版本控制友好**：适合 Git 管理
- **跨平台**：可在任何文本编辑器中打开

#### 2.2 Markdown 序列化原理

将 ProseMirror 节点转换为 Markdown 语法：

| 节点类型 | Markdown 语法 |
|---------|--------------|
| 标题 1 | `# 标题` |
| 标题 2 | `## 标题` |
| 加粗 | `**文本**` |
| 斜体 | `*文本*` |
| 链接 | `[文本](url)` |
| 代码块 | ` ```语言\n代码\n``` ` |
| 无序列表 | `- 项目` |
| 有序列表 | `1. 项目` |


### 3. 文件下载实现

#### 3.1 Blob 和 URL.createObjectURL

```typescript
// 创建 Blob 对象
const blob = new Blob([content], { type: 'text/markdown' })

// 创建下载链接
const url = URL.createObjectURL(blob)

// 触发下载
const link = document.createElement('a')
link.href = url
link.download = 'document.md'
link.click()

// 释放 URL
URL.revokeObjectURL(url)
```

#### 3.2 MIME 类型

不同格式对应不同的 MIME 类型：

| 格式 | MIME 类型 |
|------|----------|
| Markdown | `text/markdown` |
| HTML | `text/html` |
| 纯文本 | `text/plain` |
| JSON | `application/json` |

### 4. 剪贴板 API

#### 4.1 Clipboard API

现代浏览器提供了 Clipboard API：

```typescript
// 复制纯文本
await navigator.clipboard.writeText(text)

// 复制富文本（HTML）
const clipboardItem = new ClipboardItem({
  'text/html': new Blob([html], { type: 'text/html' }),
  'text/plain': new Blob([text], { type: 'text/plain' })
})
await navigator.clipboard.write([clipboardItem])
```

#### 4.2 兼容性处理

对于不支持 Clipboard API 的浏览器，使用传统方法：

```typescript
// 创建临时 textarea
const textarea = document.createElement('textarea')
textarea.value = text
document.body.appendChild(textarea)
textarea.select()
document.execCommand('copy')
document.body.removeChild(textarea)
```

### 5. 打印功能

#### 5.1 打印样式优化

使用 `@media print` 优化打印样式：

```css
@media print {
  /* 隐藏不需要打印的元素 */
  .no-print {
    display: none !important;
  }
  
  /* 优化页面边距 */
  @page {
    margin: 2cm;
  }
  
  /* 避免分页断行 */
  h1, h2, h3 {
    page-break-after: avoid;
  }
}
```

---

## 实现步骤

### 步骤 1：安装依赖

我们需要安装 Markdown 序列化库：

```bash
cd client
pnpm add prosemirror-markdown
```

### 步骤 2：创建导出工具函数

创建 `client/src/utils/export.ts`：


```typescript
/**
 * 文档导出工具函数
 */

import type { Editor } from '@tiptap/core'
import { defaultMarkdownSerializer } from 'prosemirror-markdown'

/**
 * 导出为 Markdown
 */
export function exportAsMarkdown(editor: Editor, filename: string = 'document.md') {
  // 获取 ProseMirror 文档
  const doc = editor.state.doc
  
  // 序列化为 Markdown
  const markdown = defaultMarkdownSerializer.serialize(doc)
  
  // 下载文件
  downloadFile(markdown, filename, 'text/markdown')
}

/**
 * 导出为 HTML
 */
export function exportAsHTML(editor: Editor, filename: string = 'document.html') {
  // 获取 HTML 内容
  const content = editor.getHTML()
  
  // 创建完整的 HTML 文档
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename.replace('.html', '')}</title>
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    code {
      background-color: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: monospace;
    }
    pre {
      background-color: #f5f5f5;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`
  
  // 下载文件
  downloadFile(html, filename, 'text/html')
}

/**
 * 导出为纯文本
 */
export function exportAsText(editor: Editor, filename: string = 'document.txt') {
  // 获取纯文本内容
  const text = editor.getText()
  
  // 下载文件
  downloadFile(text, filename, 'text/plain')
}

/**
 * 复制为富文本
 */
export async function copyAsRichText(editor: Editor): Promise<boolean> {
  try {
    const html = editor.getHTML()
    const text = editor.getText()
    
    // 尝试使用 Clipboard API
    if (navigator.clipboard && ClipboardItem) {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })
      await navigator.clipboard.write([clipboardItem])
      return true
    }
    
    // 降级方案：只复制纯文本
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

/**
 * 复制为纯文本
 */
export async function copyAsText(editor: Editor): Promise<boolean> {
  try {
    const text = editor.getText()
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    
    // 降级方案：使用 execCommand
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch (e) {
      return false
    }
  }
}

/**
 * 打印文档
 */
export function printDocument(editor: Editor) {
  // 创建打印窗口
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器设置')
    return
  }
  
  const content = editor.getHTML()
  
  // 写入打印内容
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>打印文档</title>
      <style>
        body {
          max-width: 800px;
          margin: 0 auto;
          padding: 2cm;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          page-break-after: avoid;
        }
        code {
          background-color: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
        }
        pre {
          background-color: #f5f5f5;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          page-break-inside: avoid;
        }
        blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          color: #666;
          page-break-inside: avoid;
        }
        @media print {
          body {
            padding: 0;
          }
          @page {
            margin: 2cm;
          }
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `)
  
  printWindow.document.close()
  
  // 等待内容加载后打印
  printWindow.onload = () => {
    printWindow.print()
    printWindow.onafterprint = () => {
      printWindow.close()
    }
  }
}

/**
 * 下载文件的通用函数
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  // 创建 Blob
  const blob = new Blob([content], { type: mimeType })
  
  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  
  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

### 步骤 3：创建导出菜单组件

创建 `client/src/components/editor/ExportMenu.tsx`：


```typescript
/**
 * 导出菜单组件
 */

import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import {
  exportAsMarkdown,
  exportAsHTML,
  exportAsText,
  copyAsRichText,
  copyAsText,
  printDocument,
} from '../../utils/export'

interface ExportMenuProps {
  editor: Editor
  documentTitle: string
}

function ExportMenu({ editor, documentTitle }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const handleExportMarkdown = () => {
    exportAsMarkdown(editor, `${documentTitle}.md`)
    setIsOpen(false)
  }

  const handleExportHTML = () => {
    exportAsHTML(editor, `${documentTitle}.html`)
    setIsOpen(false)
  }

  const handleExportText = () => {
    exportAsText(editor, `${documentTitle}.txt`)
    setIsOpen(false)
  }

  const handleCopyRichText = async () => {
    const success = await copyAsRichText(editor)
    if (success) {
      setCopySuccess('富文本已复制到剪贴板')
      setTimeout(() => setCopySuccess(null), 2000)
    }
    setIsOpen(false)
  }

  const handleCopyText = async () => {
    const success = await copyAsText(editor)
    if (success) {
      setCopySuccess('纯文本已复制到剪贴板')
      setTimeout(() => setCopySuccess(null), 2000)
    }
    setIsOpen(false)
  }

  const handlePrint = () => {
    printDocument(editor)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* 导出按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        导出
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 菜单内容 */}
          <div className="absolute right-0 z-20 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200">
            <div className="py-1">
              {/* 导出为文件 */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                导出为文件
              </div>
              
              <button
                onClick={handleExportMarkdown}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📝</span>
                Markdown (.md)
              </button>

              <button
                onClick={handleExportHTML}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">🌐</span>
                HTML (.html)
              </button>

              <button
                onClick={handleExportText}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📄</span>
                纯文本 (.txt)
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* 复制到剪贴板 */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                复制到剪贴板
              </div>

              <button
                onClick={handleCopyRichText}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📋</span>
                复制富文本
              </button>

              <button
                onClick={handleCopyText}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">📝</span>
                复制纯文本
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* 打印 */}
              <button
                onClick={handlePrint}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-3">🖨️</span>
                打印文档
              </button>
            </div>
          </div>
        </>
      )}

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-green-500 text-white rounded-md shadow-lg">
          {copySuccess}
        </div>
      )}
    </div>
  )
}

export default ExportMenu
```

### 步骤 4：集成到编辑器

更新 `client/src/components/editor/TiptapEditor.tsx`，在标题区域添加导出按钮：


```typescript
// 在文件顶部添加导入
import ExportMenu from './ExportMenu'

// 在文档标题区域添加导出按钮
<div className="border-b border-gray-200 px-8 py-6">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <h1 className="text-3xl font-bold text-gray-900">
        {document.title}
      </h1>
      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
        <span>
          最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
        </span>
      </div>
    </div>
    
    <div className="flex flex-col items-end gap-3">
      {/* 导出按钮 */}
      <ExportMenu editor={editor} documentTitle={document.title} />
      
      {/* 连接状态指示器 */}
      <ConnectionStatus provider={provider} />
      
      {/* 在线用户列表 */}
      <OnlineUsers provider={provider} />
    </div>
  </div>
</div>
```

---

## 功能验证

### 1. 测试导出功能

启动开发服务器：

```bash
# 启动后端
cd server
pnpm dev

# 启动前端
cd client
pnpm dev
```

打开浏览器，测试以下功能：

#### 1.1 导出为 Markdown

1. 在编辑器中输入一些内容（标题、列表、加粗等）
2. 点击"导出"按钮
3. 选择"Markdown (.md)"
4. 应该下载一个 `.md` 文件
5. 用文本编辑器打开，检查格式是否正确

#### 1.2 导出为 HTML

1. 点击"导出"按钮
2. 选择"HTML (.html)"
3. 应该下载一个 `.html` 文件
4. 用浏览器打开，检查样式是否正确

#### 1.3 导出为纯文本

1. 点击"导出"按钮
2. 选择"纯文本 (.txt)"
3. 应该下载一个 `.txt` 文件
4. 打开检查是否只包含纯文本

#### 1.4 复制功能

1. 点击"导出"按钮
2. 选择"复制富文本"
3. 应该看到"富文本已复制到剪贴板"提示
4. 粘贴到 Word 或其他富文本编辑器，检查格式是否保留

#### 1.5 打印功能

1. 点击"导出"按钮
2. 选择"打印文档"
3. 应该打开打印预览窗口
4. 检查打印样式是否合适

---

## 核心知识点

### 1. ProseMirror 序列化

#### 1.1 序列化器

ProseMirror 使用序列化器将文档转换为其他格式：

```typescript
import { defaultMarkdownSerializer } from 'prosemirror-markdown'

// 序列化为 Markdown
const markdown = defaultMarkdownSerializer.serialize(doc)
```

#### 1.2 自定义序列化

可以自定义序列化规则：

```typescript
const customSerializer = new MarkdownSerializer({
  // 节点序列化规则
  nodes: {
    heading: (state, node) => {
      state.write('#'.repeat(node.attrs.level) + ' ')
      state.renderInline(node)
      state.closeBlock(node)
    },
  },
  // 标记序列化规则
  marks: {
    bold: {
      open: '**',
      close: '**',
      mixable: true,
    },
  },
})
```

### 2. Blob 和文件下载

#### 2.1 Blob 对象

Blob（Binary Large Object）表示二进制数据：

```typescript
const blob = new Blob([content], { type: 'text/plain' })
```

#### 2.2 URL.createObjectURL

创建临时 URL 指向 Blob：

```typescript
const url = URL.createObjectURL(blob)
// url: blob:http://localhost:5173/xxx-xxx-xxx

// 使用完后释放
URL.revokeObjectURL(url)
```

### 3. Clipboard API

#### 3.1 写入剪贴板

```typescript
// 写入纯文本
await navigator.clipboard.writeText(text)

// 写入多种格式
const item = new ClipboardItem({
  'text/html': new Blob([html], { type: 'text/html' }),
  'text/plain': new Blob([text], { type: 'text/plain' })
})
await navigator.clipboard.write([item])
```

#### 3.2 权限处理

Clipboard API 需要用户授权：

```typescript
const permission = await navigator.permissions.query({ 
  name: 'clipboard-write' as PermissionName 
})

if (permission.state === 'granted') {
  // 可以写入剪贴板
}
```

### 4. 打印样式优化

#### 4.1 @media print

```css
@media print {
  /* 隐藏不需要打印的元素 */
  .no-print {
    display: none !important;
  }
  
  /* 优化页面设置 */
  @page {
    margin: 2cm;
    size: A4;
  }
  
  /* 避免分页断行 */
  h1, h2, h3 {
    page-break-after: avoid;
  }
  
  pre, blockquote {
    page-break-inside: avoid;
  }
}
```

---

## 常见问题

### 1. Markdown 导出格式不正确

**问题**：导出的 Markdown 格式不符合预期

**解决方案**：
- 检查 ProseMirror 文档结构
- 自定义序列化规则
- 使用 `prosemirror-markdown` 的配置选项

### 2. 复制富文本失败

**问题**：复制富文本时报错或格式丢失

**解决方案**：
- 检查浏览器是否支持 ClipboardItem
- 使用降级方案（只复制纯文本）
- 检查权限设置

### 3. 打印样式不正确

**问题**：打印时样式显示异常

**解决方案**：
- 使用 `@media print` 优化样式
- 测试不同浏览器的打印效果
- 调整页边距和字体大小

---

## 扩展功能

### 1. 导出为 PDF

可以使用第三方库实现 PDF 导出：

```bash
pnpm add jspdf html2canvas
```

```typescript
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportAsPDF(editor: Editor, filename: string) {
  const element = editor.view.dom
  const canvas = await html2canvas(element)
  const imgData = canvas.toDataURL('image/png')
  
  const pdf = new jsPDF()
  pdf.addImage(imgData, 'PNG', 0, 0)
  pdf.save(filename)
}
```

### 2. 导出为 Word

可以使用 `docx` 库：

```bash
pnpm add docx
```

### 3. 批量导出

支持导出多个文档：

```typescript
export async function exportMultipleDocuments(
  documents: Document[],
  format: 'markdown' | 'html' | 'text'
) {
  for (const doc of documents) {
    // 导出每个文档
  }
}
```

---

## 性能优化

### 1. 大文档导出优化

对于大文档，使用流式处理：

```typescript
function* serializeInChunks(doc: Node) {
  // 分块序列化
  for (let i = 0; i < doc.childCount; i++) {
    yield serializeNode(doc.child(i))
  }
}
```

### 2. 缓存序列化结果

```typescript
const cache = new Map<string, string>()

function getCachedMarkdown(doc: Node): string {
  const key = JSON.stringify(doc.toJSON())
  if (cache.has(key)) {
    return cache.get(key)!
  }
  const markdown = serialize(doc)
  cache.set(key, markdown)
  return markdown
}
```

---

## 面试考点

### 1. 序列化和反序列化

**问题**：什么是序列化？为什么需要序列化？

**答案**：
- 序列化是将数据结构转换为可存储/传输格式的过程
- 用于数据持久化、网络传输、格式转换
- 反序列化是将序列化数据还原为原始结构

### 2. Blob 和 File

**问题**：Blob 和 File 的区别？

**答案**：
- Blob 是二进制数据的抽象表示
- File 继承自 Blob，增加了文件名和修改时间等元数据
- 都可以用于文件上传和下载

### 3. 剪贴板安全

**问题**：为什么剪贴板操作需要权限？

**答案**：
- 防止恶意网站窃取剪贴板内容
- 保护用户隐私（密码、敏感信息）
- 需要用户交互或明确授权

---

## 本章小结

在本章中，我们实现了：

1. ✅ **Markdown 导出**
   - 使用 prosemirror-markdown 序列化
   - 支持标题、列表、格式化等

2. ✅ **HTML 导出**
   - 生成完整的 HTML 文档
   - 包含样式和元数据

3. ✅ **纯文本导出**
   - 去除所有格式
   - 只保留文本内容

4. ✅ **剪贴板功能**
   - 复制富文本（保留格式）
   - 复制纯文本
   - 兼容性处理

5. ✅ **打印功能**
   - 优化打印样式
   - 支持分页控制

这些功能让编辑器更加实用，用户可以方便地在不同场景下使用编辑的内容。

---

## 下一章预告

在下一章中，我们将实现：

**Chapter 17: 富文本增强功能**
- 表格支持
- 图片上传
- 任务列表
- 代码高亮

敬请期待！ 🚀
