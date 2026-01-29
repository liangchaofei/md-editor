# Chapter 8: Tiptap 编辑器集成

## 本章目标

集成 Tiptap 富文本编辑器：
- ✅ 安装 Tiptap 相关依赖
- ✅ 创建基础编辑器组件
- ✅ 集成 StarterKit 扩展
- ✅ 实现自动保存功能（防抖）
- ✅ 添加保存状态指示器
- ✅ 自定义编辑器样式

**学习重点：**
- Tiptap 架构和原理
- ProseMirror 基础概念
- 编辑器生命周期
- 自动保存实现

---

## 一、Tiptap 简介

### 1.1 什么是 Tiptap？

Tiptap 是一个基于 ProseMirror 的无头富文本编辑器框架，提供了强大的扩展系统和 React 集成。

**核心特点：**
- 基于 ProseMirror（强大的编辑器内核）
- 模块化设计，按需加载
- 完整的 TypeScript 支持
- 丰富的扩展生态
- 支持协同编辑

### 1.2 Tiptap vs 其他编辑器

| 特性 | Tiptap | Slate | Quill | Draft.js |
|------|--------|-------|-------|----------|
| 学习曲线 | 中等 | 较陡 | 简单 | 较陡 |
| 扩展性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 协同编辑 | ✅ 内置 | ✅ 需配置 | ❌ | ❌ |
| 包大小 | 中等 | 小 | 小 | 大 |
| 维护状态 | ✅ 活跃 | ✅ 活跃 | ⚠️ 较少 | ⚠️ 较少 |

### 1.3 Tiptap 架构

```
Tiptap (React 层)
    ↓
ProseMirror (核心层)
    ├── Schema (文档结构定义)
    ├── State (编辑器状态)
    ├── View (视图渲染)
    └── Transform (状态转换)
```

**核心概念：**
- **Document**: 文档树结构
- **Schema**: 定义文档结构规则
- **State**: 编辑器当前状态
- **Transaction**: 状态变更
- **Plugin**: 扩展功能

---

## 二、安装依赖

```bash
cd client
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/pm
```

**依赖说明：**
- `@tiptap/react`: React 集成
- `@tiptap/starter-kit`: 基础扩展包（包含常用功能）
- `@tiptap/pm`: ProseMirror 核心库

**StarterKit 包含的扩展：**
- Bold（加粗）
- Italic（斜体）
- Strike（删除线）
- Code（行内代码）
- Heading（标题）
- Paragraph（段落）
- BulletList（无序列表）
- OrderedList（有序列表）
- Blockquote（引用）
- CodeBlock（代码块）
- HorizontalRule（水平线）
- HardBreak（硬换行）
- History（撤销/重做）

---

## 三、创建基础编辑器

### 3.1 创建 TiptapEditor 组件

创建 `client/src/components/editor/TiptapEditor.tsx`：

```typescript
import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Document } from '../../types/document'

interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
}

function TiptapEditor({ document, onUpdate }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
    ],
    content: document.content,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate(html)
    },
  })

  // 当文档切换时更新编辑器内容
  useEffect(() => {
    if (editor && document.content !== editor.getHTML()) {
      editor.commands.setContent(document.content)
    }
  }, [document.id, document.content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 文档标题 */}
      <div className="border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {document.title}
        </h1>
        <div className="mt-2 text-sm text-gray-500">
          最后更新: {new Date(document.updated_at).toLocaleString('zh-CN')}
        </div>
      </div>

      {/* 编辑器内容 */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapEditor
```

**核心知识点：**

1. **useEditor Hook**
   ```typescript
   const editor = useEditor({
     extensions: [],      // 扩展列表
     content: '',         // 初始内容
     editorProps: {},     // 编辑器属性
     onUpdate: () => {},  // 内容更新回调
   })
   ```

2. **扩展配置**
   ```typescript
   StarterKit.configure({
     heading: {
       levels: [1, 2, 3, 4, 5, 6],  // 支持的标题级别
     },
     history: {
       depth: 100,  // 撤销历史深度
     },
   })
   ```

3. **编辑器命令**
   ```typescript
   editor.commands.setContent(content)  // 设置内容
   editor.getHTML()                     // 获取 HTML
   editor.getText()                     // 获取纯文本
   editor.getJSON()                     // 获取 JSON
   ```

4. **文档切换处理**
   - 使用 `useEffect` 监听文档变化
   - 比较内容避免不必要的更新
   - 依赖 `document.id` 确保切换文档时更新

