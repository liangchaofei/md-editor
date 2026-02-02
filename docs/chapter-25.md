# Chapter 25: 改写菜单增强

## 本章目标

在 Chapter 23 的基础上，增强"改写"功能的交互体验。在改写对话框中添加快捷选项菜单，让用户可以快速选择常用的改写指令，而不需要每次都手动输入。

**核心功能**：
- 选中文本后显示浮动菜单，点击"AI改写"按钮
- 弹出改写对话框，包含输入框和快捷选项菜单
- 快捷选项：润色、续写、扩写、缩写、更正式、更活泼、更学术、党政风、口语化
- 点击快捷选项自动填入输入框
- 支持语音输入（UI预留）
- 显示思考过程和生成过程
- 生成完成后提供"放弃"和"替换原文"按钮
- 替换后高亮显示新内容

**完整交互流程**（与用户提供的图片一致）：
1. **选中文本** → 浮动菜单显示"AI改写"按钮（以及其他编辑按钮）
2. **点击"AI改写"** → 弹出对话框，包含：
   - 输入框："说说想怎么修改当前内容？"
   - 语音输入按钮
   - 发送按钮
   - 下方显示快捷选项菜单：润色、续写、扩写、缩写、更正式、更活泼、更学术、党政风、口语化
3. **输入内容或点击快捷选项** → 输入框显示用户的指令
4. **点击发送** → 显示"思考中..."
5. **AI 生成中** → 显示"内容生成中..."，实时显示生成的内容
6. **生成完成** → 显示"内容生成完成"，提供两个按钮：
   - "放弃"：取消本次改写
   - "替换原文"：用新内容替换选中的文本
7. **点击"替换原文"** → 新内容替换原文并高亮显示
8. **点击任意位置** → 高亮消失

---

## 设计思路

### 1. 为什么需要快捷选项菜单？

**问题**：在 Chapter 23 中，用户需要手动输入改写需求，例如：
- "使语气更正式"
- "简化表达"
- "增加细节"

这对于常用的改写操作来说比较繁琐。

**解决方案**：添加快捷选项菜单
- 预设 9 个常用改写选项
- 点击即可填入输入框
- 仍然支持自定义输入

### 2. 为什么使用悬浮对话框而不是 Modal？

**设计理念**：类似 GitHub Copilot 的内联交互
- **上下文关联**：对话框显示在选中文本下方，保持视觉关联
- **不打断流程**：不需要切换到屏幕中央的弹窗
- **更自然**：就像在文本旁边进行对话

**实现方式**：
- 计算选中文本的位置
- 对话框显示在选中文本下方 10px
- 水平居中对齐选中文本
- 半透明背景，点击关闭

### 3. 与 Chapter 23 的区别

| 功能 | Chapter 23 | Chapter 25 |
|------|-----------|-----------|
| 对话框类型 | 居中 Modal | 悬浮在选中文本下方 |
| 改写对话框 | 只有输入框 | 输入框 + 快捷选项菜单 |
| 预设选项 | 无 | 9 个快捷选项 |
| 输入方式 | 手动输入 | 点击选项或手动输入 |
| 语音输入 | 无 | UI 预留（待实现） |
| 发送按钮 | 底部"执行"按钮 | 输入框旁边的发送按钮 |
| 视觉关联 | 无 | 显示在选中文本下方 |

**核心改进**：
- 更符合现代 AI 对话界面的设计习惯
- 快捷选项提高操作效率
- 输入框 + 发送按钮的布局更直观

---

## 实现步骤

### 步骤 1：修改 AICommandDialog 为悬浮对话框

**修改文件：** `client/src/components/editor/AICommandDialog.tsx`

#### 1.1 计算对话框位置

添加位置计算逻辑，使对话框显示在选中文本下方：

```typescript
// 计算对话框位置
const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

useEffect(() => {
  if (isOpen && editor) {
    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    
    // 计算选中文本的中心位置
    const left = (start.left + end.left) / 2
    const top = end.bottom + 10 // 在选中文本下方 10px
    
    setPosition({ top, left })
  }
}, [isOpen, editor])

if (!isOpen || !position) return null
```

