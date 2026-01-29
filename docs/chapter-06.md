# Chapter 6: 左侧文档列表 UI

## 本章目标

完善左侧文档列表，连接真实数据：
- ✅ 连接 Zustand Store 获取文档数据
- ✅ 实现搜索功能（防抖优化）
- ✅ 实现文档选择和高亮
- ✅ 实现新建文档功能
- ✅ 添加加载状态和空状态
- ✅ 使用 date-fns 格式化时间
- ✅ 更新编辑器占位组件显示当前文档

**学习重点：**
- React Hooks 实战应用
- 防抖（Debounce）优化
- 加载状态和空状态设计
- 时间格式化
- 组件通信

---

## 一、防抖（Debounce）原理

### 1.1 什么是防抖？

防抖是一种性能优化技术，在事件被触发 n 秒后再执行回调，如果在这 n 秒内又被触发，则重新计时。

**应用场景：**
- 搜索框输入
- 窗口 resize
- 滚动事件
- 表单验证

### 1.2 防抖 vs 节流

| 特性 | 防抖（Debounce） | 节流（Throttle） |
|------|------------------|------------------|
| 执行时机 | 停止触发后 n 秒执行 | 每隔 n 秒执行一次 |
| 适用场景 | 搜索、输入验证 | 滚动、resize |
| 执行频率 | 可能不执行 | 固定频率执行 |

**示例：**
```typescript
// 防抖：用户停止输入 300ms 后才搜索
useEffect(() => {
  const timer = setTimeout(() => {
    search(keyword)
  }, 300)
  
  return () => clearTimeout(timer)
}, [keyword])

// 节流：每 300ms 最多执行一次
let lastTime = 0
function handleScroll() {
  const now = Date.now()
  if (now - lastTime > 300) {
    doSomething()
    lastTime = now
  }
}
```

---

## 二、安装依赖

```bash
cd client
pnpm add date-fns
```

**date-fns 特点：**
- 模块化设计，按需引入
- 支持 Tree Shaking
- 完整的 TypeScript 支持
- 国际化支持

---

## 三、重构 Sidebar 组件

### 3.1 连接 Store

修改 `client/src/components/layout/Sidebar.tsx`：

```typescript
import { useEffect, useState } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface SidebarProps {
  isOpen: boolean
  onDocumentSelect?: (id: number) => void
}

function Sidebar({ isOpen, onDocumentSelect }: SidebarProps) {
  const {
    documents,
    currentDocument,
    loading,
    error,
    pagination,
    fetchDocuments,
    createDocument,
    setCurrentDocument,
    setQuery,
  } = useDocumentStore()

  const [keyword, setKeyword] = useState('')

  // 组件挂载时获取文档列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // ...
}
```

**知识点：**
- `useDocumentStore()`: 获取 Store 中的状态和方法
- `useEffect`: 组件挂载时执行副作用
- `useState`: 管理本地搜索关键词状态

### 3.2 实现搜索防抖

```typescript
// 搜索防抖
useEffect(() => {
  const timer = setTimeout(() => {
    setQuery({ keyword, page: 1 })
    fetchDocuments()
  }, 300)

  return () => clearTimeout(timer)
}, [keyword, setQuery, fetchDocuments])
```

**工作流程：**
1. 用户输入关键词
2. 设置 300ms 定时器
3. 如果 300ms 内再次输入，清除旧定时器，重新计时
4. 300ms 后执行搜索

**为什么要清除定时器？**
- 避免内存泄漏
- 避免组件卸载后执行回调
- 实现防抖效果

### 3.3 实现新建文档

```typescript
// 创建新文档
const handleCreate = async () => {
  const doc = await createDocument({
    title: '无标题文档',
    content: '',
  })
  if (doc) {
    setCurrentDocument(doc)
    onDocumentSelect?.(doc.id)
  }
}
```

**知识点：**
- `async/await`: 处理异步操作
- `?.`: 可选链操作符，避免 undefined 错误
- 创建后自动选中新文档

