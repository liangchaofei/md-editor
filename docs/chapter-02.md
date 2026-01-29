# Chapter 2: 后端基础架构与数据库

## 本章目标

通过本章学习，你将掌握：

- ✅ SQLite 数据库在 Node.js 中的使用
- ✅ 数据库表结构设计最佳实践
- ✅ 数据库连接池和错误处理
- ✅ Koa 中间件的实际应用
- ✅ 统一的 API 响应格式设计
- ✅ 日志中间件的实现

## 前置知识

在开始本章之前，你需要了解：

- SQL 基础语法（CREATE TABLE, SELECT, INSERT 等）
- 异步编程（async/await）
- Koa 中间件概念（已在 Chapter 1 学习）
- TypeScript 接口和类型定义

---

## 一、理论讲解

### 1.1 为什么选择 SQLite？

**SQLite 的特点：**

1. **无需服务器**
   - 直接读写文件
   - 零配置
   - 适合本地开发

2. **轻量级**
   - 库文件 < 1MB
   - 内存占用小
   - 启动速度快

3. **ACID 事务**
   - 原子性（Atomicity）
   - 一致性（Consistency）
   - 隔离性（Isolation）
   - 持久性（Durability）

4. **跨平台**
   - Windows、macOS、Linux 都支持
   - 数据库文件可直接复制

**适用场景：**
- ✅ 本地开发和测试
- ✅ 小型应用（< 100GB 数据）
- ✅ 嵌入式应用
- ✅ 原型开发

**不适用场景：**
- ❌ 高并发写入（> 1000 写/秒）
- ❌ 分布式系统
- ❌ 需要复杂权限控制
- ❌ 超大数据量（> 100GB）

**生产环境替代方案：**
- PostgreSQL（推荐）
- MySQL
- MongoDB



### 1.2 数据库表设计原则

**1. 命名规范**

```sql
-- ✅ 好的命名
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ❌ 不好的命名
CREATE TABLE doc (
  ID int,
  Title varchar,
  time datetime
);
```

**规则：**
- 表名：复数形式，小写，下划线分隔（`documents`, `user_sessions`）
- 字段名：小写，下划线分隔（`created_at`, `user_id`）
- 主键：统一使用 `id`
- 外键：`表名_id`（如 `user_id`）

**2. 数据类型选择**

SQLite 的数据类型：
- `INTEGER` - 整数（1, 2, 3, 4, 6, 8 字节）
- `REAL` - 浮点数（8 字节）
- `TEXT` - 文本（UTF-8, UTF-16）
- `BLOB` - 二进制数据
- `NULL` - 空值

**最佳实践：**
```sql
-- ID：使用 INTEGER PRIMARY KEY（自动递增）
id INTEGER PRIMARY KEY AUTOINCREMENT

-- 文本：使用 TEXT
title TEXT NOT NULL
content TEXT

-- 时间：使用 DATETIME 或 INTEGER（时间戳）
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at INTEGER  -- Unix 时间戳

-- 布尔值：使用 INTEGER（0/1）
is_deleted INTEGER DEFAULT 0

-- JSON：使用 TEXT
metadata TEXT  -- 存储 JSON 字符串
```

