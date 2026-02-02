# Chapter 25 快速参考

## 核心改动

### 从居中 Modal 改为悬浮对话框

**之前（Chapter 23）**：
```typescript
// 居中 Modal
<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
  <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
    {/* 对话框内容 */}
  </div>
</div>
```

**现在（Chapter 25）**：
```typescript
// 悬浮对话框
<>
  {/* 半透明背景 */}
  <div className="fixed inset-0 z-40 bg-black bg-opacity-20" onClick={handleCancel} />
  
  {/* 悬浮对话框 */}
  <div 
    className="fixed z-50 bg-white rounded-lg shadow-2xl w-full max-w-2xl"
    style={{
      top: `${position.top}px`,
      left: `${position.left}px`,
      transform: 'translateX(-50%)',
    }}
  >
    {/* 对话框内容 */}
  </div>
</>
```

## 位置计算

```typescript
// 1. 添加状态
const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

// 2. 计算位置
useEffect(() => {
  if (isOpen && editor) {
    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    
    // 水平居中，垂直在选中文本下方
    const left = (start.left + end.left) / 2
    const top = end.bottom + 10
    
    setPosition({ top, left })
  }
}, [isOpen, editor])

// 3. 条件渲染
if (!isOpen || !position) return null
```

## 快捷选项菜单

```typescript
{/* 快捷选项菜单 */}
<div className="grid grid-cols-3 gap-2">
  <button
    onClick={() => setInput('润色这段文字，使其更加流畅优美')}
    disabled={isThinking || isGenerating}
    className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    润色
  </button>
  {/* 其他 8 个按钮 */}
</div>
```

## 输入框布局

```typescript
<div className="flex items-center gap-2 mb-3">
  <textarea
    value={input}
    onChange={(e) => setInput(e.target.value)}
    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none"
    rows={3}
  />
  <div className="flex flex-col gap-2">
    {/* 语音按钮 */}
    <button className="p-2 text-gray-400 hover:text-gray-600">
      <svg>...</svg>
    </button>
    {/* 发送按钮 */}
    <button onClick={handleExecute} className="p-2 text-white bg-purple-600">
      <svg>...</svg>
    </button>
  </div>
</div>
```

## 关键 API

### Tiptap coordsAtPos

```typescript
// 获取文档位置的屏幕坐标
const coords = editor.view.coordsAtPos(position)

// 返回值
interface Coords {
  top: number     // 顶部坐标
  bottom: number  // 底部坐标
  left: number    // 左侧坐标
  right: number   // 右侧坐标
}
```

### Transform 居中

```typescript
// 使用 transform 实现水平居中
style={{
  left: `${centerX}px`,
  transform: 'translateX(-50%)',  // 向左偏移自身宽度的 50%
}}

// 优点：
// 1. GPU 加速，性能更好
// 2. 不触发重排（reflow）
// 3. 不需要知道元素宽度
```

## 测试要点

1. **位置测试**
   - 选中不同位置的文本，验证对话框位置
   - 验证对话框是否在选中文本下方
   - 验证对话框是否水平居中

2. **快捷选项测试**
   - 点击每个快捷选项
   - 验证输入框是否填入对应文本
   - 验证生成时按钮是否禁用

3. **背景测试**
   - 点击半透明背景
   - 验证对话框是否关闭

## 常见问题

### Q: 对话框位置不准确？
A: 确保在 `useEffect` 中监听 `isOpen` 和 `editor`，每次打开时重新计算位置。

### Q: 对话框超出屏幕边界？
A: 添加边界检测逻辑，限制 left 的范围。

### Q: 滚动后位置错误？
A: 使用 `fixed` 定位，坐标已经是屏幕坐标，不受滚动影响。如果需要跟随滚动，改用 `absolute` 定位。

### Q: 为什么使用 transform 而不是 margin？
A: transform 使用 GPU 加速，性能更好，不触发重排。

## 提交信息

```bash
git add .
git commit -m "feat: 增强改写菜单，添加快捷选项和悬浮对话框（Chapter 25）

- 将 AICommandDialog 从居中 Modal 改为悬浮对话框
- 对话框显示在选中文本下方，保持视觉关联
- 使用 Tiptap coordsAtPos 精确计算位置
- 添加 9 个预设改写选项
- 点击快捷选项自动填入输入框
- 添加语音输入按钮（UI 预留）
- 优化输入框布局，添加发送按钮
- 添加半透明背景，点击关闭对话框"
```