---

## 四、实现自动保存

### 4.1 创建 EditorContainer 组件

创建 `client/src/components/editor/EditorContainer.tsx`：

```typescript
import { useEffect, useState, useCallback, useRef } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import TiptapEditor from './TiptapEditor'

function EditorContainer() {
  const { currentDocument, updateDocument } = useDocumentStore()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 自动保存函数（防抖）
  const handleContentUpdate = useCallback(
    (content: string) => {
      if (!currentDocument) return

      // 清除之前的定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // 设置新的定时器（2秒后保存）
      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true)
        try {
          await updateDocument(currentDocument.id, { content })
          setLastSaved(new Date())
        } catch (error) {
          console.error('保存失败:', error)
        } finally {
          setIsSaving(false)
        }
      }, 2000)
    },
    [currentDocument, updateDocument]
  )

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  if (!currentDocument) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            选择或创建一个文档
          </h3>
          <p className="text-sm text-gray-500">
            从左侧列表选择文档，或点击"新建文档"按钮开始编辑
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* 保存状态指示器 */}
      <div className="absolute right-4 top-4 z-10">
        {isSaving ? (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <svg className="h-4 w-4 animate-spin">
              {/* 加载图标 */}
            </svg>
            保存中...
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <svg className="h-4 w-4">
              {/* 对勾图标 */}
            </svg>
            已保存
          </div>
        ) : null}
      </div>

      {/* 编辑器 */}
      <TiptapEditor
        document={currentDocument}
        onUpdate={handleContentUpdate}
      />
    </div>
  )
}

export default EditorContainer
```

**自动保存实现要点：**

1. **防抖策略**
   - 用户停止输入 2 秒后才保存
   - 避免频繁的网络请求
   - 减轻服务器压力

2. **useRef 存储定时器**
   ```typescript
   const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
   
   // 清除旧定时器
   if (saveTimerRef.current) {
     clearTimeout(saveTimerRef.current)
   }
   
   // 设置新定时器
   saveTimerRef.current = setTimeout(() => {
     save()
   }, 2000)
   ```

3. **清理副作用**
   ```typescript
   useEffect(() => {
     return () => {
       // 组件卸载时清除定时器
       if (saveTimerRef.current) {
         clearTimeout(saveTimerRef.current)
       }
     }
   }, [])
   ```

4. **保存状态反馈**
   - 保存中：蓝色背景 + 旋转图标
   - 已保存：绿色背景 + 对勾图标
   - 提升用户体验

---

## 五、自定义编辑器样式

修改 `client/src/styles/index.css`：

```css
/* Tiptap 编辑器样式 */
@layer components {
  /* 编辑器基础样式 */
  .ProseMirror {
    @apply focus:outline-none;
  }

  /* 标题样式 */
  .ProseMirror h1 {
    @apply text-4xl font-bold mt-8 mb-4;
  }

  .ProseMirror h2 {
    @apply text-3xl font-bold mt-6 mb-3;
  }

  .ProseMirror h3 {
    @apply text-2xl font-bold mt-5 mb-2;
  }

  /* 段落样式 */
  .ProseMirror p {
    @apply my-3 leading-7;
  }

  /* 列表样式 */
  .ProseMirror ul {
    @apply list-disc list-inside my-4 space-y-2;
  }

  .ProseMirror ol {
    @apply list-decimal list-inside my-4 space-y-2;
  }

  /* 代码样式 */
  .ProseMirror code {
    @apply bg-gray-100 rounded px-1.5 py-0.5 text-sm font-mono text-red-600;
  }

  .ProseMirror pre {
    @apply bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto;
  }

  /* 引用样式 */
  .ProseMirror blockquote {
    @apply border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700;
  }
}
```

**样式设计原则：**
- 使用 Tailwind 工具类
- 保持一致的间距
- 清晰的视觉层次
- 良好的可读性

---

## 六、面试考点

### 6.1 Tiptap 原理

**Q: Tiptap 和 ProseMirror 的关系？**

A: Tiptap 是基于 ProseMirror 的上层封装：

```
应用层 (React 组件)
    ↓
Tiptap (扩展系统 + React 集成)
    ↓
ProseMirror (编辑器核心)
    ↓
DOM (浏览器)
```

**Q: ProseMirror 的核心概念？**

A:
1. **Document**: 不可变的文档树
2. **Schema**: 定义文档结构
3. **State**: 编辑器状态（文档 + 选区 + 插件状态）
4. **Transaction**: 状态变更
5. **View**: 渲染和交互