**3. 约束（Constraints）**

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- NOT NULL：不允许为空
  title TEXT NOT NULL,
  
  -- DEFAULT：默认值
  content TEXT DEFAULT '',
  
  -- UNIQUE：唯一约束
  slug TEXT UNIQUE,
  
  -- CHECK：检查约束
  status TEXT CHECK(status IN ('draft', 'published')),
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```



### 1.3 文档表设计

**需求分析：**

我们的协同编辑器需要存储：
- 文档基本信息（标题、内容）
- 创建和更新时间
- 软删除标记（不真正删除数据）
- 文档元数据（作者、标签等）

**表结构设计：**

```sql
CREATE TABLE documents (
  -- 主键
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 基本信息
  title TEXT NOT NULL DEFAULT '无标题文档',
  content TEXT DEFAULT '',
  
  -- Y.js 协同数据（二进制）
  yjs_state BLOB,
  
  -- 元数据（JSON 格式）
  metadata TEXT DEFAULT '{}',
  
  -- 软删除
  is_deleted INTEGER DEFAULT 0,
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引（提升查询性能）
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_is_deleted ON documents(is_deleted);
```

**字段说明：**

1. **id** - 自增主键
2. **title** - 文档标题，默认"无标题文档"
3. **content** - 文档纯文本内容（用于搜索）
4. **yjs_state** - Y.js 的二进制状态（用于协同编辑）
5. **metadata** - JSON 格式的元数据（作者、标签等）
6. **is_deleted** - 软删除标记（0=未删除，1=已删除）
7. **created_at** - 创建时间
8. **updated_at** - 更新时间

**为什么使用软删除？**

```sql
-- 硬删除（不推荐）
DELETE FROM documents WHERE id = 1;
-- 数据永久丢失，无法恢复

-- 软删除（推荐）
UPDATE documents SET is_deleted = 1 WHERE id = 1;
-- 数据仍在，可以恢复
-- 查询时过滤：WHERE is_deleted = 0
```

**优势：**
- ✅ 可以恢复误删除的数据
- ✅ 保留历史记录
- ✅ 符合审计要求
- ✅ 可以统计删除数据



### 1.4 统一响应格式设计

**为什么需要统一响应格式？**

1. **前端处理简单**
   - 统一的数据结构
   - 统一的错误处理
   - 更好的类型提示

2. **易于维护**
   - 修改响应格式只需改一处
   - 便于添加新字段

3. **符合规范**
   - RESTful API 最佳实践
   - 便于文档生成

**响应格式设计：**

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "文档不存在"
  }
}

// 列表响应
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**HTTP 状态码规范：**

```
200 OK          - 成功
201 Created     - 创建成功
204 No Content  - 删除成功
400 Bad Request - 请求参数错误
401 Unauthorized - 未授权
403 Forbidden   - 禁止访问
404 Not Found   - 资源不存在
500 Internal Server Error - 服务器错误
```



---

## 二、代码实现

### 步骤 1: 安装数据库依赖

在 `server` 目录下安装 SQLite 相关依赖：

```bash
cd server
pnpm add sqlite sqlite3
pnpm add -D @types/sqlite3
cd ..
```

**依赖说明：**

- `sqlite3` - SQLite 的 Node.js 绑定（C++ 实现）
- `sqlite` - Promise 封装的 SQLite 库（更易用）
- `@types/sqlite3` - TypeScript 类型定义

**为什么需要两个库？**

```javascript
// sqlite3（回调风格）
db.get('SELECT * FROM users WHERE id = ?', [1], (err, row) => {
  if (err) {
    console.error(err)
  } else {
    console.log(row)
  }
})

// sqlite（Promise 风格）
const row = await db.get('SELECT * FROM users WHERE id = ?', [1])
console.log(row)
```

`sqlite` 库基于 `sqlite3`，提供了更现代的 Promise API。



### 步骤 2: 创建类型定义

创建 `server/src/types/index.ts`：

```typescript
/**
 * 通用类型定义
 */

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

// 文档类型
export interface Document {
  id: number
  title: string
  content: string
  yjs_state: Buffer | null
  metadata: string
  is_deleted: number
  created_at: string
  updated_at: string
}

// 创建文档 DTO
export interface CreateDocumentDto {
  title?: string
  content?: string
  metadata?: Record<string, any>
}

// 更新文档 DTO
export interface UpdateDocumentDto {
  title?: string
  content?: string
  yjs_state?: Buffer
  metadata?: Record<string, any>
}
```

**类型定义说明：**

**1. ApiResponse<T>**
- 泛型类型，T 是 data 的类型
- success 表示请求是否成功
- data 是实际数据
- error 包含错误信息

**2. Document**
- 对应数据库表结构
- yjs_state 是 Buffer 类型（二进制数据）
- metadata 是 JSON 字符串

**3. DTO（Data Transfer Object）**
- 用于 API 请求参数
- 所有字段都是可选的
- 提供类型安全



### 步骤 3: 创建数据库模块

创建 `server/src/database/index.ts`：

```typescript
import { open, Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../../data/documents.db')

let db: Database | null = null

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db
  }

  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    })

    console.log('📦 数据库连接成功:', DB_PATH)

    // 启用外键约束
    await db.exec('PRAGMA foreign_keys = ON')

    // 初始化表结构
    await initTables()

    return db
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    throw error
  }
}

/**
 * 初始化数据库表
 */
