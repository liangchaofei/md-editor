# Chapter 12: Hocuspocus WebSocket 服务器

## 本章目标

搭建 Hocuspocus WebSocket 服务器，实现真正的多人实时协同编辑：
- ✅ 安装 Hocuspocus Server
- ✅ 配置 WebSocket 服务
- ✅ 集成数据库持久化扩展
- ✅ 实现文档加载和保存
- ✅ 前端连接 WebSocket 服务器
- ✅ 实现跨设备实时同步

**学习重点：**
- WebSocket 原理
- Hocuspocus 架构
- 扩展系统使用
- 数据持久化策略

---

## 一、WebSocket 简介

### 1.1 什么是 WebSocket？

**WebSocket** 是一种在单个 TCP 连接上进行全双工通信的协议。

**特点：**
- 持久连接（不需要反复建立连接）
- 双向通信（服务器可以主动推送）
- 低延迟（实时性好）
- 较小的开销（相比 HTTP 轮询）

**WebSocket vs HTTP：**

| 特性 | WebSocket | HTTP |
|------|-----------|------|
| 连接方式 | 持久连接 | 短连接 |
| 通信方向 | 双向 | 单向（请求-响应） |
| 实时性 | 优秀 | 较差 |
| 开销 | 小 | 大（每次请求都有 Header） |
| 适用场景 | 实时协同、聊天、游戏 | 普通 API 请求 |

### 1.2 Hocuspocus 简介

**Hocuspocus** 是一个基于 Y.js 的 WebSocket 服务器。

**核心功能：**
- WebSocket 服务器
- Y.js 文档同步
- 扩展系统（认证、持久化、日志等）
- 连接管理
- 房间管理

**架构：**
```
客户端 A ←→ WebSocket ←→ Hocuspocus Server ←→ 数据库
客户端 B ←→ WebSocket ←→ Hocuspocus Server
客户端 C ←→ WebSocket ←→ Hocuspocus Server
```

---

## 二、安装服务器端依赖

### 2.1 安装 Hocuspocus

```bash
pnpm --filter server add @hocuspocus/server @hocuspocus/extension-database
```

**依赖说明：**
- `@hocuspocus/server` - Hocuspocus 核心服务器
- `@hocuspocus/extension-database` - 数据库持久化扩展

### 2.2 依赖关系

```
Hocuspocus Server
    ↓
Database Extension
    ↓
SQLite Database
```

---

## 三、创建 Hocuspocus 服务器

### 3.1 创建服务器文件

创建 `server/src/hocuspocus.ts`：

```typescript
import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { getDatabase } from './database/index.js'

export function createHocuspocusServer() {
  const db = getDatabase()

  const server = new Server({
    port: 1234,
    
    extensions: [
      new Database({
        // 从数据库加载文档
        fetch: async ({ documentName }) => {
          console.log(`📄 加载文档: ${documentName}`)
          
          const doc = db.prepare('SELECT yjs_state FROM documents WHERE id = ?')
            .get(documentName)
          
          if (doc && doc.yjs_state) {
            return doc.yjs_state
          }
          
          return null
        },

        // 保存文档到数据库
        store: async ({ documentName, state }) => {
          console.log(`💾 保存文档: ${documentName}`)
          
          db.prepare(`
            UPDATE documents 
            SET yjs_state = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(state, documentName)
        },
      }),
    ],

    // 连接建立时的回调
    onConnect: () => {
      console.log('🔌 客户端已连接')
    },

    // 连接断开时的回调
    onDisconnect: () => {
      console.log('🔌 客户端已断开')
    },
  })

  return server
}
```

### 3.2 关键配置说明

**port：**
- WebSocket 服务器端口
- 与 HTTP 服务器端口分开（HTTP: 3000, WebSocket: 1234）

**extensions：**
- 扩展系统，可以添加各种功能
- Database 扩展用于持久化

**fetch：**
- 从数据库加载文档的初始状态
- 返回 Y.js 的二进制状态（Buffer）

**store：**
- 将文档状态保存到数据库
- 自动调用（文档变更时）

---

## 四、集成到主服务器

### 4.1 更新 server/src/index.ts

```typescript
import { startHocuspocusServer } from './hocuspocus.js'

async function startServer() {
  try {
    // 初始化数据库
    initDatabase()

    // 启动 Hocuspocus WebSocket 服务器
    await startHocuspocusServer()

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log('🚀 服务器启动成功！')
      console.log(`📍 HTTP 服务: http://localhost:${PORT}`)
      console.log(`🔌 WebSocket 服务: ws://localhost:1234`)
    })
  } catch (error) {
    console.error('❌ 服务器启动失败:', error)
    process.exit(1)
  }
}
```

### 4.2 启动服务器

```bash
pnpm dev
```

**应该看到：**
```
🚀 Hocuspocus 服务器已启动在端口 1234
🚀 服务器启动成功！
📍 HTTP 服务: http://localhost:3000
🔌 WebSocket 服务: ws://localhost:1234
```

---

## 五、前端集成 WebSocket Provider

### 5.1 安装客户端依赖

```bash
pnpm --filter client add @hocuspocus/provider
```

### 5.2 更新 yjs.ts 工具

```typescript
import { HocuspocusProvider } from '@hocuspocus/provider'

