# Chapter 27: AI 对话式文档编辑

## 本章目标

实现 AI 对话式文档编辑功能，这是项目的**核心创新功能**。用户可以通过自然语言描述修改意图，AI 会智能定位并标记修改建议，用户可以选择接受或拒绝。

**核心功能**：
- 用户输入修改意图（如："把第四章节标题改为'涵盖技术领域内容'"）
- AI 分析意图并返回结构化修改建议
- 编辑器中以 diff 方式显示修改（原文删除线 + 新文本绿色高亮）
- Hover 时显示 Tooltip（接受/拒绝按钮）
- 支持流式输出修改内容

**技术亮点**：
- 文本智能匹配算法（支持精确匹配、规范化匹配、模糊匹配）
- 上下文精确定位（通过前后文唯一确定位置）
- Tiptap Mark 扩展（自定义建议标记）
- Diff 展示方式（删除线 + 高亮）
- 流式更新支持

---

## 功能演示

### 使用场景 1：修改标题

**用户输入**：
```
把第四章节标题改为"涵盖技术领域内容"
```

**AI 处理流程**：
1. 分析意图：用户想修改第四章节的标题
2. 定位文本：找到"技术栈介绍"
3. 返回建议：
```json
{
  "reasoning": "用户想修改第四章节标题'技术栈介绍'",
  "changes": [{
    "contextBefore": "## ",
    "targetText": "技术栈介绍",
    "contextAfter": "\n\n本章将介绍...",
    "replacement": "涵盖技术领域内容",
    "description": "修改第四章节标题"
  }]
}
```

**编辑器显示**：
```
## ~~技术栈介绍~~ 涵盖技术领域内容
```
- 原文"技术栈介绍"显示删除线
- 新文本"涵盖技术领域内容"显示绿色高亮
- Hover 时显示接受/拒绝按钮

### 使用场景 2：修改正文

**用户输入**：
```
把"React 18"改为"React 19"
```

**编辑器显示**：
```
前端：~~React 18~~ React 19 + TypeScript + Vite
```

---

## 架构设计

### 整体流程

```
用户输入修改意图
    ↓
AI 分析并返回结构化建议
    ↓
前端解析建议
    ↓
文本匹配算法定位位置
    ↓
在编辑器中标记修改
    ↓
用户 Hover 查看
    ↓
接受/拒绝修改
```

### 核心模块

1. **后端 AI 服务**（`server/src/routes/ai.ts`）
   - `/api/ai/edit` 路由
   - 构建 Prompt 引导 AI 返回结构化数据
   - 流式响应处理

2. **前端 API 客户端**（`client/src/api/ai.ts`）
   - `executeAIEdit` 函数
   - SSE 事件处理
   - 回调函数管理

3. **文本匹配工具**（`client/src/utils/textMatcher.ts`）
   - `findTextWithContext` - 上下文精确定位
   - `smartFindText` - 智能模糊匹配
   - `findTextPosition` - 多策略匹配

4. **Suggestion 扩展**（`client/src/extensions/Suggestion.ts`）
   - 自定义 Mark 扩展
   - 存储建议元数据
   - 提供命令接口

5. **useSuggestions Hook**（`client/src/hooks/useSuggestions.ts`）
   - 管理建议状态
   - 添加/接受/拒绝建议
   - 流式更新支持

6. **SuggestionTooltip 组件**（`client/src/components/editor/SuggestionTooltip.tsx`）
   - 显示操作按钮
   - 定位到建议位置
   - 处理用户交互

---

## 详细实现

### 1. 后端 AI 服务

#### 1.1 Prompt 设计

关键点：
- 明确要求返回 JSON 格式
- 强调只返回一个最相关的修改
- 提供上下文信息（contextBefore/contextAfter）
- 给出示例

```typescript
const systemPrompt = `你是一个专业的文档编辑助手。用户会告诉你要修改文档的哪些部分。

【重要】你必须仔细分析用户意图，只返回用户真正想修改的那一个位置。

