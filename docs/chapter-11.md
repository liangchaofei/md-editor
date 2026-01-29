# Chapter 11: Y.js 基础集成

## 本章目标

集成 Y.js 实现协同编辑的基础功能：
- ✅ 安装 Y.js 和相关依赖
- ✅ 创建 Y.Doc 实例
- ✅ 集成 Collaboration 扩展
- ✅ 实现本地多窗口同步
- ✅ 实现 IndexedDB 持久化
- ✅ 集成 Y.js UndoManager

**学习重点：**
- CRDT 算法原理
- Y.js 核心概念
- Tiptap Collaboration 扩展
- 本地数据持久化

---

## 一、CRDT 和 Y.js 简介

### 1.1 什么是 CRDT？

**CRDT（Conflict-free Replicated Data Type）** - 无冲突复制数据类型

**核心特点：**
- 多个副本可以独立修改
- 不需要中心化协调
- 最终一致性保证
- 自动冲突解决

**CRDT vs OT（Operational Transformation）：**

| 特性 | CRDT | OT |
|------|------|-----|
| 冲突解决 | 自动 | 需要中心服务器 |
| 离线支持 | 优秀 | 较差 |
| 实现复杂度 | 较低 | 较高 |
| 性能 | 优秀 | 良好 |
| 代表产品 | Figma, Notion | Google Docs |

### 1.2 Y.js 简介

**Y.js** 是一个高性能的 CRDT 实现库。

**核心概念：**
1. **Y.Doc** - 文档容器
2. **Shared Types** - 共享数据类型（Text, Array, Map, XML）
3. **Provider** - 同步提供者（WebSocket, IndexedDB, WebRTC）
4. **Awareness** - 用户状态（光标位置、选区）

**优势：**
- 性能优秀（比其他 CRDT 库快 10-100 倍）
- 内存占用小
- 支持多种数据类型
- 丰富的生态系统

---

## 二、安装依赖

### 2.1 安装 Y.js 相关包

```bash
pnpm --filter client add yjs @tiptap/extension-collaboration y-indexeddb
```

**依赖说明：**
- `yjs` - Y.js 核心库
- `@tiptap/extension-collaboration` - Tiptap 协同编辑扩展
- `y-indexeddb` - IndexedDB 持久化提供者

### 2.2 依赖关系

```
Tiptap Editor
    ↓
Collaboration Extension
    ↓
Y.Doc (Y.js)
    ↓
IndexedDB Provider (y-indexeddb)
```

---

## 三、创建 Y.js 工具函数

### 3.1 创建 yjs.ts 工具文件

创建 `client/src/utils/yjs.ts`：

```typescript
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

/**
 * 创建 Y.Doc 实例
 */
export function createYDoc(documentId: string): Y.Doc {
  const ydoc = new Y.Doc()
  
  // 使用 IndexedDB 持久化
  const persistence = new IndexeddbPersistence(`doc-${documentId}`, ydoc)
  
  persistence.on('synced', () => {
    console.log('📦 Y.js 文档已从 IndexedDB 加载')
  })
  
  return ydoc
}

/**
 * 获取文档的 XML Fragment
 */
export function getYFragment(ydoc: Y.Doc): Y.XmlFragment {
  return ydoc.getXmlFragment('prosemirror')
}

/**
 * 清除文档的 IndexedDB 缓存
 */
export async function clearYDocCache(documentId: string): Promise<void> {
  const dbName = `doc-${documentId}`
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName)
    
    request.onsuccess = () => {
      console.log(`🗑️ 已清除文档 ${documentId} 的缓存`)
      resolve()
    }
    
    request.onerror = () => {
      console.error(`❌ 清除文档 ${documentId} 的缓存失败`)
      reject(request.error)
    }
  })
}
```

### 3.2 关键概念解释

**Y.Doc：**
- 文档的根容器
- 包含所有共享数据
- 每个文档应该有独立的 Y.Doc 实例

**Y.XmlFragment：**
- ProseMirror 使用的数据类型
- 表示文档的 DOM 结构
- 支持富文本编辑

**IndexeddbPersistence：**
- 将 Y.Doc 持久化到浏览器的 IndexedDB
- 自动同步变更
- 支持离线编辑

---

## 四、集成 Collaboration 扩展

### 4.1 更新 TiptapEditor

```typescript
import { useMemo } from 'react'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { createYDoc, getYFragment } from '../../utils/yjs'

function TiptapEditor({ document, onUpdate, saveStatus }: TiptapEditorProps) {
  // 为每个文档创建独立的 Y.Doc
  const ydoc = useMemo(() => createYDoc(document.id.toString()), [document.id])
  
  // 创建 UndoManager
  const undoManager = useMemo(() => {
    const fragment = getYFragment(ydoc)
    return new Y.UndoManager(fragment)
  }, [ydoc])
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // 禁用内置的 History
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Collaboration.configure({
        fragment: getYFragment(ydoc),
      }),
      // ... 其他扩展
    ],
    // ... 其他配置
  }, [document.id])
  
  // ... 其他代码
}
```

### 4.2 为什么禁用 History？

**原因：**
1. Collaboration 扩展与内置 History 冲突
2. Y.js 有自己的 UndoManager
3. Y.js 的 UndoManager 支持协同编辑场景