async function initTables() {
  if (!db) throw new Error('数据库未初始化')

  // 创建 documents 表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '无标题文档',
      content TEXT DEFAULT '',
      yjs_state BLOB,
      metadata TEXT DEFAULT '{}',
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_created_at 
    ON documents(created_at)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_is_deleted 
    ON documents(is_deleted)
  `)

  console.log('✅ 数据库表初始化完成')
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  return db
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  if (db) {
    await db.close()
    db = null
    console.log('📦 数据库连接已关闭')
  }
}
```

**代码详解：**

**1. ES Modules 中获取 __dirname**
```typescript
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
```
- ES Modules 没有 __dirname
- 使用 fileURLToPath 转换 import.meta.url
- 获取当前文件所在目录

**2. 单例模式**
```typescript
let db: Database | null = null

export async function initDatabase() {
  if (db) {
    return db  // 已初始化，直接返回
  }
  // 初始化逻辑...
}
```
- 确保只创建一个数据库连接
- 避免重复连接

**3. PRAGMA 设置**
```sql
PRAGMA foreign_keys = ON
```
- 启用外键约束
- SQLite 默认不启用
- 确保数据完整性

**4. CREATE TABLE IF NOT EXISTS**
```sql
CREATE TABLE IF NOT EXISTS documents (...)
```
- 如果表已存在，不会报错
- 幂等操作（多次执行结果相同）
- 适合初始化脚本



### 步骤 4: 创建响应工具函数

创建 `server/src/utils/response.ts`：

```typescript
import { Context } from 'koa'
import type { ApiResponse } from '../types/index.js'

/**
 * 成功响应
 */
export function success<T>(
  ctx: Context,
  data?: T,
  message: string = '操作成功',
  status: number = 200
) {
  ctx.status = status
  ctx.body = {
    success: true,
    data,
    message,
  } as ApiResponse<T>
}

/**
 * 错误响应
 */
export function error(
  ctx: Context,
  code: string,
  message: string,
  status: number = 400
) {
  ctx.status = status
  ctx.body = {
    success: false,
    error: {
      code,
      message,
    },
  } as ApiResponse
}

/**
 * 404 响应
 */
export function notFound(ctx: Context, message: string = '资源不存在') {
  error(ctx, 'NOT_FOUND', message, 404)
}

/**
 * 服务器错误响应
 */
export function serverError(ctx: Context, message: string = '服务器错误') {
  error(ctx, 'INTERNAL_ERROR', message, 500)
}
```

**使用示例：**

```typescript
// 成功响应
router.get('/api/users/:id', async ctx => {
  const user = await getUser(ctx.params.id)
  success(ctx, user, '获取用户成功')
})

// 错误响应
router.post('/api/users', async ctx => {
  if (!ctx.request.body.email) {
    error(ctx, 'INVALID_EMAIL', '邮箱不能为空', 400)
    return
  }
  // ...
})

// 404 响应
router.get('/api/users/:id', async ctx => {
  const user = await getUser(ctx.params.id)
  if (!user) {
    notFound(ctx, '用户不存在')
    return
  }
  success(ctx, user)
})
```

**优势：**
- ✅ 统一的响应格式
- ✅ 类型安全（泛型支持）
- ✅ 减少重复代码
- ✅ 易于维护



### 步骤 5: 创建错误处理中间件

创建 `server/src/middleware/errorHandler.ts`：

```typescript
import { Context, Next } from 'koa'
import { serverError } from '../utils/response.js'

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next()
  } catch (err: any) {
    // 记录错误日志
    console.error('❌ 服务器错误:', err)

    // 返回错误响应
    serverError(ctx, err.message || '服务器内部错误')

    // 触发 Koa 的错误事件
    ctx.app.emit('error', err, ctx)
  }
}
```

**工作原理：**

```
请求 → errorHandler → 其他中间件 → 路由处理
                ↓ 捕获错误
            返回错误响应
```

**为什么要放在最外层？**

```typescript
// ✅ 正确：errorHandler 在最外层
app.use(errorHandler)
app.use(logger)
app.use(router.routes())

// ❌ 错误：errorHandler 在内层
app.use(logger)
app.use(errorHandler)  // 无法捕获 logger 的错误
app.use(router.routes())
```

**洋葱模型示意：**

```
请求
 ↓
errorHandler 进入
 ↓
logger 进入
 ↓
router 处理
 ↓
logger 返回
 ↓
errorHandler 返回 ← 如果有错误，在这里捕获
 ↓
响应
```



### 步骤 6: 创建日志中间件

创建 `server/src/middleware/logger.ts`：

```typescript
import { Context, Next } from 'koa'

export async function logger(ctx: Context, next: Next) {
  const start = Date.now()

  // 执行下一个中间件
  await next()

  // 计算请求耗时
  const ms = Date.now() - start

  // 获取状态码对应的颜色
  const statusColor = getStatusColor(ctx.status)

  // 打印日志
  console.log(
    `${getMethodColor(ctx.method)} ${ctx.method} ${statusColor}${ctx.status}\x1b[0m ${ctx.url} - ${ms}ms`
  )
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '\x1b[32m',    // 绿色
    POST: '\x1b[33m',   // 黄色
    PUT: '\x1b[34m',    // 蓝色
    DELETE: '\x1b[31m', // 红色
    PATCH: '\x1b[35m',  // 紫色
  }
  return colors[method] || '\x1b[0m'
}

function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m' // 红色
  if (status >= 400) return '\x1b[33m' // 黄色
  if (status >= 300) return '\x1b[36m' // 青色
  if (status >= 200) return '\x1b[32m' // 绿色
  return '\x1b[0m'
}
```

**日志输出示例：**

```
GET 200 /api/documents - 15ms
POST 201 /api/documents - 32ms
DELETE 204 /api/documents/1 - 8ms
GET 404 /api/documents/999 - 5ms
POST 500 /api/documents - 120ms
```

**ANSI 颜色代码：**

```
\x1b[0m  - 重置
\x1b[31m - 红色
\x1b[32m - 绿色
\x1b[33m - 黄色
\x1b[34m - 蓝色
\x1b[35m - 紫色
\x1b[36m - 青色
```

**性能监控：**

```typescript
const start = Date.now()
await next()
const ms = Date.now() - start
```

- 记录请求开始时间
- 执行后续中间件
- 计算总耗时
- 用于性能分析



### 步骤 7: 更新主入口文件

更新 `server/src/index.ts`：

```typescript
import Koa from 'koa'
import cors from '@koa/cors'
import Router from '@koa/router'
import { initDatabase, closeDatabase } from './database/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './middleware/logger.js'
import { success } from './utils/response.js'

const app = new Koa()
const router = new Router()

// 全局中间件（注意顺序）
app.use(errorHandler) // 错误处理（最外层）
app.use(logger) // 日志记录
app.use(cors()) // 跨域处理

// 健康检查接口
router.get('/health', ctx => {
  success(ctx, {
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
  })
})

// API 信息接口
router.get('/api/info', ctx => {
  success(ctx, {
    name: '协同编辑器后端服务',
    version: '1.0.0',
    description: '基于 Koa2 + TypeScript + SQLite 的后端服务',
    features: ['文档管理', '协同编辑', 'WebSocket 支持'],
  })
})

// 数据库测试接口
router.get('/api/db-test', async ctx => {
  const db = await import('./database/index.js').then(m => m.getDatabase())
  const result = await db.get('SELECT 1 as test')
  success(ctx, result, '数据库连接正常')
})

// 注册路由
app.use(router.routes()).use(router.allowedMethods())

// 错误事件监听
app.on('error', (err, ctx) => {
  console.error('❌ 应用错误:', err)
})

const PORT = process.env.PORT || 3000

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase()

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50))
      console.log('🚀 服务器启动成功！')
      console.log('='.repeat(50))
      console.log(`📍 地址: http://localhost:${PORT}`)
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`)
      console.log(`📡 API 信息: http://localhost:${PORT}/api/info`)
      console.log(`🗄️  数据库测试: http://localhost:${PORT}/api/db-test`)
      console.log('='.repeat(50) + '\n')
    })
  } catch (error) {
    console.error('❌ 服务器启动失败:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n⏳ 正在关闭服务器...')
  await closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n⏳ 正在关闭服务器...')
  await closeDatabase()
  process.exit(0)
})