【输出格式】你必须返回以下 JSON 格式：
\`\`\`json
{
  "reasoning": "你的分析：用户想修改哪里，为什么是这个位置",
  "changes": [
    {
      "contextBefore": "目标文本前面的文字（10-30个字符）",
      "targetText": "要替换的原文",
      "contextAfter": "目标文本后面的文字（10-30个字符）",
      "replacement": "替换后的文本",
      "description": "修改说明"
    }
  ]
}
\`\`\`

【关键规则】：
1. 仔细分析用户意图，理解用户想修改哪一个位置
2. 如果文档中有多个相同的文本，选择最符合用户意图的那一个
3. 通常用户指的是标题、章节名等重要位置
4. **只返回一个修改**
5. contextBefore 和 contextAfter 必须足够长，能唯一确定位置
6. **必须返回有效的 JSON 格式**
`
```

#### 1.2 JSON 解析

处理 AI 返回的内容：
```typescript
// 累积所有 content 内容
let accumulatedContent = ''

for await (const chunk of stream) {
  const parsed = JSON.parse(chunk)
  
  if (parsed.type === 'reasoning') {
    // 思考过程，转发但不累积
    ctx.res.write(`data: ${chunk}\n\n`)
  } else if (parsed.type === 'content') {
    // 正文内容，累积并转发
    accumulatedContent += parsed.content
    ctx.res.write(`data: ${chunk}\n\n`)
  }
}

// 解析累积的内容为 JSON
let jsonStr = accumulatedContent.trim()

// 移除 markdown 代码块标记
if (jsonStr.startsWith('```json')) {
  jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
}

// 提取 JSON 对象
const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
if (jsonMatch) {
  jsonStr = jsonMatch[0]
}

const result = JSON.parse(jsonStr)

