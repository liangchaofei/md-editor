# Chapter 5: Zustand 状态管理与 Axios 集成

## 本章目标

实现前端状态管理和 API 请求功能：
- ✅ 集成 Axios 请求库
- ✅ 配置请求/响应拦截器
- ✅ 创建文档 API 模块
- ✅ 集成 Zustand 状态管理
- ✅ 实现文档 CRUD Actions
- ✅ 创建测试组件验证功能

**学习重点：**
- Zustand 状态管理原理
- Axios 拦截器使用
- TypeScript 类型安全
- 异步状态处理

---

## 一、为什么选择 Zustand？

### 1.1 状态管理方案对比

| 特性 | Zustand | Redux | MobX | Context API |
|------|---------|-------|------|-------------|
| 学习曲线 | ⭐ 简单 | ⭐⭐⭐ 复杂 | ⭐⭐ 中等 | ⭐ 简单 |
| 代码量 | 少 | 多 | 中等 | 少 |
| 性能 | 优秀 | 优秀 | 优秀 | 一般 |
| DevTools | ✅ | ✅ | ✅ | ❌ |
| TypeScript | ✅ 完美 | ✅ 良好 | ✅ 良好 | ✅ 良好 |
| 包大小 | 1.2KB | 3KB | 16KB | 0KB |

### 1.2 Zustand 核心特点

1. **极简 API**
   ```typescript
   const useStore = create((set) => ({
     count: 0,
     increment: () => set((state) => ({ count: state.count + 1 }))
   }))
   ```

2. **无需 Provider**
   - 不需要包裹组件树
   - 直接在任何组件中使用

3. **性能优化**
   - 自动优化渲染
   - 支持选择性订阅

4. **中间件支持**
   - DevTools
   - Persist（持久化）
   - Immer（不可变数据）

---

## 二、安装依赖

```bash
cd client
pnpm add zustand axios
```

**依赖说明：**
- `zustand`: 状态管理库
- `axios`: HTTP 请求库

---

## 三、配置 Axios 请求

### 3.1 创建请求实例

创建 `client/src/api/request.ts`：


```typescript
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 可以在这里添加 token
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error: AxiosError) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    
    // 如果后端返回的是标准格式 { success, data, message }
    if (data.success !== undefined) {
      return data
    }
    
    return data
  },
  (error: AxiosError<any>) => {
    // 统一错误处理
    let message = '请求失败'

    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          message = data?.error?.message || '请求参数错误'
          break
        case 401:
          message = '未授权，请登录'
          break
        case 404:
          message = data?.error?.message || '请求的资源不存在'
          break
        case 500:
          message = data?.error?.message || '服务器错误'
          break
        default:
          message = data?.error?.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      message = '网络错误，请检查网络连接'
    }

    return Promise.reject({
      success: false,
      message,
      error: error.response?.data?.error,
    })
  }
)

export default request
```

**核心知识点：**

1. **请求拦截器**
   - 在请求发送前执行
   - 常用于添加 token、修改请求头
   - 可以取消请求

2. **响应拦截器**
   - 在响应返回后执行
   - 统一处理错误
   - 格式化响应数据

3. **环境变量**
   - `import.meta.env.VITE_API_BASE_URL`
   - Vite 使用 `VITE_` 前缀
   - 支持不同环境配置

### 3.2 创建环境变量文件

创建 `client/.env.development`：

```bash
# 开发环境配置
VITE_API_BASE_URL=http://localhost:3000
```

创建 `client/.env.production`：

```bash
# 生产环境配置
VITE_API_BASE_URL=https://your-api-domain.com
```

---

## 四、定义类型

### 4.1 创建文档类型

创建 `client/src/types/document.ts`：

```typescript
// 文档数据结构
export interface Document {
  id: number
  title: string
  content: string
  content_preview?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// 文档列表查询参数
export interface DocumentListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// 分页信息
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 文档列表响应
export interface DocumentListResponse {
  list: Document[]
  pagination: Pagination
}

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}
```

**TypeScript 最佳实践：**
- 使用 `interface` 定义数据结构
- 使用泛型 `<T>` 提高复用性
- 使用 `?` 标记可选属性
- 使用 `Record<K, V>` 定义对象类型

---

## 五、创建 API 模块

### 5.1 文档 API

创建 `client/src/api/document.ts`：