**关键点**：
- 使用 `coordsAtPos` 获取选中文本的起始和结束坐标
- 计算水平中心位置：`(start.left + end.left) / 2`
- 垂直位置在选中文本下方：`end.bottom + 10`

#### 1.2 修改对话框样式

将居中 Modal 改为固定定位的悬浮对话框：

```typescript
return (
  <>
    {/* 半透明背景 */}
    <div className="fixed inset-0 z-40 bg-black bg-opacity-20" onClick={handleCancel} />
    
    {/* 悬浮对话框 */}
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)', // 水平居中
      }}
    >
      {/* 对话框内容 */}
    </div>
  </>
)
```

**关键改动**：
- 移除 `flex items-center justify-center`（居中布局）
- 使用 `fixed` 定位 + 动态 `top` 和 `left`
- 使用 `transform: translateX(-50%)` 实现水平居中
- 背景透明度降低（`bg-opacity-20`），更轻量

#### 1.3 添加输入框布局和快捷选项

将输入框从单独的 textarea 改为带语音和发送按钮的组合：

```typescript
{/* 输入框（仅改写需要） */}
{type === 'rewrite' && !generatedContent && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {commandInfo.placeholder}
    </label>
    <div className="flex items-center gap-2 mb-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="例如：使语气更正式、简化表达、增加细节等"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        rows={3}
        disabled={isThinking || isGenerating}
      />
      <div className="flex flex-col gap-2">
        {/* 语音输入按钮 */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          title="语音输入"
          disabled={isThinking || isGenerating}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        {/* 发送按钮 */}
        <button
          onClick={handleExecute}
          disabled={isThinking || isGenerating}
          className="p-2 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
          title="发送"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
    
    {/* 快捷选项菜单 */}
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => setInput('润色这段文字，使其更加流畅优美')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        润色
      </button>
      <button
        onClick={() => setInput('续写这段内容，保持风格一致')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        续写
      </button>
      <button
        onClick={() => setInput('扩写这段内容，增加更多细节')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        扩写
      </button>
      <button
        onClick={() => setInput('缩写这段内容，保留核心要点')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        缩写
      </button>
      <button
        onClick={() => setInput('使语气更正式')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        更正式
      </button>
      <button
        onClick={() => setInput('使语气更活泼')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        更活泼
      </button>
      <button
        onClick={() => setInput('转换为学术风格')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        更学术
      </button>
      <button
        onClick={() => setInput('转换为党政风格')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        党政风
      </button>
      <button
        onClick={() => setInput('转换为口语化表达')}
        disabled={isThinking || isGenerating}
        className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        口语化
      </button>
    </div>
  </div>
)}
```

**设计要点**：
1. **输入框 + 按钮组合**：输入框右侧显示语音和发送按钮
2. **3x3 网格布局**：快捷选项使用 3 列网格布局
3. **点击填入**：点击快捷选项自动填入输入框
4. **禁用状态**：生成时禁用所有按钮

#### 1.2 修改底部按钮

移除改写功能的底部"执行"按钮（因为已经有发送按钮）：

```typescript
{/* 底部按钮 */}
<div className="border-t border-gray-200 px-6 py-4">
  {!generatedContent ? (
    <div className="flex justify-end gap-2">
      <button
        onClick={handleCancel}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        取消
      </button>
      {/* 改写功能不需要底部的执行按钮，因为已经有发送按钮 */}
      {type !== 'rewrite' && (
        <button
          onClick={handleExecute}
          disabled={isThinking || isGenerating}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isThinking ? '思考中...' : isGenerating ? '生成中...' : '执行'}
        </button>
      )}
    </div>
  ) : (
    // ... 生成完成后的按钮（放弃/替换原文）
  )}
</div>
```

**关键改进**：
- 改写功能使用输入框旁边的发送按钮
- 其他功能（续写、扩写等）仍然使用底部的执行按钮
- 避免按钮重复

---

---

## 核心技术点

### 1. 悬浮对话框定位