// 发送结构化数据
ctx.res.write(`data: ${JSON.stringify({
  type: 'structured',
  content: result,
})}\n\n`)
```

### 2. 文本匹配算法

#### 2.1 上下文精确定位

最精确的定位方式，通过前后文唯一确定位置：

```typescript
export function findTextWithContext(
  docText: string,
  contextBefore: string,
  targetText: string,
  contextAfter: string
): { from: number; to: number } | null {
  // 1. 尝试精确匹配完整模式
  const fullPattern = contextBefore + targetText + contextAfter
  let index = docText.indexOf(fullPattern)
  
  if (index !== -1) {
    const from = index + contextBefore.length
    const to = from + targetText.length
    return { from, to }
  }
  
  // 2. 尝试只用前文定位
  if (contextBefore) {
    index = docText.indexOf(contextBefore)
    if (index !== -1) {
      const targetStart = index + contextBefore.length
      const targetEnd = targetStart + targetText.length
      const actualTarget = docText.substring(targetStart, targetEnd)
      
      if (actualTarget === targetText) {
        return { from: targetStart, to: targetEnd }
      }
    }
  }
  
  // 3. 尝试只用后文定位
  if (contextAfter) {
    index = docText.indexOf(contextAfter)
    if (index !== -1) {
      const targetEnd = index
      const targetStart = targetEnd - targetText.length
      
      if (targetStart >= 0) {
        const actualTarget = docText.substring(targetStart, targetEnd)
        if (actualTarget === targetText) {
          return { from: targetStart, to: targetEnd }
        }
      }
    }
  }
  
  // 4. 回退到直接查找
  index = docText.indexOf(targetText)
  if (index !== -1) {
    return { from: index, to: index + targetText.length }
  }
  
  return null
}
```

#### 2.2 智能模糊匹配

当精确匹配失败时的备用方案：

```typescript
export function smartFindText(
  docText: string,
  keywords: string
): { from: number; to: number; matchedText: string } | null {
  // 1. 尝试直接查找
  let index = docText.indexOf(keywords)
  if (index !== -1) {
    // 扩展到完整的行
    let from = index
    let to = index + keywords.length
    
    while (from > 0 && docText[from - 1] !== '\n') from--
    while (to < docText.length && docText[to] !== '\n') to++
    
    return { from, to, matchedText: docText.substring(from, to) }
  }
  
  // 2. 尝试规范化后查找
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
  const normalizedDoc = normalize(docText)
  const normalizedKeywords = normalize(keywords)
  
  index = normalizedDoc.indexOf(normalizedKeywords)
  if (index !== -1) {
    // 映射回原文档位置
    return findTextPosition(docText, keywords)
  }
  
  // 3. 尝试分词匹配
  const keywordList = keywords.split(/\s+/).filter(k => k.length > 1)
  const paragraphs = docText.split('\n\n')
  
  for (const paragraph of paragraphs) {
    const matchCount = keywordList.filter(k => paragraph.includes(k)).length
    
    if (matchCount >= keywordList.length * 0.7) {
      const from = docText.indexOf(paragraph)
      const to = from + paragraph.length
      return { from, to, matchedText: paragraph }
    }
  }
  
  return null
}
```

### 3. Diff 展示方式

#### 3.1 添加建议标记

```typescript
const addSuggestion = useCallback(
  (targetText, replacement, description, contextBefore, contextAfter) => {
    // 1. 定位目标文本
    const result = findTextWithContext(
      editor.getText(),
      contextBefore || '',
      targetText,
      contextAfter || ''
    )
    
    if (!result) {
      return { error: '无法定位到目标文本' }
    }
    
    const { from, to } = result
    
    // 2. 给原文添加删除线
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .toggleStrike()
      .run()
    
    // 3. 在原文后插入空格
    editor
      .chain()
      .focus()
      .setTextSelection(to)
      .insertContent(' ')
      .run()
    
    // 4. 插入新文本（绿色高亮 + suggestion 标记）
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: replacement,
        marks: [
          { type: 'highlight', attrs: { color: '#86efac' } },
          { type: 'suggestion', attrs: { id, replacement, description } }
        ]
      })
      .run()
    
    return { error: null, suggestion: { id, target: targetText, replacement, from, to } }
  },
  [editor]
)
```

#### 3.2 接受建议

```typescript
const acceptSuggestion = useCallback(
  (id: string) => {
    const suggestion = suggestions.find(s => s.id === id)
    if (!suggestion) return
    
    // 计算完整范围：原文 + 空格 + 新文本
    const newTextEnd = suggestion.to + 1 + suggestion.replacement.length
    
    // 一次性替换为纯文本
    editor
      .chain()
      .focus()
      .deleteRange({ from: suggestion.from, to: newTextEnd })
      .insertContentAt(suggestion.from, suggestion.replacement)
      .run()
    
    // 移除标记
    editor.commands.removeSuggestion(id)
    
    // 更新状态
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'accepted' } : s
    ))
  },
  [editor, suggestions]
)
```

#### 3.3 拒绝建议

```typescript
const rejectSuggestion = useCallback(
  (id: string) => {
    const suggestion = suggestions.find(s => s.id === id)
    if (!suggestion) return
    
    // 1. 移除原文的删除线
    editor
      .chain()
      .focus()
      .setTextSelection({ from: suggestion.from, to: suggestion.to })
      .toggleStrike()
      .run()
    
    // 2. 删除新文本（包括空格）
    const newTextEnd = suggestion.to + 1 + suggestion.replacement.length
    editor
      .chain()
      .focus()
      .setTextSelection({ from: suggestion.to, to: newTextEnd })
      .deleteSelection()
      .run()
    
    // 移除标记
    editor.commands.removeSuggestion(id)
    
    // 更新状态
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'rejected' } : s
    ))
  },
  [editor, suggestions]
)
```

### 4. SuggestionTooltip 组件

#### 4.1 定位逻辑

```typescript
useEffect(() => {
  // 查找对应的 DOM 元素
  const element = document.querySelector(
    `[data-suggestion-id="${suggestion.id}"]`
  ) as HTMLElement
  
  if (!element) return
  
  const handleMouseEnter = () => {
    const rect = element.getBoundingClientRect()
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + rect.width / 2,
    })
    setIsVisible(true)
  }
  
  element.addEventListener('mouseenter', handleMouseEnter)
  
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter)
  }
}, [suggestion.id])
```

#### 4.2 UI 渲染

```tsx
<div
  className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2"
  style={{
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translateX(-50%)',
  }}
>
  <div className="flex items-center gap-2">
    {/* 拒绝按钮 */}
    <button
      onClick={() => onReject(suggestion.id)}
      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
    >
      拒绝
    </button>
    
    {/* 接受按钮 */}
    <button
      onClick={() => onAccept(suggestion.id)}
      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      接受
    </button>
  </div>
  
  {/* 修改说明 */}
  {suggestion.description && (
    <div className="mt-2 pt-2 border-t border-gray-200">
      <p className="text-xs text-gray-600">{suggestion.description}</p>
    </div>
  )}
