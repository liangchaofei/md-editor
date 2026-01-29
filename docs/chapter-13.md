# Chapter 13: 协同编辑优化

## 本章目标

优化协同编辑的用户体验，添加连接状态指示、离线提示、重连机制等功能：
- ✅ 实现连接状态指示器
- ✅ 实现在线用户数量显示
- ✅ 实现离线编辑提示
- ✅ 实现自动重连机制
- ✅ 实现同步状态显示
- ✅ 优化用户体验

**学习重点：**
- WebSocket 连接状态管理
- 用户体验设计
- 错误处理和重连策略
- 状态同步机制

---

## 一、连接状态管理

### 1.1 连接状态类型

WebSocket 连接有以下几种状态：

```typescript
type ConnectionStatus = 
  | 'connecting'    // 正在连接
  | 'connected'     // 已连接
  | 'disconnected'  // 已断开
  | 'reconnecting'  // 正在重连
```

### 1.2 同步状态类型

文档同步也有不同的状态：

```typescript
type SyncStatus = 
  | 'syncing'   // 正在同步
  | 'synced'    // 已同步
  | 'error'     // 同步错误
```

---

## 二、创建连接状态 Hook

### 2.1 创建 useCollaborationStatus Hook

创建 `client/src/hooks/useCollaborationStatus.ts`：

```typescript
import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export interface CollaborationStatus {
  // 连接状态
  status: 'connecting' | 'connected' | 'disconnected'
  // 是否已同步
  synced: boolean
  // 在线用户数（包括自己）
  userCount: number
}

export function useCollaborationStatus(provider: HocuspocusProvider | null): CollaborationStatus {
  const [status, setStatus] = useState<CollaborationStatus>({
    status: 'connecting',
    synced: false,
    userCount: 0,
  })

  useEffect(() => {
    if (!provider) return

    // 监听连接状态
    const handleStatus = ({ status }: { status: string }) => {
      setStatus(prev => ({ ...prev, status: status as any }))
    }

    // 监听同步状态
    const handleSynced = ({ state }: { state: boolean }) => {
      setStatus(prev => ({ ...prev, synced: state }))
    }

    // 监听 Awareness 变化（用户上线/下线）
    const handleAwarenessChange = () => {
      const userCount = provider.awareness?.getStates().size || 0
      setStatus(prev => ({ ...prev, userCount }))
    }

    // 绑定事件
    provider.on('status', handleStatus)
    provider.on('synced', handleSynced)
    provider.awareness?.on('change', handleAwarenessChange)

    // 初始化用户数量
    handleAwarenessChange()

    // 清理
    return () => {
      provider.off('status', handleStatus)
      provider.off('synced', handleSynced)
      provider.awareness?.off('change', handleAwarenessChange)
    }
  }, [provider])

  return status
}
```

**关键点：**
- 使用 `useState` 管理连接状态
- 监听 Provider 的多个事件
- 使用 Awareness 获取在线用户数
- 正确清理事件监听器

---

## 三、创建连接状态指示器组件

### 3.1 创建 ConnectionStatus 组件

创建 `client/src/components/editor/ConnectionStatus.tsx`：