```typescript
import request from './request'
import type {
  Document,
  DocumentListQuery,
  DocumentListResponse,
  CreateDocumentDto,
  UpdateDocumentDto,
  ApiResponse,
} from '../types/document'

/**
 * 获取文档列表
 */
export function getDocuments(params?: DocumentListQuery): Promise<ApiResponse<DocumentListResponse>> {
  return request.get('/api/documents', { params })
}

/**
 * 获取文档详情
 */
export function getDocument(id: number): Promise<ApiResponse<Document>> {
  return request.get(`/api/documents/${id}`)
}

/**
 * 创建文档
 */
export function createDocument(data: CreateDocumentDto): Promise<ApiResponse<Document>> {
  return request.post('/api/documents', data)
}

/**
 * 更新文档
 */
export function updateDocument(id: number, data: UpdateDocumentDto): Promise<ApiResponse<Document>> {
  return request.put(`/api/documents/${id}`, data)
}

/**
 * 删除文档
 */
export function deleteDocument(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/documents/${id}`)
}
```

**API 模块设计原则：**
1. 每个 API 函数对应一个后端接口
2. 使用 TypeScript 类型约束参数和返回值
3. 统一使用 Promise 处理异步
4. 函数命名清晰（动词 + 名词）

---

## 六、创建 Zustand Store

### 6.1 文档 Store

创建 `client/src/store/documentStore.ts`：

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Document, DocumentListQuery, Pagination } from '../types/document'
import * as documentApi from '../api/document'

interface DocumentState {
  // 状态
  documents: Document[]
  currentDocument: Document | null
  pagination: Pagination | null
  loading: boolean
  error: string | null
  query: DocumentListQuery

  // Actions
  fetchDocuments: (query?: DocumentListQuery) => Promise<void>
  fetchDocument: (id: number) => Promise<void>
  createDocument: (data: { title?: string; content?: string }) => Promise<Document | null>
  updateDocument: (id: number, data: { title?: string; content?: string }) => Promise<void>
  deleteDocument: (id: number) => Promise<void>
  setCurrentDocument: (document: Document | null) => void
  setQuery: (query: Partial<DocumentListQuery>) => void
  clearError: () => void
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      documents: [],
      currentDocument: null,
      pagination: null,
      loading: false,
      error: null,
      query: {
        page: 1,
        pageSize: 20,
        keyword: '',
        sortBy: 'updated_at',
        sortOrder: 'DESC',
      },

      // 获取文档列表
      fetchDocuments: async (query?: DocumentListQuery) => {
        set({ loading: true, error: null })

        try {
          const finalQuery = query || get().query
          const response = await documentApi.getDocuments(finalQuery)

          if (response.success && response.data) {
            set({
              documents: response.data.list,
              pagination: response.data.pagination,
              query: finalQuery,
              loading: false,
            })
          } else {
            throw new Error(response.message || '获取文档列表失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '获取文档列表失败',
            loading: false,
          })
        }
      },

      // 创建文档
      createDocument: async (data) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.createDocument(data)

          if (response.success && response.data) {
            // 重新获取文档列表
            await get().fetchDocuments()
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || '创建文档失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '创建文档失败',
            loading: false,
          })
          return null
        }
      },

      // 更新文档
      updateDocument: async (id, data) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.updateDocument(id, data)

          if (response.success && response.data) {
            // 更新列表中的文档
            set(state => ({
              documents: state.documents.map(doc =>
                doc.id === id ? response.data! : doc
              ),
              currentDocument:
                state.currentDocument?.id === id
                  ? response.data!
                  : state.currentDocument,
              loading: false,
            }))
          } else {
            throw new Error(response.message || '更新文档失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '更新文档失败',
            loading: false,
          })
        }
      },

      // 删除文档
      deleteDocument: async (id) => {
        set({ loading: true, error: null })

        try {
          const response = await documentApi.deleteDocument(id)

          if (response.success) {
            // 从列表中移除文档
            set(state => ({
              documents: state.documents.filter(doc => doc.id !== id),
              currentDocument:
                state.currentDocument?.id === id ? null : state.currentDocument,
              loading: false,
            }))
          } else {
            throw new Error(response.message || '删除文档失败')
          }
        } catch (err: any) {
          set({
            error: err.message || '删除文档失败',
            loading: false,
          })
        }
      },

      // 设置当前文档
      setCurrentDocument: (document) => {
        set({ currentDocument: document })
      },

      // 设置查询参数
      setQuery: (query) => {
        set(state => ({
          query: { ...state.query, ...query },
        }))
      },

      // 清除错误
      clearError: () => {
        set({ error: null })
      },
    }),
    { name: 'DocumentStore' }
  )
)
```

**Zustand 核心概念：**