</div>
```

---

## 验证功能

### 测试步骤

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **准备测试文档**
   - 创建一个新文档
   - 输入一些测试内容：
   ```markdown
   # 项目介绍
   
   ## 技术栈介绍
   
   本项目使用以下技术栈：
   - 前端：React 18 + TypeScript + Vite
   - 后端：Node.js + Koa2
   - 数据库：SQLite
   
   ## 功能特性
   
   1. 实时协同编辑
   2. AI 写作助手
   3. 版本历史管理
   ```

3. **测试修改标题**
   - 在 AI 对话框输入："把技术栈介绍改为技术架构说明"
   - 点击发送
   - **预期结果**：
     - AI 思考过程显示在对话面板
     - 编辑器中"技术栈介绍"显示删除线
     - "技术架构说明"显示绿色高亮
     - Hover 时显示 Tooltip

4. **测试接受修改**
   - Hover 到绿色高亮文本
   - 点击"接受"按钮
   - **预期结果**：
     - 删除线和高亮消失
     - 只保留新文本"技术架构说明"
     - Tooltip 消失

5. **测试拒绝修改**
   - 重复步骤 3
   - Hover 到绿色高亮文本
   - 点击"拒绝"按钮
   - **预期结果**：
     - 删除线和高亮消失
     - 只保留原文"技术栈介绍"
     - Tooltip 消失

6. **测试修改正文**
   - 输入："把 React 18 改为 React 19"
   - **预期结果**：
     - 正确定位到"React 18"
     - 显示 diff 效果

7. **测试多处相同文本**
   - 在文档中添加多个"React"
   - 输入："把第一个 React 改为 Vue"
   - **预期结果**：
     - AI 能理解"第一个"的含义
     - 只修改第一个出现的位置

8. **测试错误处理**
   - 输入："把不存在的文本改为其他"
   - **预期结果**：
     - 显示错误提示："无法定位到目标文本"
     - 不会在编辑器中添加标记

---

## 核心技术点

### 1. 文本匹配算法

**挑战**：
- 文档内容可能有多个相同的文本
- AI 返回的文本可能与文档中的格式略有不同
- 需要高效且准确地定位

**解决方案**：
- **多策略匹配**：精确匹配 → 规范化匹配 → 模糊匹配
- **上下文定位**：使用前后文唯一确定位置
- **相似度计算**：Levenshtein 距离算法

**关键代码**：
```typescript
// 策略 1：精确匹配
let index = docText.indexOf(target)

// 策略 2：规范化匹配
const normalized = text.replace(/\s+/g, ' ').trim()

