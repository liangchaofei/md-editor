# Chapter 10: 编辑器样式优化

## 本章目标

优化编辑器的样式和用户体验：
- ✅ 占位符提示
- ✅ 字数统计
- ✅ 自动保存指示器
- ✅ 编辑器状态栏
- ✅ 优化排版样式
- ✅ 焦点管理

**学习重点：**
- Tiptap 扩展系统
- 用户体验优化
- 状态管理
- CSS 样式定制

---

## 一、占位符提示

### 1.1 安装 Placeholder 扩展

```bash
pnpm --filter client add @tiptap/extension-placeholder
```

### 1.2 配置 Placeholder

在 `TiptapEditor.tsx` 中：

```typescript
import Placeholder from '@tiptap/extension-placeholder'

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: '开始输入内容...',
    }),
  ],
})
```

### 1.3 占位符样式

在 `index.css` 中添加样式：

```css
.ProseMirror p.is-editor-empty:first-child::before {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
```

**关键点：**
- `is-editor-empty` 类由 Placeholder 扩展自动添加
- `data-placeholder` 属性包含占位符文本
- `pointer-events: none` 确保占位符不会阻止点击

---

## 二、字数统计

### 2.1 安装 CharacterCount 扩展

```bash
pnpm --filter client add @tiptap/extension-character-count
```

### 2.2 配置 CharacterCount

```typescript
import CharacterCount from '@tiptap/extension-character-count'

const editor = useEditor({
  extensions: [
    StarterKit,
    CharacterCount,
  ],
})
```

### 2.3 获取字数统计

```typescript
// 获取字数
const wordCount = editor.storage.characterCount?.words() || 0

// 获取字符数
const charCount = editor.storage.characterCount?.characters() || 0
```

**CharacterCount 提供的方法：**
- `characters()` - 字符数（包括空格）
- `words()` - 单词数
- `characters({ node })` - 特定节点的字符数

---

## 三、编辑器状态栏

### 3.1 创建 EditorStatusBar 组件

创建 `client/src/components/editor/EditorStatusBar.tsx`：

```typescript
import type { Editor } from '@tiptap/react'

interface EditorStatusBarProps {
  editor: Editor
  saveStatus: 'saved' | 'saving' | 'unsaved'
}

function EditorStatusBar({ editor, saveStatus }: EditorStatusBarProps) {
  // 计算字数
  const wordCount = editor.storage.characterCount?.words() || 0
  const charCount = editor.storage.characterCount?.characters() || 0

  // 保存状态配置
  const saveStatusConfig = {
    saved: { text: '已保存', color: 'text-green-600' },
    saving: { text: '保存中...', color: 'text-blue-600' },
    unsaved: { text: '未保存', color: 'text-gray-400' },
  }

  const { text: saveText, color: saveColor } = saveStatusConfig[saveStatus]

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-8 py-2 text-sm text-gray-600">
      {/* 左侧：字数统计 */}
      <div className="flex items-center gap-4">
        <span>字数: <span className="font-medium">{wordCount}</span></span>
        <span>字符: <span className="font-medium">{charCount}</span></span>
      </div>

      {/* 右侧：保存状态 */}
      <div className={`flex items-center gap-1 ${saveColor}`}>
        {saveStatus === 'saving' && <SpinnerIcon />}
        {saveStatus === 'saved' && <CheckIcon />}
        <span>{saveText}</span>
      </div>
    </div>
  )
}
```

### 3.2 集成状态栏

在 `TiptapEditor.tsx` 中：

```typescript
interface TiptapEditorProps {
  document: Document
  onUpdate: (content: string) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
}

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // ... 编辑器配置

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 文档标题 */}
      {/* 工具栏 */}
      {/* 编辑器内容 */}
      
      {/* 状态栏 */}
      <EditorStatusBar editor={editor} saveStatus={saveStatus} />
    </div>
  )
}
```

---

## 四、自动保存状态管理

### 4.1 更新 EditorContainer

```typescript
function EditorContainer() {
  const { currentDocument, updateDocument } = useDocumentStore()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // 计算保存状态
  const saveStatus = isSaving ? 'saving' : lastSaved ? 'saved' : 'unsaved'

  return (
    <TiptapEditor
      document={currentDocument}
      onUpdate={handleContentUpdate}
      saveStatus={saveStatus}
    />
  )
}
```

### 4.2 防抖保存的优点

**为什么使用防抖？**
1. **减少服务器请求**：避免每次输入都发送请求
2. **提升性能**：减少不必要的网络开销
3. **更好的用户体验**：不会频繁显示"保存中"状态