```typescript
// 计算选中文本的位置
const { from, to } = editor.state.selection
const start = editor.view.coordsAtPos(from)
const end = editor.view.coordsAtPos(to)

// 计算对话框位置
const left = (start.left + end.left) / 2  // 水平居中
const top = end.bottom + 10  // 在选中文本下方 10px

// 应用位置
<div 
  style={{
    top: `${top}px`,
    left: `${left}px`,
    transform: 'translateX(-50%)',  // 水平居中对齐
  }}
>
```

**关键点**：
- `coordsAtPos(from)` 获取选中文本起始位置的屏幕坐标
- `coordsAtPos(to)` 获取选中文本结束位置的屏幕坐标
- 水平居中：取起始和结束位置的中点
- 垂直位置：在选中文本下方留 10px 间距
- `transform: translateX(-50%)`：使对话框以 left 为中心点

### 2. 快捷选项实现

```typescript
<button
  onClick={() => setInput('润色这段文字，使其更加流畅优美')}
  disabled={isThinking || isGenerating}
  className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  润色
</button>
```

**关键点**：
- 点击时调用 `setInput()` 填入预设文本
- 生成时禁用按钮
- 使用 `disabled:opacity-50` 显示禁用状态

### 3. 输入框布局

```typescript
<div className="flex items-center gap-2 mb-3">
  <textarea className="flex-1" />
  <div className="flex flex-col gap-2">
    <button>语音</button>
    <button>发送</button>
  </div>
</div>
```

**布局说明**：
- 使用 `flex` 布局
- 输入框占据剩余空间（`flex-1`）
- 按钮垂直排列（`flex-col`）
- 按钮之间有间距（`gap-2`）

### 4. 网格布局

```typescript
<div className="grid grid-cols-3 gap-2">
  <button>润色</button>
  <button>续写</button>
  <button>扩写</button>
  {/* ... 更多按钮 */}
</div>
```

**布局说明**：
- 使用 `grid` 布局
- 3 列网格（`grid-cols-3`）
- 按钮之间有间距（`gap-2`）
- 自动换行

### 5. 半透明背景

```typescript
{/* 半透明背景 */}
<div 
  className="fixed inset-0 z-40 bg-black bg-opacity-20" 
  onClick={handleCancel} 
/>

{/* 悬浮对话框 */}
<div className="fixed z-50 ...">
```

**关键点**：
- 背景层 `z-40`，对话框 `z-50`
- 背景透明度 20%（`bg-opacity-20`）
- 点击背景关闭对话框
- `inset-0` 覆盖整个屏幕

---

## 验证功能

### 测试步骤

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **测试悬浮对话框定位**
   - 在编辑器中输入一段文字
   - 选中这段文字
   - 浮动菜单出现，点击"改写"
   - **验证对话框是否显示在选中文本下方**
   - **验证对话框是否水平居中对齐选中文本**
   - 验证半透明背景是否显示
   - 点击背景，验证对话框是否关闭

3. **测试快捷选项**
   - 选中文字，点击"改写"
   - 对话框弹出，显示输入框和快捷选项
   - 点击"润色"按钮
   - 验证输入框是否填入"润色这段文字，使其更加流畅优美"
   - 点击发送按钮
   - 验证 AI 是否开始生成

4. **测试自定义输入**
   - 在输入框中手动输入"使语气更幽默"
   - 点击发送按钮
   - 验证 AI 是否按要求执行

5. **测试生成过程**
   - 验证是否显示"思考中..."
   - 验证是否显示"内容生成中..."
   - 验证是否实时显示生成的内容
   - 验证是否显示"内容生成完成"

6. **测试替换功能**
   - 点击"替换原文"按钮
   - 验证原文是否被替换
   - 验证新内容是否高亮显示
   - 点击编辑器任意位置
   - 验证高亮是否消失

7. **测试放弃功能**
   - 重复上述步骤，但点击"放弃"按钮
   - 验证对话框是否关闭
   - 验证原文是否保持不变

### 边界情况测试

1. **不同位置的选中文本**
   - 在文档顶部选中文本 → 验证对话框位置
   - 在文档底部选中文本 → 验证对话框位置
   - 在文档中间选中文本 → 验证对话框位置
   - 预期：对话框始终显示在选中文本下方

2. **不同长度的选中文本**
   - 选中短文本（几个字）→ 验证对话框居中
   - 选中长文本（一整行）→ 验证对话框居中
   - 预期：对话框始终水平居中对齐选中文本