// 策略 3：模糊匹配
const similarity = calculateSimilarity(str1, str2)
```

### 2. Tiptap Mark 扩展

**Mark vs Node**：
- **Mark**：行内标记（如加粗、斜体、高亮）
- **Node**：块级元素（如段落、标题、列表）

**Suggestion Mark**：
```typescript
export const Suggestion = Mark.create({
  name: 'suggestion',
  
  addAttributes() {
    return {
      id: { default: null },
      replacement: { default: null },
      description: { default: null },
    }
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'suggestion-mark' }, 0]
  },
})
```

### 3. Diff 展示方式

**为什么选择 Diff 方式**：
- 用户可以同时看到原文和新文本
- 更直观地理解修改内容
- 符合代码审查的习惯

**实现方式**：
```
原文（删除线） + 空格 + 新文本（绿色高亮）
```

**优势**：
- 简单直观
- 易于实现
- 性能好

### 4. 流式更新

**支持流式输出 replacement 文本**：
```typescript
const streamReplacementText = useCallback(
  (id: string, char: string) => {
    const suggestion = suggestions.find(s => s.id === id)
    const insertPos = suggestion.to + 1 + suggestion.replacement.length
    
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, {
        type: 'text',
        text: char,
        marks: [
          { type: 'highlight', attrs: { color: '#86efac' } },
          { type: 'suggestion', attrs: { id, replacement: suggestion.replacement + char } }
        ]
      })
      .run()
  },
  [editor, suggestions]
)
```

---

## 常见问题 FAQ

### Q1: 为什么 AI 有时无法定位到文本？

**A**: 可能的原因：
1. **AI 返回的文本与文档不完全一致**
   - 解决：使用规范化匹配和模糊匹配
2. **文档中有多个相同的文本**
   - 解决：使用上下文定位
3. **文档内容提取不正确**
   - 解决：使用 `editor.getText()` 而不是 `editor.getHTML()`

### Q2: 如何处理多处相同文本？

**A**: 
- 在 Prompt 中强调"只返回一个最相关的修改"
- 使用上下文信息（contextBefore/contextAfter）精确定位
- AI 会根据用户意图选择最合适的位置

### Q3: 为什么使用 getText() 而不是 getHTML()？

**A**:
- `getText()` 返回纯文本，更容易匹配
- `getHTML()` 包含 HTML 标签，会干扰匹配
- AI 返回的也是纯文本，保持一致性

### Q4: 如何优化匹配性能？

**A**:
- 使用多策略匹配，从快到慢
- 精确匹配最快，优先尝试
- 模糊匹配最慢，最后尝试
- 使用滑动窗口优化（每次移动多个字符）

### Q5: 如何处理 AI 返回格式错误？

**A**:
- 在 Prompt 中明确要求 JSON 格式
- 提供示例
- 后端解析时容错处理（移除 markdown 代码块标记）
- 实现备用解析方案（从文本中提取修改信息）

---

## 后续优化方向

### 1. 支持多处修改

当前只支持一次修改一个位置，可以扩展为：
- 一次返回多个修改建议
- 用户可以批量接受/拒绝
- 显示修改列表

### 2. 修改历史

记录所有的修改操作：
- 保存到数据库
- 支持查看历史
- 支持回滚

### 3. 智能建议

AI 主动发现文档中的问题：
- 语法错误
- 格式不一致
- 内容重复
- 提供优化建议

### 4. 协同编辑集成

在多人协同时：
- 显示其他用户的修改建议
- 冲突检测和解决
- 权限管理

---

## 总结

本章实现了 AI 对话式文档编辑功能，这是项目的核心创新点。

### 核心成果

1. **智能文本匹配**：
   - ✅ 多策略匹配算法
   - ✅ 上下文精确定位
   - ✅ 模糊匹配支持

2. **Diff 展示**：
   - ✅ 删除线 + 绿色高亮
   - ✅ 直观易懂
   - ✅ 性能优秀

3. **交互体验**：
   - ✅ Hover 显示 Tooltip
   - ✅ 一键接受/拒绝
   - ✅ 流畅的动画

4. **AI 集成**：
   - ✅ 结构化返回
   - ✅ 流式输出支持
   - ✅ 错误处理完善

### 技术亮点

1. **文本匹配算法**：精确、规范化、模糊三种策略
2. **Tiptap 扩展**：自定义 Suggestion Mark
3. **Diff 展示**：简单直观的修改展示方式
4. **流式更新**：支持逐字显示修改内容

### 与其他章节的关系

- **Chapter 20**：DeepSeek API 集成（基础）
- **Chapter 21**：AI 对话界面（基础）
- **Chapter 23**：AI 改写快捷指令（相关功能）
- **Chapter 26**：流式输出性能优化（性能基础）
- **Chapter 27**：AI 对话式文档编辑（本章）
- **Chapter 28**：AI 功能增强（后续优化）

### 学到的知识

1. **文本匹配算法**：多策略、上下文、相似度
2. **Tiptap Mark 扩展**：自定义标记、属性管理
3. **Diff 展示**：删除线 + 高亮的实现
4. **AI Prompt 设计**：如何引导 AI 返回结构化数据
5. **流式处理**：SSE 事件处理、状态管理

---

## 下一章预告

Chapter 28 将实现 AI 功能增强和优化：
- 对话历史管理
- 快捷键支持（Ctrl+K）
- Token 统计
- 模型切换优化
- 右键菜单 AI 选项

---

**提交代码**：
```bash
git add .
git commit -m "feat: 实现 AI 对话式文档编辑功能（Chapter 27）

- 实现智能文本匹配算法（精确、规范化、模糊三种策略）
- 实现上下文精确定位（通过前后文唯一确定位置）
- 实现 Diff 展示方式（删除线 + 绿色高亮）
- 实现 SuggestionTooltip 组件（Hover 显示接受/拒绝按钮）
- 实现流式更新支持（逐字显示修改内容）
- 完善后端 AI 编辑 API（结构化返回、错误处理）
- 完善前端 API 客户端（SSE 事件处理、回调管理）
- 完善 useSuggestions Hook（状态管理、操作接口）
- 编写 Chapter 27 完整教程文档"
```
    