// 启动
startServer()
```

**关键改进：**

**1. 中间件顺序**
```typescript
app.use(errorHandler) // 最外层，捕获所有错误
app.use(logger)       // 记录请求日志
app.use(cors())       // 处理跨域
```

**2. 异步启动**
```typescript
async function startServer() {
  await initDatabase()  // 先初始化数据库
  app.listen(PORT)      // 再启动服务器
}
```

**3. 优雅关闭**
```typescript
process.on('SIGINT', async () => {
  await closeDatabase()  // 关闭数据库连接
  process.exit(0)        // 退出进程
})
```

- SIGINT: Ctrl+C 信号
- SIGTERM: 终止信号（Docker、PM2）
- 确保资源正确释放

**4. 统一响应格式**
```typescript
router.get('/health', ctx => {
  success(ctx, { status: 'ok' })  // 使用工具函数
})
```



---

## 三、实现难点与面试考点

### 3.1 SQLite 的 ACID 特性

**面试问题：解释数据库的 ACID 特性**

**回答要点：**

**A - Atomicity（原子性）**
```typescript
// 转账操作：要么全部成功，要么全部失败
await db.run('BEGIN TRANSACTION')
try {
  await db.run('UPDATE accounts SET balance = balance - 100 WHERE id = 1')
  await db.run('UPDATE accounts SET balance = balance + 100 WHERE id = 2')
  await db.run('COMMIT')
} catch (error) {
  await db.run('ROLLBACK')  // 回滚所有操作
}
```

**C - Consistency（一致性）**
```sql
-- 约束确保数据一致性
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  balance INTEGER CHECK(balance >= 0)  -- 余额不能为负
)
```

**I - Isolation（隔离性）**
```
事务 A: 读取余额 100
事务 B: 读取余额 100
事务 A: 扣除 50，余额 50
事务 B: 扣除 30，余额 70  ← 错误！应该是 20