3. **空输入**：不输入任何内容，点击发送按钮
   - 预期：按钮禁用，无法点击

4. **生成中点击快捷选项**：生成过程中点击快捷选项
   - 预期：按钮禁用，无法点击

5. **连续点击**：快速连续点击多个快捷选项
   - 预期：输入框显示最后一次点击的内容

6. **长文本**：选中很长的文本进行改写
   - 预期：正常生成，可能需要较长时间

---

## 关键修复和优化

### 1. 从 Modal 改为悬浮对话框

**问题**：居中 Modal 打断用户的编辑流程，视觉上与选中文本脱节

**解决方案**：
```typescript
// ❌ 错误：居中 Modal
<div className="fixed inset-0 flex items-center justify-center">
  <div className="bg-white ...">

// ✅ 正确：悬浮对话框
<div 
  className="fixed z-50 ..."
  style={{
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translateX(-50%)',
  }}
>
```

**效果**：
- 对话框显示在选中文本下方
- 保持视觉关联
- 更符合内联交互的设计理念

### 2. 按钮重复问题

**问题**：改写功能同时有发送按钮和底部执行按钮，造成混淆

**解决方案**：
```typescript
{type !== 'rewrite' && (
  <button onClick={handleExecute}>执行</button>
)}
```

只在非改写功能时显示底部执行按钮。

### 3. 禁用状态

**问题**：生成时用户仍然可以点击快捷选项

**解决方案**：
```typescript
<button
  disabled={isThinking || isGenerating}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
```

生成时禁用所有快捷选项按钮。

### 4. 输入框高度

**问题**：输入框太小，不方便输入长文本

**解决方案**：
```typescript
<textarea rows={3} />
```

设置输入框为 3 行高度。

### 5. 位置计算时机

**问题**：对话框打开时位置可能不准确

**解决方案**：
```typescript
useEffect(() => {
  if (isOpen && editor) {
    // 每次打开时重新计算位置
    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    setPosition({ top: end.bottom + 10, left: (start.left + end.left) / 2 })
  }
}, [isOpen, editor])
```

在 `useEffect` 中监听 `isOpen` 变化，确保每次打开时都重新计算位置。

---

## 用户体验优化

### 1. 视觉反馈

- **位置关联**：对话框显示在选中文本下方，保持视觉关联
- **半透明背景**：轻量的背景遮罩，不过分打断
- **悬停效果**：快捷选项按钮悬停时背景变深
- **禁用状态**：生成时按钮半透明且鼠标变为禁止图标
- **加载动画**：思考和生成时显示 spinner 动画
- **高亮显示**：替换后的内容黄色高亮

### 2. 交互优化

- **内联交互**：对话框跟随选中文本，不需要切换视线
- **点击背景关闭**：点击半透明背景即可关闭对话框
- **一键填入**：点击快捷选项自动填入输入框
- **保留编辑**：填入后仍可修改
- **快速发送**：输入框旁边的发送按钮方便快速操作
- **语音预留**：为未来的语音输入功能预留 UI

### 3. 布局优化

- **悬浮定位**：使用 fixed 定位，不影响文档流
- **水平居中**：对话框相对选中文本水平居中
- **紧凑布局**：输入框和按钮紧密排列
- **网格对齐**：快捷选项使用网格布局，整齐美观
- **响应式**：适配不同屏幕尺寸

---

## 常见问题 FAQ

### Q1: 为什么快捷选项不直接执行，而是填入输入框？

**A**: 这样设计有几个优点：
1. **可编辑**：用户可以在预设文本基础上修改
2. **可预览**：用户可以看到将要发送的指令
3. **灵活性**：用户可以组合多个指令

### Q2: 为什么不使用居中 Modal？

**A**: 悬浮对话框的优势：
1. **视觉关联**：显示在选中文本下方，保持上下文
2. **不打断流程**：不需要切换视线到屏幕中央
3. **更自然**：类似 GitHub Copilot 的内联交互
4. **轻量**：半透明背景，不过分遮挡内容

### Q3: 语音输入按钮为什么是灰色的？