**Q: 为什么编辑器内容是不可变的？**

A:
- 便于实现撤销/重做
- 支持协同编辑
- 更容易追踪变更
- 避免副作用

### 6.2 自动保存实现

**Q: 自动保存的几种策略？**

A:
1. **定时保存**
   ```typescript
   setInterval(() => {
     save()
   }, 30000)  // 每 30 秒保存
   ```

2. **防抖保存**（本项目使用）
   ```typescript
   const debouncedSave = debounce(save, 2000)
   editor.on('update', debouncedSave)
   ```

3. **节流保存**
   ```typescript
   const throttledSave = throttle(save, 5000)
   editor.on('update', throttledSave)
   ```

4. **混合策略**
   - 防抖 + 定时：既响应用户操作，又保证定期保存
   - 防抖 + 离开页面：确保数据不丢失

**Q: 如何处理保存失败？**

A:
```typescript
try {
  await save(content)
  setStatus('saved')
} catch (error) {
  setStatus('error')
  // 重试机制
  retryCount++
  if (retryCount < 3) {
    setTimeout(() => save(content), 1000 * retryCount)
  } else {
    // 本地存储
    localStorage.setItem('draft', content)
    showError('保存失败，已保存到本地')
  }
}
```

### 6.3 编辑器性能优化

**Q: 如何优化大文档的编辑性能？**

A:
1. **虚拟滚动**
   - 只渲染可见区域
   - 减少 DOM 节点数量

2. **延迟渲染**
   ```typescript
   editor.setOptions({
     editorProps: {
       handleDOMEvents: {
         scroll: debounce(() => {
           // 延迟渲染
         }, 100)
       }
     }
   })
   ```

3. **分块加载**
   - 大文档分成多个小块
   - 按需加载和渲染

4. **优化扩展**
   - 只加载必要的扩展
   - 禁用不需要的功能

**Q: 如何避免内存泄漏？**

A:
```typescript
useEffect(() => {
  const editor = new Editor({...})
  
  return () => {
    // 清理编辑器实例
    editor.destroy()
  }
}, [])
```

---

## 七、验证功能

### 7.1 测试步骤

1. **测试基础编辑**
   - 选择一个文档
   - 输入文字
   - 应该能正常编辑

2. **测试格式化**
   - 输入 `# 标题` 然后空格，应该变成 H1
   - 输入 `## 标题` 然后空格，应该变成 H2
   - 输入 `- 列表项` 然后空格，应该变成无序列表
   - 输入 `1. 列表项` 然后空格，应该变成有序列表

3. **测试自动保存**
   - 编辑内容
   - 停止输入 2 秒
   - 应该看到"保存中..."提示
   - 然后变成"已保存"

4. **测试文档切换**
   - 编辑文档 A
   - 切换到文档 B
   - 应该显示文档 B 的内容
   - 切换回文档 A
   - 应该保留之前的编辑

5. **测试刷新页面**
   - 编辑内容并等待保存
   - 刷新页面
   - 内容应该保留

### 7.2 验证清单

- ✅ 编辑器正常显示
- ✅ 可以输入和编辑文字
- ✅ 标题格式化正常
- ✅ 列表格式化正常
- ✅ 自动保存功能正常
- ✅ 保存状态指示正确
- ✅ 文档切换正常
- ✅ 内容持久化正常
- ✅ 样式显示正确
- ✅ 滚动流畅

---

## 八、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ Tiptap 编辑器集成
- ✅ StarterKit 扩展配置
- ✅ 自动保存功能
- ✅ 保存状态指示
- ✅ 自定义样式

### 核心概念
- ✅ Tiptap 架构原理
- ✅ ProseMirror 基础
- ✅ 编辑器生命周期
- ✅ 自动保存策略

### 最佳实践
- ✅ 防抖优化保存
- ✅ 清理副作用
- ✅ 用户体验优化
- ✅ 样式定制

---

## 九、下一章预告

在下一章（Chapter 9）中，我们将：

1. **实现编辑器工具栏**
   - 浮动工具栏
   - 格式化按钮
   - 标题选择器

2. **添加更多格式化功能**
   - 加粗、斜体、下划线
   - 删除线、代码
   - 链接插入

3. **工具栏交互优化**
   - 选中文字显示工具栏
   - 按钮状态同步
   - 快捷键支持

准备好了吗？让我们继续前进！🚀