export function createHocuspocusProvider(
  documentId: string, 
  ydoc: Y.Doc
): HocuspocusProvider {
  const provider = new HocuspocusProvider({
    url: 'ws://localhost:1234',
    name: documentId,
    document: ydoc,
    
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

### 5.3 更新 TiptapEditor

```typescript
function TiptapEditor({ document, onUpdate, saveStatus }: TiptapEditorProps) {
  // 创建 Y.Doc
  const ydoc = useMemo(() => createYDoc(document.id.toString()), [document.id])
  
  // 创建 Hocuspocus Provider
  const provider = useMemo(() => {
    return createHocuspocusProvider(document.id.toString(), ydoc)
  }, [document.id, ydoc])
  
  // 清理 provider
  useEffect(() => {
    return () => {
      provider.destroy()
    }
  }, [provider])
  
  // ... 其他代码
}
```

---

## 六、测试实时协同

### 6.1 测试步骤

1. **启动服务器**
   ```bash
   pnpm dev
   ```

2. **打开第一个浏览器窗口**
   - 访问：http://localhost:5173
   - 打开一个文档
   - 打开浏览器控制台（F12），应该看到：
     ```
     📦 Y.js 文档已从 IndexedDB 加载
     🔌 已连接到 Hocuspocus 服务器
     📡 连接状态: connected
     🔄 同步状态: 已同步
     ```

3. **打开第二个浏览器窗口**
   - 新建标签页或使用无痕模式
   - 访问：http://localhost:5173
   - 打开**同一个文档**
   - 同样打开控制台，确认连接成功

4. **测试实时同步**
   - 在窗口 A 中输入："Hello from Window A"
   - **立即**在窗口 B 中应该看到这段文字出现
   - 在窗口 B 中输入："Hello from Window B"
   - **立即**在窗口 A 中应该看到这段文字出现

5. **查看服务器日志**
   
   在服务器终端中，应该看到：
   ```
   🔌 客户端已连接
   📄 加载文档: 1
   📖 文档 1 已加载
   🔌 客户端已连接
   📄 加载文档: 1
   📖 文档 1 已加载
   ✏️ 文档 1 已变更
   💾 保存文档: 1
   ✅ 文档 1 已保存到数据库
   ```

### 6.2 测试跨设备同步

1. **在电脑 A 上打开编辑器**
2. **在手机上打开编辑器**（确保在同一网络）
3. **在电脑上输入文字**
4. **手机应该实时显示**

### 6.3 测试数据持久化

1. **输入一些内容**
2. **关闭所有浏览器窗口**
3. **重新打开浏览器**
4. **内容应该保留**（从数据库加载）

### 6.4 常见问题排查

**问题 1：两个标签页没有实时同步**

检查浏览器控制台：
- ✅ 是否显示 `🔌 已连接到 Hocuspocus 服务器`？
- ✅ 是否显示 `🔄 同步状态: 已同步`？
- ❌ 是否有 WebSocket 连接错误？

检查服务器日志：
- ✅ 是否显示 `🔌 客户端已连接`（应该有两次）？
- ❌ 是否有端口占用错误（`EADDRINUSE`）？

检查网络面板：
- 打开 F12 → Network → WS（WebSocket）
- 应该看到 `ws://localhost:1234` 的连接
- Status 应该是 `101 Switching Protocols`

**问题 2：端口被占用**

```bash
# 查找占用端口的进程
lsof -ti:1234

# 杀死进程
lsof -ti:1234 | xargs kill -9

# 或者修改端口（在 server/src/hocuspocus.ts 中）
export HOCUSPOCUS_PORT=1235
```

**问题 3：内容不同步**

可能是 IndexedDB 缓存导致的：
1. 打开 F12 → Application → IndexedDB
2. 找到 `doc-*` 数据库
3. 右键删除
4. 刷新页面重新连接

**问题 4：编辑器初始内容为空**

这是正常的！使用 Collaboration 扩展时：
- 第一次打开文档：从服务器加载内容
- 之后打开：从 Y.js 同步状态加载
- 如果两个标签页都是第一次打开，可能需要等待同步完成

---

## 七、数据流程图

### 7.1 实时同步流程

```
客户端 A                 Hocuspocus Server              客户端 B
   |                            |                            |
   |-- 用户输入 --------------->|                            |
   |                            |-- 广播变更 --------------->|
   |                            |                            |-- 更新编辑器
   |                            |<-- 用户输入 ---------------|
   |<-- 更新编辑器 -------------|                            |
   |                            |                            |
   |                            |-- 保存到数据库             |
```

### 7.2 完整架构

```
客户端
  ↓
HocuspocusProvider (WebSocket)
  ↓
Hocuspocus Server
  ↓
Database Extension
  ↓
SQLite Database
```

---

## 八、连接状态管理

### 8.1 连接状态

HocuspocusProvider 提供了连接状态：

```typescript
provider.on('status', ({ status }) => {
  // status: 'connecting' | 'connected' | 'disconnected'
  console.log('连接状态:', status)
})
```

### 8.2 同步状态

```typescript
provider.on('synced', ({ state }) => {
  // state: true (已同步) | false (未同步)
  console.log('同步状态:', state)
})
```

### 8.3 错误处理

```typescript
provider.on('connectionError', ({ event }) => {
  console.error('连接错误:', event)
})
```

---

## 九、常见问题排查

### 9.1 React StrictMode 导致的问题

**问题：** 在开发模式下，WebSocket 连接失败或不稳定

**原因：** React StrictMode 会在开发模式下故意渲染组件两次，导致第一个 HocuspocusProvider 被立即销毁，WebSocket 连接被关闭。

**解决方案：**

**方案 1：临时禁用 StrictMode（仅用于开发测试）**

修改 `client/src/main.tsx`：

```typescript
// 移除 StrictMode
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
```

**方案 2：保留 StrictMode（推荐用于生产环境）**

StrictMode 只在开发模式下会渲染两次，生产环境不受影响。如果需要在开发时保留 StrictMode，可以：

1. 忽略第一次渲染的 WebSocket 错误（不影响功能）
2. 等待第二次渲染完成后再测试协同功能
3. 使用生产构建测试：`pnpm build && pnpm preview`

**注意：** 本教程为了简化开发体验，暂时移除了 StrictMode。在实际项目中，建议保留 StrictMode 以发现潜在问题。

### 9.2 无法连接到 WebSocket 服务器

**问题：** 浏览器控制台显示 WebSocket 连接失败

**可能原因：**
1. Hocuspocus 服务器未启动
2. 端口被占用
3. 防火墙阻止连接

**解决方案：**
- 检查服务器是否启动
- 查看服务器日志
- 确认端口 1234 可用

### 9.3 内容不同步

**问题：** 两个窗口的内容不同步

**可能原因：**
1. WebSocket 连接断开
2. 文档 ID 不一致
3. Provider 未正确初始化

**解决方案：**
- 检查浏览器控制台的连接状态
- 确认两个窗口打开的是同一个文档
- 查看 Network 标签的 WebSocket 连接

### 9.4 数据未保存到数据库

**问题：** 刷新后内容丢失

**可能原因：**
1. Database 扩展未正确配置
2. store 函数有错误
3. 数据库写入失败

**解决方案：**
- 检查服务器日志
- 确认 yjs_state 字段存在
- 查看数据库是否有写入权限

---

## 十、性能优化

### 10.1 连接池管理

Hocuspocus 自动管理连接池，无需手动配置。

### 10.2 消息压缩

```typescript
const provider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: documentId,
  document: ydoc,
  // 启用消息压缩
  WebSocketPolyfill: WebSocket,
})
```

### 10.3 心跳机制

Hocuspocus 内置心跳机制，自动检测连接状态。

---

## 十一、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 搭建 Hocuspocus WebSocket 服务器
- ✅ 集成数据库持久化扩展
- ✅ 实现文档加载和保存
- ✅ 前端连接 WebSocket 服务器
- ✅ 实现跨设备实时同步
- ✅ 实现数据持久化

### 核心概念
- ✅ WebSocket 原理
- ✅ Hocuspocus 架构
- ✅ 扩展系统使用
- ✅ 连接状态管理
- ✅ 数据同步策略

### 关键技术点

**1. WebSocket 服务器**
- Hocuspocus Server 配置
- 端口管理
- 连接管理

**2. 数据持久化**
- Database 扩展
- fetch 和 store 函数
- 二进制状态存储

**3. 前端集成**
- HocuspocusProvider 配置
- 连接状态监听
- Provider 生命周期管理

**4. 实时同步**
- 跨窗口同步
- 跨设备同步
- 自动冲突解决

现在我们已经实现了真正的多人实时协同编辑！多个用户可以同时编辑同一个文档，所有变更都会实时同步。

---

## 十二、下一章预告

在下一章（Chapter 13）中，我们将优化前端的协同连接，添加连接状态指示器、离线提示、重连机制等功能。

准备好了吗？让我们继续前进！🚀