**防抖时间选择：**
- 太短（< 1秒）：请求过于频繁
- 太长（> 5秒）：用户可能担心数据丢失
- **推荐：2-3秒** - 平衡性能和用户体验

---

## 五、编辑器样式优化

### 5.1 排版优化

我们在第9章已经优化了大部分样式，这里总结一下关键点：

```css
/* 标题样式 - 清晰的层级 */
.ProseMirror h1 {
  font-size: 2.25rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.2;
}

/* 段落样式 - 舒适的行高 */
.ProseMirror p {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  line-height: 1.75;
}

/* 代码块样式 - 深色主题 */
.ProseMirror pre {
  background-color: #1f2937;
  color: #f3f4f6;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}
```

### 5.2 焦点管理

编辑器的焦点样式：

```css
.ProseMirror {
  outline: none;
}

.ProseMirror:focus {
  outline: none;
}
```

**焦点管理最佳实践：**
1. 移除默认的 outline
2. 使用自定义的焦点指示（如边框颜色变化）
3. 确保键盘导航可用
4. 保持焦点在编辑器内（使用 `onMouseDown` + `preventDefault()`）

---

## 六、用户体验优化总结

### 6.1 视觉反馈

**占位符：**
- 提示用户可以开始输入
- 使用浅灰色，不干扰阅读

**字数统计：**
- 实时显示字数和字符数
- 帮助用户控制文章长度

**保存状态：**
- 明确的保存状态指示
- 使用颜色和图标增强识别

### 6.2 性能优化

**防抖保存：**
- 减少不必要的网络请求
- 提升整体性能

**样式优化：**
- 使用原生 CSS 而不是 Tailwind `@apply`
- 避免 CSS 层级冲突
- 确保样式优先级正确

### 6.3 交互优化

**焦点管理：**
- 工具栏按钮不会导致编辑器失去焦点
- 使用 `onMouseDown` 而不是 `onClick`

**状态同步：**
- 监听编辑器事件，实时更新按钮状态
- 使用 `forceUpdate` 强制组件重新渲染

---

## 七、验证功能

### 7.1 测试步骤

1. **测试占位符**
   - 打开一个空文档
   - 应该看到"开始输入内容..."提示
   - 输入文字后，占位符消失

2. **测试字数统计**
   - 输入一些文字
   - 查看状态栏的字数和字符数
   - 验证数字是否正确

3. **测试自动保存**
   - 输入文字
   - 等待2秒
   - 应该看到"保存中..."然后变成"已保存"

4. **测试保存状态**
   - 输入文字时，状态应该是"未保存"
   - 2秒后变成"保存中..."
   - 保存完成后变成"已保存"

### 7.2 验证清单

- ✅ 占位符正常显示和隐藏
- ✅ 字数统计实时更新
- ✅ 自动保存正常工作
- ✅ 保存状态正确显示
- ✅ 编辑器样式美观
- ✅ 焦点管理正常

---

## 八、常见问题排查

### 8.1 占位符不显示

**问题：** 占位符文本不显示

**解决方案：**
1. 检查 Placeholder 扩展是否正确安装
2. 检查 CSS 样式是否正确应用
3. 确保使用了 `is-editor-empty` 类

### 8.2 字数统计不更新

**问题：** 字数统计不实时更新

**解决方案：**
1. 确保 CharacterCount 扩展已安装
2. 检查是否监听了编辑器事件
3. 使用 `forceUpdate` 强制组件重新渲染

### 8.3 自动保存不工作

**问题：** 内容不会自动保存

**解决方案：**
1. 检查防抖逻辑是否正确
2. 确保 `updateDocument` 函数正常工作
3. 查看浏览器控制台是否有错误

---

## 九、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 占位符提示
- ✅ 字数统计
- ✅ 自动保存指示器
- ✅ 编辑器状态栏
- ✅ 样式优化
- ✅ 焦点管理

### 核心概念
- ✅ Tiptap 扩展系统
- ✅ 防抖优化
- ✅ 状态管理
- ✅ CSS 样式定制
- ✅ 用户体验优化

### 关键技术点

**1. 扩展系统**
- Placeholder 扩展
- CharacterCount 扩展
- 扩展配置和使用

**2. 状态管理**
- 保存状态管理
- 防抖保存
- 状态同步

**3. 样式优化**
- 原生 CSS vs Tailwind
- CSS 优先级
- 排版最佳实践

**4. 用户体验**
- 视觉反馈
- 性能优化
- 交互优化

现在编辑器已经具备完整的基础功能和良好的用户体验！

---

## 十、下一章预告

在下一章（Chapter 11）中，我们将集成 Y.js 实现协同编辑的基础功能。

准备好了吗？让我们继续前进！🚀