1. **create 函数**
   ```typescript
   const useStore = create<State>()((set, get) => ({
     // 状态和 actions
   }))
   ```

2. **set 函数**
   ```typescript
   // 直接设置
   set({ count: 1 })
   
   // 基于当前状态
   set(state => ({ count: state.count + 1 }))
   ```

3. **get 函数**
   ```typescript
   const currentState = get()
   ```

4. **devtools 中间件**
   - 集成 Redux DevTools
   - 方便调试状态变化

---

## 七、创建测试组件

创建 `client/src/components/DocumentTest.tsx`：


```typescript
import React, { useEffect } from 'react'
import { useDocumentStore } from '../store/documentStore'

function DocumentTest() {
  const {
    documents,
    currentDocument,
    loading,
    error,
    pagination,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    fetchDocument,
  } = useDocumentStore()

  // 组件挂载时获取文档列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 创建测试文档
  const handleCreate = async () => {
    const doc = await createDocument({
      title: `测试文档 ${Date.now()}`,
      content: '这是测试内容',
    })
    if (doc) {
      alert(`文档创建成功！ID: ${doc.id}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">文档功能测试</h1>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          错误: {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading && <div className="mb-4 text-gray-600">加载中...</div>}

      {/* 操作按钮 */}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        创建测试文档
      </button>

      {/* 文档列表 */}
      <div className="mt-6 space-y-4">
        {documents.map(doc => (
          <div key={doc.id} className="rounded-lg border p-4">
            <h3 className="font-semibold">{doc.title}</h3>
            <p className="text-sm text-gray-500">ID: {doc.id}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DocumentTest
```

### 7.1 在 App 中使用

修改 `client/src/App.tsx`：

```typescript
import React, { useState } from 'react'
import Layout from './components/layout/Layout'
import EditorPlaceholder from './components/editor/EditorPlaceholder'
import DocumentTest from './components/DocumentTest'

function App() {
  const [testMode, setTestMode] = useState(false)

  return (
    <div>
      {/* 测试模式切换按钮 */}
      <button
        onClick={() => setTestMode(!testMode)}
        className="fixed right-4 top-4 z-50 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white"
      >
        {testMode ? '返回布局' : '测试 API'}
      </button>

      {testMode ? (
        <DocumentTest />
      ) : (
        <Layout>
          <EditorPlaceholder />
        </Layout>
      )}
    </div>
  )
}

export default App
```

---

## 八、面试考点

### 8.1 Zustand vs Redux

**Q: Zustand 和 Redux 的主要区别？**

A:
1. **API 复杂度**
   - Zustand: 极简，无需 action types、reducers
   - Redux: 需要定义 actions、reducers、types

2. **代码量**
   - Zustand: 少 50-70%
   - Redux: 需要更多样板代码

3. **性能**
   - 两者性能相近
   - Zustand 默认优化渲染

4. **生态系统**
   - Redux: 生态更成熟，中间件丰富
   - Zustand: 轻量，内置常用中间件

**Q: 什么时候选择 Redux？**

A:
- 大型项目，需要严格的状态管理规范
- 需要时间旅行调试
- 团队熟悉 Redux
- 需要丰富的中间件生态

**Q: 什么时候选择 Zustand？**

A:
- 中小型项目
- 追求简洁的代码
- 快速开发
- 不需要复杂的状态管理

### 8.2 Axios 拦截器

**Q: 请求拦截器和响应拦截器的执行顺序？**

A:
```
请求拦截器（后进先出）
    ↓
  发送请求
    ↓
  服务器响应
    ↓
响应拦截器（先进先出）
```

示例：
```typescript
// 请求拦截器 1
axios.interceptors.request.use(config => {
  console.log('请求拦截器 1')
  return config
})

// 请求拦截器 2
axios.interceptors.request.use(config => {
  console.log('请求拦截器 2')
  return config
})

// 响应拦截器 1
axios.interceptors.response.use(response => {
  console.log('响应拦截器 1')
  return response
})

// 响应拦截器 2
axios.interceptors.response.use(response => {
  console.log('响应拦截器 2')
  return response
})

// 输出顺序：
// 请求拦截器 2 → 请求拦截器 1 → 响应拦截器 1 → 响应拦截器 2
```

**Q: 如何取消 Axios 请求？**

A:
```typescript
// 方法1: AbortController (推荐)
const controller = new AbortController()

axios.get('/api/data', {
  signal: controller.signal
})

// 取消请求
controller.abort()

// 方法2: CancelToken (已废弃)
const CancelToken = axios.CancelToken
const source = CancelToken.source()

axios.get('/api/data', {
  cancelToken: source.token
})

source.cancel('取消请求')
```

### 8.3 异步状态管理

**Q: 如何处理异步操作的加载状态？**

A: 使用三个状态标志：
```typescript
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// 开始请求
set({ loading: true, error: null })

// 请求成功
set({ data: result, loading: false })

// 请求失败
set({ error: message, loading: false })
```

**Q: 如何避免竞态条件（Race Condition）？**

A:
```typescript
let requestId = 0

const fetchData = async () => {
  const currentRequestId = ++requestId
  
  const data = await api.getData()
  
  // 只处理最新的请求
  if (currentRequestId === requestId) {
    set({ data })
  }
}
```

### 8.4 TypeScript 泛型

**Q: 什么是泛型？为什么要使用泛型？**

A: 泛型是类型的参数化，提供类型安全的同时保持灵活性。

```typescript
// 不使用泛型
function identity(arg: any): any {
  return arg
}

// 使用泛型
function identity<T>(arg: T): T {
  return arg
}

const result = identity<string>('hello')  // result 类型是 string
```

**Q: 泛型约束是什么？**

A:
```typescript
// 约束泛型必须有 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length
}

getLength('hello')     // ✅
getLength([1, 2, 3])   // ✅
getLength(123)         // ❌ 错误：number 没有 length
```

---

## 九、验证功能

### 9.1 启动前后端

```bash
# 终端1：启动后端
pnpm dev:server

# 终端2：启动前端
pnpm dev:client
```

### 9.2 测试步骤

1. **打开浏览器**
   访问 `http://localhost:5173`

2. **点击右上角"测试 API"按钮**
   切换到测试页面

3. **测试创建文档**
   - 点击"创建测试文档"按钮
   - 应该看到成功提示
   - 文档列表自动刷新

4. **测试查看详情**
   - 点击文档的"查看"按钮
   - 下方显示文档详情

5. **测试更新文档**
   - 点击"更新"按钮
   - 文档标题应该更新

6. **测试删除文档**
   - 点击"删除"按钮
   - 确认后文档从列表消失

7. **打开浏览器 DevTools**
   - Network 标签：查看 API 请求
   - Redux DevTools：查看状态变化

### 9.3 验证清单

- ✅ 页面加载时自动获取文档列表
- ✅ 创建文档成功
- ✅ 更新文档成功
- ✅ 删除文档成功
- ✅ 查看文档详情成功
- ✅ 加载状态显示正常
- ✅ 错误提示显示正常
- ✅ 分页信息显示正确
- ✅ Redux DevTools 可以查看状态
- ✅ Network 请求正常

---

## 十、常见问题

### 10.1 CORS 跨域问题

**问题：** 前端请求后端 API 时出现 CORS 错误

**解决：** 后端已配置 `@koa/cors` 中间件，应该不会有问题。如果还有问题：

```typescript
// server/src/index.ts
app.use(cors({
  origin: 'http://localhost:5173',  // 指定前端地址
  credentials: true,
}))
```

### 10.2 环境变量不生效

**问题：** `import.meta.env.VITE_API_BASE_URL` 是 undefined

**解决：**
1. 确保文件名是 `.env.development`
2. 确保变量名以 `VITE_` 开头
3. 重启开发服务器

### 10.3 Zustand DevTools 不显示

**问题：** Redux DevTools 看不到 Zustand 状态

**解决：**
1. 安装 Redux DevTools 浏览器扩展
2. 确保使用了 `devtools` 中间件
3. 刷新页面

---

## 十一、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ Axios 请求配置和拦截器
- ✅ 文档 API 模块
- ✅ Zustand 状态管理
- ✅ 异步状态处理
- ✅ 测试组件验证

### 核心概念
- ✅ Zustand 状态管理原理
- ✅ Axios 拦截器机制
- ✅ TypeScript 泛型应用
- ✅ 异步状态管理模式

### 最佳实践
- ✅ 统一的 API 封装
- ✅ 类型安全的状态管理
- ✅ 错误处理和加载状态
- ✅ 环境变量配置

---

## 十二、下一章预告

在下一章（Chapter 6）中，我们将：

1. **完善左侧文档列表**
   - 连接真实数据
   - 实现搜索功能
   - 实现分组显示

2. **优化用户体验**
   - 加载骨架屏
   - 空状态提示
   - 错误提示优化

3. **实现文档选择**
   - 点击切换文档
   - 高亮当前文档
   - 路由集成

准备好了吗？让我们继续前进！🚀