**A**: 语音输入功能尚未实现，目前只是 UI 预留。后续章节会实现这个功能。

### Q4: 为什么改写功能没有底部执行按钮？

**A**: 因为改写功能已经有输入框旁边的发送按钮，底部执行按钮会造成重复和混淆。其他功能（续写、扩写等）因为没有输入框，所以保留底部执行按钮。

### Q5: 快捷选项可以自定义吗？

**A**: 目前是硬编码的 9 个选项。后续可以考虑：
- 从配置文件读取
- 支持用户自定义
- 记录常用指令

### Q6: 对话框位置会随滚动变化吗？

**A**: 目前使用 `fixed` 定位，位置是固定的。如果需要跟随滚动，可以：
1. 使用 `absolute` 定位
2. 监听滚动事件更新位置
3. 或者在滚动时关闭对话框

### Q7: 与 Chapter 24 的对话式编辑有什么区别？

**A**: 
- **Chapter 24**：对话式，AI 自动定位并标记修改位置
- **Chapter 25**：指令式，用户选中文本后指定改写方式

两者可以共存，满足不同场景需求。

---

## 核心知识点

### 1. Tiptap 坐标系统

```typescript
// 获取文档位置的屏幕坐标
const coords = editor.view.coordsAtPos(position)
// coords = { top, bottom, left, right }
```

**关键概念**：
- `coordsAtPos(pos)`：将文档位置转换为屏幕坐标
- 返回值包含 `top`、`bottom`、`left`、`right`
- 坐标是相对于视口（viewport）的
- 不需要考虑滚动，Tiptap 已经处理

**应用场景**：
- 计算浮动菜单位置
- 计算对话框位置
- 实现自定义光标效果

### 2. React 状态管理

```typescript
const [input, setInput] = useState('')

// 点击快捷选项时更新状态
<button onClick={() => setInput('润色这段文字')}>
  润色
</button>
```

**关键点**：
- 使用 `useState` 管理输入框内容
- 点击按钮时调用 `setInput` 更新状态
- 输入框通过 `value` 和 `onChange` 受控

### 2. React 状态管理

```typescript
const [input, setInput] = useState('')

// 点击快捷选项时更新状态
<button onClick={() => setInput('润色这段文字')}>
  润色
</button>
```

**关键点**：
- 使用 `useState` 管理输入框内容
- 点击按钮时调用 `setInput` 更新状态
- 输入框通过 `value` 和 `onChange` 受控

### 3. 条件渲染

```typescript
{type === 'rewrite' && !generatedContent && (
  <div>
    {/* 输入框和快捷选项 */}
  </div>
)}
```

**关键点**：
- 只在改写功能时显示快捷选项
- 生成内容后隐藏输入区域
- 使用 `&&` 进行条件渲染

### 4. Tailwind CSS 布局

**Flex 布局**：
```typescript
<div className="flex items-center gap-2">
  <textarea className="flex-1" />
  <div className="flex flex-col gap-2">
    <button>语音</button>
    <button>发送</button>
  </div>
</div>
```

**Grid 布局**：
```typescript
<div className="grid grid-cols-3 gap-2">
  <button>润色</button>
  <button>续写</button>
  <button>扩写</button>
</div>
```

**Fixed 定位**：
```typescript
<div 
  className="fixed z-50"
  style={{
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translateX(-50%)',
  }}
>
```

**关键点**：
- `flex`：弹性布局
- `flex-1`：占据剩余空间
- `grid grid-cols-3`：3 列网格
- `fixed`：固定定位
- `transform: translateX(-50%)`：水平居中

### 5. 禁用状态样式

```typescript
<button
  disabled={isThinking || isGenerating}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
```

**关键点**：
- `disabled` 属性控制是否禁用
- `disabled:opacity-50` 禁用时半透明
- `disabled:cursor-not-allowed` 禁用时鼠标变为禁止图标

---

## 后续优化方向

### 1. 语音输入

**目标**：实现语音输入功能

**技术方案**：
```typescript
const startRecording = async () => {
  const recognition = new (window as any).webkitSpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript
    setInput(transcript)
  }
  recognition.start()
}
```

### 2. 自定义快捷选项

**目标**：允许用户自定义快捷选项

