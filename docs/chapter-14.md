# Chapter 14: 协作光标和用户信息

## 本章目标

实现协作光标显示，让用户可以看到其他人的编辑位置和状态：
- ✅ 集成 CollaborationCursor 扩展
- ✅ 为每个用户分配唯一颜色
- ✅ 显示用户名标签
- ✅ 实现在线用户列表
- ✅ 优化光标样式和动画

**学习重点：**
- Tiptap CollaborationCursor 扩展
- Awareness 状态管理
- 用户信息同步
- CSS 样式和动画

---

## 一、协作光标原理

### 1.1 什么是协作光标？

协作光标（Collaboration Cursor）是多人协同编辑中的重要功能，它可以：
- 显示其他用户的光标位置
- 显示其他用户的选区（高亮）
- 显示用户名标签
- 使用不同颜色区分用户

### 1.2 技术原理

协作光标基于 **Y.js Awareness** 实现：

```
用户 A                    Hocuspocus Server              用户 B
  |                              |                           |
  |-- 光标位置 (pos: 10) ------->|                           |
  |                              |-- 广播 Awareness -------->|
  |                              |                           |-- 渲染光标
  |                              |<-- 光标位置 (pos: 20) ----|
  |<-- 渲染光标 -----------------|                           |
```

**Awareness 包含的信息：**
- `user` - 用户信息（名称、颜色）
- `cursor` - 光标位置
- `selection` - 选区范围

---

## 二、技术方案选择

### 2.1 为什么使用自定义实现？

由于 Tiptap v3 的官方 `@tiptap/extension-collaboration-cursor` 扩展尚未发布稳定版本，我们选择**自己实现协作光标功能**。

**优势：**
- ✅ 完全兼容 Tiptap v3
- ✅ 直接使用 Y.js Awareness API
- ✅ 更灵活的定制能力
- ✅ 不依赖第三方扩展的更新

### 2.2 安装依赖

```bash
pnpm --filter client add @tiptap/core
```

### 2.3 依赖说明

- `@tiptap/core` - Tiptap 核心库（用于创建自定义扩展）
- `@tiptap/pm` - ProseMirror 相关类型（已安装）
- 使用 Y.js Awareness API 同步光标位置

---

## 三、创建自定义协作光标扩展

### 3.1 创建扩展文件

创建 `client/src/extensions/CustomCollaborationCursor.ts`：

```typescript
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export interface CustomCollaborationCursorOptions {
  provider: HocuspocusProvider | null
  user: {
    name: string
    color: string
  }
}

export const CustomCollaborationCursor = Extension.create<CustomCollaborationCursorOptions>({
  name: 'customCollaborationCursor',

  addOptions() {
    return {
      provider: null,
      user: {
        name: 'Anonymous',
        color: '#000000',
      },
    }
  },

  addProseMirrorPlugins() {
    const { provider } = this.options

    if (!provider) {
      return []
    }

    return [
      new Plugin({
        key: new PluginKey('customCollaborationCursor'),
        
        state: {
          init() {
            return DecorationSet.empty
          },
          
          apply(tr, oldState) {
            // 如果文档没有变化，保持旧状态
            if (!tr.docChanged && !tr.selectionSet) {
              return oldState
            }

            // 更新本地用户的光标位置到 Awareness
            if (tr.selectionSet && provider.awareness) {
              const { from, to } = tr.selection
              provider.awareness.setLocalStateField('cursor', {
                anchor: from,
                head: to,
              })
            }

            // 创建装饰集
            return createDecorations(tr.doc, provider)
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

// 创建光标装饰的辅助函数
function createDecorations(doc: any, provider: HocuspocusProvider) {
  const decorations: Decoration[] = []
  const awareness = provider.awareness

  if (!awareness) {
    return DecorationSet.empty
  }

  const localClientId = awareness.clientID
  const states = awareness.getStates()

  states.forEach((state, clientId) => {
    // 跳过本地用户
    if (clientId === localClientId) {
      return
    }

    const user = state.user
    const cursor = state.cursor

    if (!user || !cursor) {
      return
    }

    const { anchor, head } = cursor
    const { name, color } = user

    try {
      if (anchor === head) {
        // 单点光标
        const decoration = Decoration.widget(anchor, () => {
          const cursor = document.createElement('span')
          cursor.className = 'collaboration-cursor__caret'
          cursor.style.borderColor = color

          const label = document.createElement('span')
          label.className = 'collaboration-cursor__label'
          label.style.backgroundColor = color
          label.textContent = name

          cursor.appendChild(label)
          return cursor
        }, { side: -1 })

        decorations.push(decoration)
      } else {
        // 选区高亮
        const from = Math.min(anchor, head)
        const to = Math.max(anchor, head)

        if (from >= 0 && to <= doc.content.size) {
          const decoration = Decoration.inline(from, to, {
            class: 'collaboration-cursor__selection',
            style: `background-color: ${color}`,
          })

          decorations.push(decoration)

          // 在选区末尾添加光标
          const cursorDecoration = Decoration.widget(to, () => {
            const cursor = document.createElement('span')
            cursor.className = 'collaboration-cursor__caret'
            cursor.style.borderColor = color

            const label = document.createElement('span')
            label.className = 'collaboration-cursor__label'
            label.style.backgroundColor = color
            label.textContent = name

            cursor.appendChild(label)
            return cursor
          }, { side: -1 })

          decorations.push(cursorDecoration)
        }
      }
    } catch (error) {
      console.warn('创建光标装饰失败:', error)
    }
  })

  return DecorationSet.create(doc, decorations)
}
```