隔离级别解决并发问题
```

**D - Durability（持久性）**
```
提交事务后，数据永久保存
即使系统崩溃，数据也不会丢失
```



### 3.2 数据库索引原理

**面试问题：什么是数据库索引？为什么能提升查询性能？**

**回答要点：**

**索引的本质：**
- 类似书的目录
- 用空间换时间
- 加快查询，减慢写入

**B-Tree 索引结构：**
```
        [50]
       /    \
    [25]    [75]
   /   \    /   \
[10] [30] [60] [90]
```

**有索引 vs 无索引：**

```sql
-- 无索引：全表扫描 O(n)
SELECT * FROM documents WHERE created_at > '2024-01-01'
-- 扫描 10000 行

-- 有索引：索引查找 O(log n)
CREATE INDEX idx_created_at ON documents(created_at)
SELECT * FROM documents WHERE created_at > '2024-01-01'
-- 只扫描 100 行
```

**何时创建索引：**
- ✅ WHERE 条件字段
- ✅ ORDER BY 字段
- ✅ JOIN 关联字段
- ✅ 频繁查询的字段

**何时不创建索引：**
- ❌ 小表（< 1000 行）
- ❌ 频繁更新的字段
- ❌ 低区分度字段（如性别）

**索引的代价：**
```
优势：查询快 10-100 倍
劣势：
- 占用额外空间（10-30%）
- 插入/更新/删除变慢
- 需要维护索引
```



### 3.3 中间件执行顺序

**面试问题：Koa 中间件的执行顺序是怎样的？**

**回答要点：**

**洋葱模型执行流程：**

```typescript
app.use(async (ctx, next) => {
  console.log('1 - 开始')
  await next()
  console.log('1 - 结束')
})

app.use(async (ctx, next) => {
  console.log('2 - 开始')
  await next()
  console.log('2 - 结束')
})

app.use(async (ctx, next) => {
  console.log('3 - 开始')
  ctx.body = 'Hello'
  console.log('3 - 结束')
})