### 3.4 实现文档选择

```typescript
// 选择文档
const handleSelect = (id: number) => {
  const doc = documents.find(d => d.id === id)
  if (doc) {
    setCurrentDocument(doc)
    onDocumentSelect?.(id)
  }
}
```

---

## 四、添加加载和空状态

### 4.1 加载骨架屏

```typescript
{loading && documents.length === 0 && (
  <div className="space-y-2 p-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="animate-pulse">
        <div className="h-12 rounded-lg bg-gray-200"></div>
      </div>
    ))}
  </div>
)}
```

**知识点：**
- `animate-pulse`: Tailwind 提供的脉冲动画
- 骨架屏：提升用户体验，减少等待焦虑

### 4.2 空状态

```typescript
{!loading && documents.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <svg className="mb-3 h-12 w-12 text-gray-400">
      {/* 图标 */}
    </svg>
    <p className="text-sm text-gray-500">
      {keyword ? '没有找到相关文档' : '还没有文档'}
    </p>
    <p className="mt-1 text-xs text-gray-400">
      点击上方按钮创建新文档
    </p>
  </div>
)}
```

**设计原则：**
- 清晰的图标
- 简洁的文案
- 明确的操作指引

---

## 五、时间格式化

### 5.1 使用 date-fns

```typescript
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 格式化时间
const formatTime = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: zhCN,
    })
  } catch {
    return '刚刚'
  }
}
```

**输出示例：**
- `2 分钟前`
- `1 小时前`
- `3 天前`
- `2 个月前`

### 5.2 date-fns 常用函数

```typescript
import {
  format,           // 格式化日期
  formatDistance,   // 相对时间
  formatRelative,   // 相对日期
  isToday,          // 是否今天
  isYesterday,      // 是否昨天
  addDays,          // 添加天数
  subDays,          // 减少天数
  differenceInDays, // 天数差
} from 'date-fns'

// 格式化
format(new Date(), 'yyyy-MM-dd HH:mm:ss')  // "2024-01-28 10:30:00"

// 相对时间
formatDistance(new Date(2024, 0, 1), new Date())  // "27 days"

// 相对日期
formatRelative(new Date(2024, 0, 1), new Date())  // "last month"

// 判断
isToday(new Date())  // true
isYesterday(new Date(2024, 0, 27))  // true

// 计算
addDays(new Date(), 7)  // 7 天后
differenceInDays(new Date(), new Date(2024, 0, 1))  // 27
```

---

## 六、更新 EditorPlaceholder

修改 `client/src/components/editor/EditorPlaceholder.tsx`：

```typescript
import { useDocumentStore } from '../../store/documentStore'

function EditorPlaceholder() {
  const { currentDocument } = useDocumentStore()

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
    <div className="flex h-full flex-col bg-white">
      {/* 文档标题区域 */}
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {currentDocument.title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          最后更新: {new Date(currentDocument.updated_at).toLocaleString('zh-CN')}
        </p>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {currentDocument.content ? (
            <div className="prose prose-lg">
              <p className="whitespace-pre-wrap text-gray-700">
                {currentDocument.content}
              </p>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-sm text-gray-500">文档内容为空</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 七、面试考点

### 7.1 React Hooks

**Q: useEffect 的依赖数组有什么作用？**

A: 依赖数组决定 effect 何时重新执行：

```typescript
// 1. 没有依赖数组：每次渲染都执行
useEffect(() => {
  console.log('每次渲染')
})

// 2. 空依赖数组：只在挂载时执行一次
useEffect(() => {
  console.log('只执行一次')
}, [])

// 3. 有依赖：依赖变化时执行
useEffect(() => {
  console.log('count 变化了')
}, [count])
```

**Q: useEffect 的清理函数有什么用？**

A: 清理函数在以下情况执行：
1. 组件卸载时
2. effect 重新执行前

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    console.log('延迟执行')
  }, 1000)

  // 清理函数
  return () => {
    clearTimeout(timer)  // 清除定时器
  }
}, [])
```