**关键技术点：**

1. **Extension.create** - 创建 Tiptap 扩展
2. **ProseMirror Plugin** - 使用 ProseMirror 插件系统
3. **Decoration** - 创建视觉装饰（光标和选区）
4. **Awareness API** - 同步光标位置到其他客户端

---

## 四、生成用户颜色

### 3.1 创建颜色生成工具

创建 `client/src/utils/colors.ts`：

```typescript
/**
 * 用户颜色生成工具
 */

// 预定义的颜色列表（柔和且易区分）
const COLORS = [
  '#FF6B6B', // 红色
  '#4ECDC4', // 青色
  '#45B7D1', // 蓝色
  '#FFA07A', // 橙色
  '#98D8C8', // 薄荷绿
  '#F7DC6F', // 黄色
  '#BB8FCE', // 紫色
  '#85C1E2', // 天蓝
  '#F8B739', // 金色
  '#52B788', // 绿色
]

/**
 * 根据用户名生成一致的颜色
 * 同一个用户名总是返回相同的颜色
 */
export function getUserColor(name: string): string {
  // 使用简单的哈希算法
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // 转换为 32 位整数
  }
  
  // 取绝对值并映射到颜色数组
  const index = Math.abs(hash) % COLORS.length
  return COLORS[index]
}

/**
 * 获取随机用户名（用于演示）
 */
export function getRandomUserName(): string {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '友善的', '活泼的']
  const nouns = ['小猫', '小狗', '小鸟', '小兔', '小熊']
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  
  return `${adj}${noun}`
}
```

**设计要点：**
- 使用预定义的柔和颜色
- 哈希算法确保同名用户颜色一致
- 颜色易于区分
- 提供随机用户名生成（演示用）

---

## 四、配置用户信息

### 4.1 更新 yjs.ts

修改 `client/src/utils/yjs.ts`，添加用户信息配置：

```typescript
import { getUserColor, getRandomUserName } from './colors'

/**
 * 创建 Hocuspocus Provider
 */
export function createHocuspocusProvider(documentId: string, ydoc: Y.Doc): HocuspocusProvider {
  // 生成用户信息
  const userName = getRandomUserName()
  const userColor = getUserColor(userName)
  
  const provider = new HocuspocusProvider({
    url: 'ws://localhost:1234',
    name: documentId,
    document: ydoc,
    
    // 重连配置
    maxAttempts: 0,
    delay: 1000,
    factor: 2,
    maxDelay: 30000,
    minDelay: 1000,
    jitter: true,
    
    onConnect: () => {
      console.log('🔌 已连接到 Hocuspocus 服务器')
    },
    
    onDisconnect: ({ event }) => {
      console.log('🔌 已断开连接', event)
    },
    
    onStatus: ({ status }) => {
      console.log('📡 连接状态:', status)
    },
    
    onSynced: ({ state }) => {
      console.log('🔄 同步状态:', state ? '已同步' : '未同步')
    },
  })
  
  // 设置用户信息到 Awareness
  provider.setAwarenessField('user', {
    name: userName,
    color: userColor,
  })
  
  console.log(`👤 当前用户: ${userName} (${userColor})`)
  
  return provider
}
```