// 输出顺序：
// 1 - 开始
// 2 - 开始
// 3 - 开始
// 3 - 结束
// 2 - 结束
// 1 - 结束
```

**为什么要这样设计？**

1. **统一的前置/后置处理**
```typescript
app.use(async (ctx, next) => {
  // 前置：记录开始时间
  const start = Date.now()
  
  await next()  // 执行后续中间件
  
  // 后置：计算耗时
  const ms = Date.now() - start
  console.log(`耗时: ${ms}ms`)
})
```

2. **错误处理**
```typescript
app.use(async (ctx, next) => {
  try {
    await next()  // 执行后续中间件
  } catch (err) {
    // 捕获所有后续中间件的错误
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})
```

3. **响应修改**
```typescript
app.use(async (ctx, next) => {
  await next()  // 先执行后续中间件
  
  // 修改响应
  if (ctx.body) {
    ctx.body = {
      success: true,
      data: ctx.body
    }
  }
})
```

**中间件顺序的重要性：**

```typescript
// ✅ 正确：errorHandler 在最外层
app.use(errorHandler)
app.use(logger)
app.use(cors())
app.use(router.routes())

// ❌ 错误：errorHandler 在内层
app.use(logger)
app.use(errorHandler)  // 无法捕获 logger 的错误
```



### 3.4 软删除 vs 硬删除

**面试问题：软删除和硬删除的区别？各有什么优缺点？**

**回答要点：**

**硬删除（Physical Delete）：**
```sql
DELETE FROM documents WHERE id = 1
```

**优点：**
- ✅ 释放存储空间
- ✅ 数据库更小，查询更快
- ✅ 符合数据最小化原则

**缺点：**
- ❌ 数据无法恢复
- ❌ 丢失历史记录
- ❌ 可能违反审计要求
- ❌ 级联删除风险

**软删除（Logical Delete）：**
```sql
UPDATE documents SET is_deleted = 1 WHERE id = 1
```

**优点：**
- ✅ 可以恢复数据
- ✅ 保留历史记录
- ✅ 符合审计要求
- ✅ 安全性高

**缺点：**
- ❌ 占用存储空间
- ❌ 查询需要过滤
- ❌ 索引效率降低
- ❌ 唯一约束问题

**实现软删除的最佳实践：**

```typescript
// 1. 查询时过滤已删除数据
const documents = await db.all(`
  SELECT * FROM documents 
  WHERE is_deleted = 0
  ORDER BY created_at DESC
`)

// 2. 创建视图简化查询
await db.exec(`
  CREATE VIEW active_documents AS
  SELECT * FROM documents WHERE is_deleted = 0
`)

// 3. 定期清理旧数据
await db.run(`
  DELETE FROM documents 
  WHERE is_deleted = 1 
  AND updated_at < datetime('now', '-90 days')
`)

// 4. 恢复删除的数据
await db.run(`
  UPDATE documents 
  SET is_deleted = 0 
  WHERE id = ?
`, [id])
```

**何时使用软删除：**
- ✅ 用户数据（账号、文档）
- ✅ 订单、交易记录
- ✅ 需要审计的数据
- ✅ 可能需要恢复的数据

**何时使用硬删除：**
- ✅ 临时数据（验证码、会话）
- ✅ 日志数据（定期清理）
- ✅ 缓存数据
- ✅ 测试数据



---

## 四、验证本章实现

### 4.1 安装依赖

```bash
pnpm install
```

**预期结果：**
- 安装成功，无报错
- 新增 sqlite 和 sqlite3 依赖

### 4.2 启动服务器

```bash
pnpm dev:server
```

**预期输出：**
```
📦 数据库连接成功: /path/to/server/data/documents.db
✅ 数据库表初始化完成

==================================================
🚀 服务器启动成功！
==================================================
📍 地址: http://localhost:3000
🏥 健康检查: http://localhost:3000/health
📡 API 信息: http://localhost:3000/api/info
🗄️  数据库测试: http://localhost:3000/api/db-test
==================================================
```

### 4.3 验证健康检查接口

访问 http://localhost:3000/health

**预期响应：**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2024-01-28T..."
  },
  "message": "操作成功"
}
```

**检查点：**
- ✅ success 为 true
- ✅ 包含 database: "connected"
- ✅ 响应格式统一

### 4.4 验证 API 信息接口

访问 http://localhost:3000/api/info

**预期响应：**
```json
{
  "success": true,
  "data": {
    "name": "协同编辑器后端服务",
    "version": "1.0.0",
    "description": "基于 Koa2 + TypeScript + SQLite 的后端服务",
    "features": ["文档管理", "协同编辑", "WebSocket 支持"]
  },
  "message": "操作成功"
}
```

### 4.5 验证数据库连接

访问 http://localhost:3000/api/db-test

**预期响应：**
```json
{
  "success": true,
  "data": {
    "test": 1
  },
  "message": "数据库连接正常"
}
```

**检查点：**
- ✅ 数据库查询成功
- ✅ 返回 test: 1

### 4.6 验证日志中间件

在终端观察日志输出：

```
GET 200 /health - 5ms
GET 200 /api/info - 3ms
GET 200 /api/db-test - 12ms
```

**检查点：**
- ✅ 显示 HTTP 方法（GET）
- ✅ 显示状态码（200）
- ✅ 显示 URL
- ✅ 显示耗时
- ✅ 不同方法有不同颜色

### 4.7 验证错误处理

访问一个不存在的路由：http://localhost:3000/api/not-found

**预期响应：**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Not Found"
  }
}
```

**终端日志：**
```
GET 404 /api/not-found - 2ms
```

### 4.8 验证数据库文件

检查数据库文件是否创建：

```bash
ls -lh server/data/
```

**预期输出：**
```
-rw-r--r--  1 user  staff   12K  Jan 28 10:00 documents.db
```

### 4.9 验证数据库表结构

使用 SQLite 命令行工具查看表结构：

```bash
# 进入数据库
sqlite3 server/data/documents.db