```typescript
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface ConnectionStatusProps {
  provider: HocuspocusProvider | null
}

function ConnectionStatus({ provider }: ConnectionStatusProps) {
  const { status, synced, userCount } = useCollaborationStatus(provider)

  // 根据状态显示不同的图标和文字
  const getStatusInfo = () => {
    if (status === 'connected' && synced) {
      return {
        icon: '🟢',
        text: '已连接',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      }
    }

    if (status === 'connected' && !synced) {
      return {
        icon: '🟡',
        text: '同步中',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      }
    }

    if (status === 'connecting') {
      return {
        icon: '🟡',
        text: '连接中',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      }
    }

    return {
      icon: '🔴',
      text: '已断开',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex items-center gap-3">
      {/* 连接状态 */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${statusInfo.bgColor}`}>
        <span className="text-sm">{statusInfo.icon}</span>
        <span className={`text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* 在线用户数 */}
      {status === 'connected' && userCount > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50">
          <span className="text-sm">👥</span>
          <span className="text-xs font-medium text-blue-600">
            {userCount} 人在线
          </span>
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus
```

**设计要点：**
- 使用 Emoji 图标增加视觉效果
- 不同状态使用不同颜色
- 显示在线用户数量
- 简洁清晰的 UI

---

## 四、集成到编辑器

### 4.1 更新 TiptapEditor 组件

修改 `client/src/components/editor/TiptapEditor.tsx`：

```typescript
import ConnectionStatus from './ConnectionStatus'

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // ... 现有代码 ...

  return (
    <div className="flex h-full flex-col bg-white">
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
          
          {/* 连接状态指示器 */}
          <ConnectionStatus provider={provider} />
        </div>
      </div>

      {/* 固定工具栏 */}
      <MenuBar editor={editor} />

      {/* 浮动工具栏 */}
      <BubbleMenu editor={editor} />

      {/* 编辑器内容 */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* 状态栏 */}
      <EditorStatusBar editor={editor} saveStatus={saveStatus} />
    </div>
  )
}
```

---

## 五、实现离线编辑提示

### 5.1 创建 OfflineBanner 组件

创建 `client/src/components/editor/OfflineBanner.tsx`：

```typescript
interface OfflineBannerProps {
  isOffline: boolean
}

function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-8 py-3">
      <div className="flex items-center gap-2">
        <span className="text-yellow-600">⚠️</span>
        <p className="text-sm text-yellow-800">
          <span className="font-medium">离线模式</span>
          {' - '}
          您的更改将在重新连接后自动同步
        </p>
      </div>
    </div>
  )
}

export default OfflineBanner
```

### 5.2 集成到编辑器

```typescript
import OfflineBanner from './OfflineBanner'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // ... 现有代码 ...
  
  const { status } = useCollaborationStatus(provider)
  const isOffline = status === 'disconnected'

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 离线提示 */}
      <OfflineBanner isOffline={isOffline} />

      {/* 文档标题和连接状态 */}
      {/* ... 其他代码 ... */}
    </div>
  )
}
```

---

## 六、优化重连机制

### 6.1 配置自动重连

更新 `client/src/utils/yjs.ts`：

```typescript
export function createHocuspocusProvider(documentId: string, ydoc: Y.Doc): HocuspocusProvider {
  const provider = new HocuspocusProvider({
    url: 'ws://localhost:1234',
    name: documentId,
    document: ydoc,
    
    // 重连配置
    maxAttempts: 0, // 无限重连
    delay: 1000, // 初始延迟 1 秒
    factor: 2, // 指数退避因子
    maxDelay: 30000, // 最大延迟 30 秒
    minDelay: 1000, // 最小延迟 1 秒
    jitter: true, // 添加随机抖动
    
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
  
  return provider
}
```

**重连策略说明：**
- `maxAttempts: 0` - 无限重连，永不放弃
- `delay: 1000` - 第一次重连等待 1 秒
- `factor: 2` - 每次失败后延迟翻倍（指数退避）
- `maxDelay: 30000` - 最长等待 30 秒
- `jitter: true` - 添加随机抖动，避免多个客户端同时重连

**重连时间序列：**
```
1秒 → 2秒 → 4秒 → 8秒 → 16秒 → 30秒 → 30秒 → ...
```

---

## 七、添加重连提示

### 7.1 创建 ReconnectingBanner 组件

创建 `client/src/components/editor/ReconnectingBanner.tsx`：

```typescript
interface ReconnectingBannerProps {
  isReconnecting: boolean
}

function ReconnectingBanner({ isReconnecting }: ReconnectingBannerProps) {
  if (!isReconnecting) return null

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-8 py-3">
      <div className="flex items-center gap-2">
        <div className="animate-spin">
          <span className="text-blue-600">🔄</span>
        </div>
        <p className="text-sm text-blue-800">
          <span className="font-medium">正在重新连接</span>
          {' - '}
          请稍候...
        </p>
      </div>
    </div>
  )
}

export default ReconnectingBanner
```

### 7.2 集成到编辑器

```typescript
import ReconnectingBanner from './ReconnectingBanner'

function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  // ... 现有代码 ...
  
  const { status } = useCollaborationStatus(provider)
  const isOffline = status === 'disconnected'
  const isReconnecting = status === 'connecting' && provider !== null

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 重连提示 */}
      <ReconnectingBanner isReconnecting={isReconnecting} />
      
      {/* 离线提示 */}
      <OfflineBanner isOffline={isOffline} />

      {/* ... 其他代码 ... */}
    </div>
  )
}
```

---

## 八、优化状态栏

### 8.1 更新 EditorStatusBar

修改 `client/src/components/editor/EditorStatusBar.tsx`，添加同步状态：

```typescript
import type { Editor } from '@tiptap/react'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'

interface EditorStatusBarProps {
  editor: Editor
  saveStatus?: 'saved' | 'saving' | 'unsaved'
  provider?: HocuspocusProvider | null
}

function EditorStatusBar({ editor, saveStatus = 'unsaved', provider }: EditorStatusBarProps) {
  const { synced } = useCollaborationStatus(provider || null)
  
  const characters = editor.storage.characterCount.characters()
  const words = editor.storage.characterCount.words()

  // 保存状态文本
  const getSaveStatusText = () => {
    if (saveStatus === 'saved') return '已保存'
    if (saveStatus === 'saving') return '保存中...'
    return '未保存'
  }

  // 同步状态文本
  const getSyncStatusText = () => {
    if (!provider) return null
    return synced ? '已同步' : '同步中...'
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-8 py-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          {/* 字数统计 */}
          <span>{characters} 字符</span>
          <span>{words} 词</span>
        </div>

        <div className="flex items-center gap-4">
          {/* 同步状态 */}
          {provider && (
            <span className={synced ? 'text-green-600' : 'text-yellow-600'}>
              {getSyncStatusText()}
            </span>
          )}
          
          {/* 保存状态 */}
          <span className={saveStatus === 'saved' ? 'text-green-600' : 'text-gray-500'}>
            {getSaveStatusText()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default EditorStatusBar
```

---

## 九、测试功能

### 9.1 测试连接状态

1. **启动服务器**
   ```bash
   pnpm dev
   ```

2. **打开浏览器**
   - 访问 http://localhost:5173
   - 打开一个文档
   - 观察右上角的连接状态指示器

3. **测试连接状态**
   - 应该显示 "🟢 已连接"
   - 应该显示 "👥 1 人在线"

### 9.2 测试多用户

1. **打开第二个标签页**
   - 打开同一个文档
   - 观察用户数量变化

2. **应该显示**
   - "👥 2 人在线"

### 9.3 测试离线模式

1. **停止服务器**
   - 在终端按 Ctrl+C 停止服务器

2. **观察浏览器**
   - 应该显示 "🔴 已断开"
   - 应该显示黄色的离线提示横幅

3. **输入文字**
   - 仍然可以编辑
   - 内容保存在本地（IndexedDB）

### 9.4 测试自动重连

1. **重新启动服务器**
   ```bash
   pnpm dev
   ```

2. **观察浏览器**
   - 应该显示蓝色的 "正在重新连接" 横幅
   - 几秒后自动连接成功
   - 显示 "🟢 已连接"
   - 离线时的编辑内容自动同步

---

## 十、用户体验优化

### 10.1 添加过渡动画

在 `client/src/styles/index.css` 中添加：

```css
/* 连接状态过渡动画 */
.connection-status {
  transition: all 0.3s ease;
}

/* 横幅滑入动画 */
@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.banner-enter {
  animation: slideDown 0.3s ease;
}
```

### 10.2 添加加载骨架屏

当编辑器正在连接时，显示加载状态：

```typescript
function TiptapEditor({ document, onUpdate, saveStatus = 'unsaved' }: TiptapEditorProps) {
  const { status } = useCollaborationStatus(provider)
  const isInitializing = status === 'connecting' && !editor

  if (isInitializing) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔄</div>
          <p className="text-gray-600">正在连接协同服务器...</p>
        </div>
      </div>
    )
  }

  // ... 其他代码 ...
}
```

---

## 十一、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 实现连接状态指示器（已连接/连接中/已断开）
- ✅ 实现在线用户数量显示
- ✅ 实现离线编辑提示横幅
- ✅ 实现自动重连机制（指数退避）
- ✅ 实现重连提示横幅
- ✅ 优化状态栏显示同步状态
- ✅ 添加过渡动画和加载状态

### 核心概念
- ✅ WebSocket 连接状态管理
- ✅ 自定义 React Hook 封装
- ✅ Awareness 状态使用
- ✅ 指数退避重连策略
- ✅ 用户体验设计原则

### 关键技术点

**1. 连接状态管理**
- 使用自定义 Hook 封装状态逻辑
- 监听 Provider 的多个事件
- 实时更新 UI 状态

**2. 重连策略**
- 指数退避算法
- 随机抖动避免雷鸣群效应
- 无限重连保证可用性

**3. 用户体验**
- 清晰的状态指示
- 友好的错误提示
- 流畅的过渡动画
- 离线编辑支持

现在我们的协同编辑器已经具备了完善的连接管理和用户体验！用户可以清楚地看到连接状态、在线人数，并且在网络断开时仍然可以继续编辑，重新连接后自动同步。

---

## 十二、下一章预告

在下一章（Chapter 14）中，我们将实现协作光标和用户信息显示，让用户可以看到其他人的光标位置和编辑状态。

准备好了吗？让我们继续前进！🚀