**关键点：**
- 使用 `setAwarenessField` 设置用户信息
- 用户信息包含 `name` 和 `color`
- 这些信息会自动同步到所有客户端

---

## 五、集成 CollaborationCursor 扩展

### 5.1 更新 TiptapEditor

修改 `client/src/components/editor/TiptapEditor.tsx`：

```typescript
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // ... 现有代码 ...
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'default',
      }),
      // 添加协作光标扩展
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: 'Anonymous', // 会被 Awareness 中的用户信息覆盖
          color: '#000000',
        },
      }),
      Placeholder.configure({
        placeholder: '开始输入内容...',
      }),
      CharacterCount,
    ],
    // ... 其他配置 ...
  }, [document.id, ydoc])
  
  // ... 其他代码 ...
}
```

**配置说明：**
- `provider` - 传入 HocuspocusProvider
- `user` - 默认用户信息（会被 Awareness 覆盖）
- 扩展会自动监听 Awareness 变化

---

## 六、自定义光标样式

### 6.1 添加 CSS 样式

在 `client/src/styles/index.css` 中添加：

```css
/* 协作光标样式 */
.collaboration-cursor__caret {
  position: relative;
  margin-left: -1px;
  margin-right: -1px;
  border-left: 1px solid #0d0d0d;
  border-right: 1px solid #0d0d0d;
  word-break: normal;
  pointer-events: none;
}

/* 光标标签 */
.collaboration-cursor__label {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  user-select: none;
  color: #fff;
  padding: 0.1rem 0.3rem;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
}

/* 选区高亮 */
.collaboration-cursor__selection {
  opacity: 0.3;
}

/* 光标动画 */
.collaboration-cursor__caret {
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}
```

**样式说明：**
- `.collaboration-cursor__caret` - 光标线条
- `.collaboration-cursor__label` - 用户名标签
- `.collaboration-cursor__selection` - 选区高亮
- `blink` 动画 - 光标闪烁效果

---

## 七、创建在线用户列表

### 7.1 创建 OnlineUsers 组件

创建 `client/src/components/editor/OnlineUsers.tsx`：

```typescript
/**
 * 在线用户列表组件
 */

import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface User {
  clientId: number
  name: string
  color: string
}

interface OnlineUsersProps {
  provider: HocuspocusProvider | null
}

function OnlineUsers({ provider }: OnlineUsersProps) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (!provider) return

    const updateUsers = () => {
      const states = provider.awareness?.getStates()
      if (!states) return

      const userList: User[] = []
      states.forEach((state, clientId) => {
        if (state.user) {
          userList.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
          })
        }
      })

      setUsers(userList)
    }

    // 监听 Awareness 变化
    provider.awareness?.on('change', updateUsers)
    provider.awareness?.on('update', updateUsers)

    // 初始化
    updateUsers()

    return () => {
      provider.awareness?.off('change', updateUsers)
      provider.awareness?.off('update', updateUsers)
    }
  }, [provider])

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">在线用户:</span>
      <div className="flex -space-x-2">
        {users.map((user) => (
          <div
            key={user.clientId}
            className="relative group"
            title={user.name}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0)}
            </div>
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {user.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OnlineUsers
```

**组件特点：**
- 显示所有在线用户的头像
- 头像使用用户颜色
- 显示用户名首字母
- 悬停显示完整用户名
- 头像重叠排列（节省空间）

### 7.2 集成到编辑器

修改 `client/src/components/editor/TiptapEditor.tsx`：