**Y.js UndoManager 的优势：**
- 支持多用户协同
- 只撤销自己的操作
- 不会撤销其他用户的操作

---

## 五、实现 Y.js UndoManager

### 5.1 创建 UndoManager

```typescript
const undoManager = useMemo(() => {
  const fragment = getYFragment(ydoc)
  return new Y.UndoManager(fragment)
}, [ydoc])
```

### 5.2 覆盖编辑器的 undo/redo 命令

```typescript
useEffect(() => {
  if (!editor) return
  
  // 覆盖默认的 undo 命令
  editor.commands.undo = () => {
    undoManager.undo()
    return true
  }
  
  // 覆盖默认的 redo 命令
  editor.commands.redo = () => {
    undoManager.redo()
    return true
  }
  
  // 覆盖 can() 方法
  const originalCan = editor.can.bind(editor)
  editor.can = () => {
    const canChain = originalCan()
    return {
      ...canChain,
      undo: () => undoManager.canUndo(),
      redo: () => undoManager.canRedo(),
    }
  }
}, [editor, undoManager])
```

### 5.3 UndoManager 配置选项

```typescript
new Y.UndoManager(fragment, {
  trackedOrigins: new Set([ydoc.clientID]), // 只跟踪当前用户的操作
  captureTimeout: 500, // 合并操作的时间窗口（毫秒）
})
```

---

## 六、本地多窗口同步测试

### 6.1 测试步骤

1. **打开两个浏览器窗口**
   - 窗口 A：http://localhost:5173
   - 窗口 B：http://localhost:5173

2. **在两个窗口中打开同一个文档**
   - 选择相同的文档

3. **在窗口 A 中输入文字**
   - 输入："Hello from Window A"

4. **观察窗口 B**
   - 应该实时看到文字出现

5. **在窗口 B 中输入文字**
   - 输入："Hello from Window B"

6. **观察窗口 A**
   - 应该实时看到文字出现

### 6.2 验证 IndexedDB 持久化

1. **输入一些内容**
2. **刷新页面**
3. **内容应该保留**（从 IndexedDB 加载）

**查看 IndexedDB：**
- 打开浏览器开发者工具
- Application → IndexedDB
- 找到 `doc-{documentId}` 数据库

---

## 七、数据流程图

### 7.1 本地同步流程

```
窗口 A                    Y.Doc                    窗口 B
  |                         |                         |
  |-- 用户输入 ------------>|                         |
  |                         |-- 更新 Y.Doc ---------->|
  |                         |                         |-- 更新编辑器
  |                         |<-- 用户输入 ------------|
  |<-- 更新编辑器 ----------|                         |
```

### 7.2 持久化流程

```
编辑器
  ↓
Y.Doc (内存)
  ↓
IndexedDB Provider
  ↓
IndexedDB (浏览器存储)
```

---

## 八、常见问题排查

### 8.1 多窗口不同步

**问题：** 两个窗口的内容不同步

**可能原因：**
1. 使用了不同的 Y.Doc 实例
2. 没有正确配置 Collaboration 扩展
3. 浏览器不支持 IndexedDB

**解决方案：**
```typescript
// 确保每个文档 ID 对应一个 Y.Doc
const ydoc = useMemo(() => createYDoc(document.id.toString()), [document.id])
```

### 8.2 刷新后内容丢失

**问题：** 刷新页面后，编辑的内容消失

**可能原因：**
1. IndexedDB 持久化未正确配置
2. 浏览器清除了 IndexedDB
3. 文档 ID 变化导致加载了不同的缓存

**解决方案：**
- 检查 IndexeddbPersistence 是否正确初始化
- 确保文档 ID 一致
- 查看浏览器控制台是否有错误

### 8.3 撤销/重做不工作

**问题：** 点击撤销/重做按钮没有反应

**可能原因：**
1. 没有正确覆盖 undo/redo 命令
2. UndoManager 未正确初始化
3. History 扩展未禁用

**解决方案：**
- 确保 `history: false` 配置生效
- 检查 UndoManager 是否正确创建
- 查看控制台是否有错误

---

## 九、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 安装 Y.js 和相关依赖
- ✅ 创建 Y.Doc 实例
- ✅ 集成 Collaboration 扩展
- ✅ 实现本地多窗口同步
- ✅ 实现 IndexedDB 持久化
- ✅ 集成 Y.js UndoManager

### 核心概念
- ✅ CRDT 算法原理
- ✅ Y.js 核心概念
- ✅ Shared Types 使用
- ✅ 本地数据持久化
- ✅ UndoManager 使用

### 关键技术点

**1. Y.js 基础**
- Y.Doc 创建和管理
- Y.XmlFragment 使用
- IndexedDB 持久化

**2. Tiptap 集成**
- Collaboration 扩展配置
- 禁用内置 History
- 自定义 undo/redo 命令

**3. 数据同步**
- 本地多窗口同步
- 自动冲突解决
- 最终一致性

现在我们已经实现了本地协同编辑的基础功能！下一章我们将搭建 WebSocket 服务器，实现真正的多人实时协同。

---

## 十、下一章预告

在下一章（Chapter 12）中，我们将搭建 Hocuspocus WebSocket 服务器，实现跨设备的实时协同编辑。

准备好了吗？让我们继续前进！🚀