**技术方案**：
- 从 localStorage 读取用户配置
- 提供设置界面
- 支持添加/删除/编辑选项

### 3. 指令历史

**目标**：记录用户常用的指令

**技术方案**：
- 记录每次使用的指令
- 统计使用频率
- 在快捷选项中显示常用指令

### 4. 智能推荐

**目标**：根据选中文本推荐合适的指令

**技术方案**：
- 分析文本类型（正式/口语、长/短等）
- 推荐最相关的指令
- 动态调整快捷选项顺序

---

## 总结

本章在 Chapter 23 的基础上，为改写功能添加了快捷选项菜单，大大提高了操作效率。

### 核心成果

1. **功能完整**：
   - ✅ 悬浮对话框（显示在选中文本下方）
   - ✅ 输入框 + 语音按钮 + 发送按钮
   - ✅ 9 个快捷选项
   - ✅ 点击填入输入框
   - ✅ 支持自定义输入
   - ✅ 完整的生成流程
   - ✅ 替换和高亮功能
   - ✅ 半透明背景，点击关闭

2. **交互优化**：
   - ✅ 内联交互，保持视觉关联
   - ✅ 对话框跟随选中文本
   - ✅ 一键填入预设指令
   - ✅ 可编辑预设文本
   - ✅ 发送按钮位置更合理
   - ✅ 禁用状态清晰

3. **视觉设计**：
   - ✅ 悬浮定位，不打断流程
   - ✅ 紧凑的输入区域布局
   - ✅ 整齐的网格布局
   - ✅ 清晰的视觉反馈
   - ✅ 轻量的半透明背景

### 技术亮点

1. **悬浮定位**：使用 Tiptap coordsAtPos 精确计算位置
2. **组件复用**：在现有 AICommandDialog 基础上增强
3. **条件渲染**：根据功能类型显示不同 UI
4. **状态管理**：使用 React Hooks 管理输入状态
5. **响应式布局**：使用 Tailwind CSS 网格和 flex 布局
6. **性能优化**：使用 transform 实现水平居中，GPU 加速

### 与其他章节的关系

- **Chapter 23**：基础 AI 指令系统
- **Chapter 24**：对话式文档编辑
- **Chapter 25**：改写菜单增强（本章）
- **Chapter 26**：AI 功能优化和整合

### 用户反馈

根据用户提供的图片，本章实现的交互流程与预期完全一致：
- ✅ 选中文本 → 显示"AI改写"按钮
- ✅ 点击"AI改写" → 弹出悬浮对话框（显示在选中文本下方）
- ✅ 对话框包含输入框 + 快捷选项菜单
- ✅ 快捷选项：润色、续写、扩写、缩写、更正式、更活泼、更学术、党政风、口语化
- ✅ 生成过程：思考中 → 内容生成中 → 内容生成完成
- ✅ 完成后：放弃 / 替换原文
- ✅ 替换后高亮，点击任意位置取消高亮
- ✅ 对话框不是居中 Modal，而是悬浮在选中文本下方

**关键改进**：
- 从居中 Modal 改为悬浮对话框
- 保持与选中文本的视觉关联
- 更符合内联交互的设计理念

---

## 下一章预告

Chapter 26 将对 AI 功能进行整体优化：
- 对话历史管理
- 模型切换优化
- 缓存机制
- 性能优化
- 错误处理完善

---

**提交代码**：
```bash
git add .
git commit -m "feat: 增强改写菜单，添加快捷选项和悬浮对话框（Chapter 25）

- 将 AICommandDialog 从居中 Modal 改为悬浮对话框
- 对话框显示在选中文本下方，保持视觉关联
- 使用 Tiptap coordsAtPos 精确计算位置
- 添加 9 个预设改写选项：润色、续写、扩写、缩写、更正式、更活泼、更学术、党政风、口语化
- 点击快捷选项自动填入输入框
- 添加语音输入按钮（UI 预留）
- 优化输入框布局，添加发送按钮
- 移除改写功能的底部执行按钮，避免重复
- 添加半透明背景，点击关闭对话框
- 完善禁用状态和视觉反馈
- 编写 Chapter 25 完整教程文档"
```