```typescript
import OnlineUsers from './OnlineUsers'

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // ... 现有代码 ...

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 重连提示 */}
      <ReconnectingBanner isReconnecting={isReconnecting} />
      
      {/* 离线提示 */}
      <OfflineBanner isOffline={isOffline} />

      {/* 文档标题和连接状态 */}
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
            {/* 连接状态指示器 */}
            <ConnectionStatus provider={provider} />
            
            {/* 在线用户列表 */}
            <OnlineUsers provider={provider} />
          </div>
        </div>
      </div>

      {/* ... 其他代码 ... */}
    </div>
  )
}
```

---

## 八、测试功能

### 8.1 测试协作光标

1. **启动服务器**
   ```bash
   pnpm dev
   ```

2. **打开两个浏览器标签页**
   - 标签页 A 和 B 都打开同一个文档

3. **观察用户信息**
   - 每个标签页应该显示不同的用户名（如"快乐的小猫"）
   - 右上角显示在线用户头像

4. **测试光标显示**
   - 在标签页 A 中点击编辑器
   - 在标签页 B 中应该看到标签页 A 的光标（带用户名标签）
   - 光标颜色与用户头像颜色一致

5. **测试选区高亮**
   - 在标签页 A 中选中一段文字
   - 在标签页 B 中应该看到高亮的选区

### 8.2 测试用户列表

1. **打开多个标签页**
   - 打开 3-4 个标签页，都打开同一个文档

2. **观察用户列表**
   - 右上角应该显示所有在线用户的头像
   - 头像重叠排列
   - 悬停显示用户名

3. **测试用户离线**
   - 关闭一个标签页
   - 其他标签页的用户列表应该更新

---

## 九、优化用户体验

### 9.1 添加用户名输入

在实际应用中，应该让用户输入自己的名字。可以创建一个简单的弹窗：

```typescript
// 示例：从 localStorage 获取或提示输入
function getUserName(): string {
  let name = localStorage.getItem('userName')
  
  if (!name) {
    name = prompt('请输入您的名字：') || getRandomUserName()
    localStorage.setItem('userName', name)
  }
  
  return name
}
```

### 9.2 优化光标性能

对于大型文档，可以限制显示的光标数量：

```typescript
CollaborationCursor.configure({
  provider: provider,
  user: { name: userName, color: userColor },
  render: (user) => {
    // 自定义渲染逻辑
    const cursor = document.createElement('span')
    cursor.classList.add('collaboration-cursor__caret')
    cursor.style.borderColor = user.color
    return cursor
  },
})
```

### 9.3 添加用户状态

可以扩展 Awareness 显示用户状态（编辑/查看）：

```typescript
provider.setAwarenessField('user', {
  name: userName,
  color: userColor,
  status: 'editing', // 或 'viewing'
})
```

---

## 十、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 集成 CollaborationCursor 扩展
- ✅ 实现用户颜色生成算法
- ✅ 配置用户信息到 Awareness
- ✅ 显示其他用户的光标和选区
- ✅ 创建在线用户列表组件
- ✅ 自定义光标样式和动画

### 核心概念
- ✅ Awareness 状态管理
- ✅ 用户信息同步机制
- ✅ 光标位置计算
- ✅ CSS 样式定制

### 关键技术点

**1. Awareness 机制**
- 每个客户端维护自己的状态
- 状态自动同步到所有客户端
- 包含用户信息、光标位置等

**2. 颜色生成**
- 使用哈希算法确保一致性
- 预定义柔和易区分的颜色
- 同名用户颜色相同

**3. 光标渲染**
- CollaborationCursor 自动处理
- 可自定义样式和动画
- 性能优化（虚拟化）

**4. 用户列表**
- 实时更新在线用户
- 头像重叠排列
- 悬停显示详情

现在我们的协同编辑器已经具备了完整的多用户协作体验！用户可以看到其他人的光标位置、选区高亮，以及在线用户列表。

---

## 十一、下一章预告

在下一章（Chapter 15）中，我们将实现评论功能，让用户可以对文档内容进行评论和讨论。

准备好了吗？让我们继续前进！🚀