# 查看所有表
.tables

# 查看 documents 表结构
.schema documents

# 查看索引
.indexes documents

# 退出
.quit
```

**预期输出：**
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '无标题文档',
  content TEXT DEFAULT '',
  yjs_state BLOB,
  metadata TEXT DEFAULT '{}',
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_is_deleted ON documents(is_deleted);
```

### 4.10 验证优雅关闭

在终端按 `Ctrl+C` 停止服务器：

**预期输出：**
```
⏳ 正在关闭服务器...
📦 数据库连接已关闭
```

**检查点：**
- ✅ 捕获 SIGINT 信号
- ✅ 关闭数据库连接
- ✅ 进程正常退出

### 4.11 验证 TypeScript 类型

在 `server/src/index.ts` 中测试类型检查：

```typescript
// 测试响应类型
router.get('/test', ctx => {
  success(ctx, { name: 'test' })  // ✅ 正确
  success(ctx, 123)               // ✅ 正确（泛型）
})
```

VS Code 应该提供完整的类型提示和自动补全。

### 4.12 常见问题排查

#### 问题1：better-sqlite3 原生模块未编译

**错误信息：**
```
Error: Could not locate the bindings file
```

**原因：** `better-sqlite3` 是 C++ 原生模块，pnpm 默认阻止构建脚本。

**解决方案：**
```bash
# 手动触发编译
pnpm --filter server exec npm rebuild better-sqlite3

# 验证
pnpm dev:server
```

#### 问题2：Koa 与 Node.js 22 兼容性

**错误信息：**
```
TypeError: getGeneratorFunction is not a function
```

**原因：** Koa 2.14.x 与 Node.js 22 的 ESM 实现存在兼容性问题。

**解决方案：** 已升级到 Koa 2.16.3
```json
// server/package.json
{
  "dependencies": {
    "koa": "^2.16.3"  // 使用最新版本
  }
}
```

#### 问题3：TypeScript ESM 配置

**配置要点：**
```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",           // 使用较新的 ES 版本
    "module": "ESNext",           // ESM 模块
    "moduleResolution": "node",   // Node.js 解析策略
    "esModuleInterop": true       // 兼容 CommonJS
  }
}
```

### ✅ 验证通过标准

如果以上所有验证都通过，说明 Chapter 2 实现正确！

**核心功能检查清单：**
- ✅ 数据库连接成功
- ✅ 表结构创建正确
- ✅ 索引创建成功
- ✅ 统一响应格式生效
- ✅ 错误处理中间件工作正常
- ✅ 日志中间件输出正确
- ✅ 优雅关闭功能正常
- ✅ 原生模块编译成功
- ✅ Node.js 22 兼容性正常

---

## 五、本章小结

通过本章学习，我们完成了：

### 数据库层
- ✅ 集成 SQLite 数据库
- ✅ 设计 documents 表结构
- ✅ 创建索引优化查询
- ✅ 实现软删除机制

### 中间件层
- ✅ 错误处理中间件（全局捕获）
- ✅ 日志中间件（请求监控）
- ✅ 中间件执行顺序优化

### 工具层
- ✅ 统一响应格式
- ✅ 类型定义完善
- ✅ 数据库连接管理

### 核心概念
- ✅ SQLite 的 ACID 特性
- ✅ 数据库索引原理
- ✅ Koa 洋葱模型
- ✅ 软删除 vs 硬删除

---

## 六、下一章预告

在下一章（Chapter 3）中，我们将：

1. **实现前端基础布局**
   - 三栏布局设计
   - Header 组件
   - Sidebar 组件
   - 响应式设计

2. **组件化开发**
   - 组件拆分原则
   - Props 和 State 管理
   - 组件通信

3. **样式系统**
   - Tailwind 实战应用
   - 自定义组件样式
   - 主题配置

**学习重点：**
- React 组件设计模式
- Flexbox 布局技巧
- Tailwind CSS 最佳实践
- 响应式设计实现

准备好了吗？让我们继续前进！🚀