**常见清理场景：**
- 清除定时器
- 取消网络请求
- 移除事件监听
- 关闭 WebSocket 连接

### 7.2 防抖实现

**Q: 如何手写一个防抖函数？**

A:
```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// 使用
const debouncedSearch = debounce((keyword: string) => {
  console.log('搜索:', keyword)
}, 300)

debouncedSearch('hello')
debouncedSearch('world')  // 只会执行这次
```

**Q: React 中如何实现防抖？**

A: 有两种方式：

1. **使用 useEffect**（推荐）
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    search(keyword)
  }, 300)
  
  return () => clearTimeout(timer)
}, [keyword])
```

2. **使用 useMemo/useCallback**
```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    search(value)
  }, 300),
  []
)
```

### 7.3 性能优化

**Q: 如何优化列表渲染性能？**

A:
1. **使用 key**
```typescript
{items.map(item => (
  <Item key={item.id} {...item} />  // ✅ 使用唯一 ID
))}
```

2. **React.memo**
```typescript
const Item = React.memo(({ title, onClick }) => {
  return <div onClick={onClick}>{title}</div>
})
```

3. **虚拟滚动**
```typescript
// 使用 react-window 或 react-virtualized
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={1000}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

**Q: 什么时候使用 React.memo？**

A: 当组件满足以下条件时：
- 渲染开销大
- props 经常相同
- 是纯组件（相同 props 产生相同输出）

**注意：** 不要过度优化，先测量再优化。

---

## 八、验证功能

### 8.1 启动项目

```bash
# 确保前后端都在运行
pnpm dev
```

### 8.2 测试步骤

1. **测试新建文档**
   - 点击"新建文档"按钮
   - 应该创建一个"无标题文档"
   - 右侧显示文档详情
   - 左侧列表自动刷新并高亮

2. **测试文档选择**
   - 点击列表中的文档
   - 右侧应该显示对应文档内容
   - 当前文档应该高亮显示

3. **测试搜索功能**
   - 在搜索框输入关键词
   - 等待 300ms 后自动搜索
   - 列表应该只显示匹配的文档
   - 清空搜索框，显示所有文档

4. **测试加载状态**
   - 刷新页面
   - 应该看到骨架屏动画
   - 数据加载后显示文档列表

5. **测试空状态**
   - 删除所有文档
   - 应该显示空状态提示
   - 搜索不存在的关键词
   - 应该显示"没有找到相关文档"

6. **测试时间显示**
   - 创建新文档，应该显示"刚刚"
   - 查看旧文档，应该显示相对时间

### 8.3 验证清单

- ✅ 页面加载时显示文档列表
- ✅ 新建文档功能正常
- ✅ 点击文档可以切换
- ✅ 当前文档高亮显示
- ✅ 搜索功能正常（防抖生效）
- ✅ 加载状态显示正常
- ✅ 空状态显示正常
- ✅ 时间格式化正确
- ✅ 右侧显示当前文档内容
- ✅ 没有选中文档时显示提示

---

## 九、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 文档列表连接真实数据
- ✅ 搜索功能（防抖优化）
- ✅ 文档选择和高亮
- ✅ 新建文档功能
- ✅ 加载状态和空状态
- ✅ 时间格式化

### 核心概念
- ✅ React Hooks 实战
- ✅ 防抖原理和实现
- ✅ 组件通信模式
- ✅ 用户体验优化

### 最佳实践
- ✅ 防抖优化搜索
- ✅ 骨架屏提升体验
- ✅ 清晰的空状态设计
- ✅ 友好的时间显示

---

## 十、下一章预告

在下一章（Chapter 7）中，我们将：

1. **实现文档操作功能**
   - 文档重命名（双击编辑）
   - 删除确认弹窗
   - 右键菜单

2. **集成 Headless UI**
   - Dialog 组件
   - Menu 组件
   - 无障碍支持

3. **优化交互体验**
   - 内联编辑
   - 键盘快捷键
   - 操作反馈

准备好了吗？让我们继续前进！🚀
