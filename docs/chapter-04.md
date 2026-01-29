# Chapter 4: 文档 CRUD API

## 本章目标

实现完整的文档增删改查（CRUD）API，包括：
- ✅ 文档列表查询（支持分页、搜索、排序）
- ✅ 文档详情获取
- ✅ 文档创建
- ✅ 文档更新
- ✅ 文档软删除

**学习重点：**
- RESTful API 设计规范
- SQL 查询优化技巧
- 参数验证和安全防护
- 动态 SQL 构建

---

## 一、RESTful API 设计原则

### 1.1 什么是 RESTful API？

REST（Representational State Transfer）是一种软件架构风格，用于设计网络应用程序的 API。

**核心原则：**

1. **资源（Resource）**
   - 使用名词表示资源：`/api/documents`
   - 避免使用动词：❌ `/api/getDocuments`

2. **HTTP 方法语义**
   - `GET`：获取资源
   - `POST`：创建资源
   - `PUT/PATCH`：更新资源
   - `DELETE`：删除资源

3. **状态码规范**
   - `200`：成功
   - `201`：创建成功
   - `400`：客户端错误
   - `404`：资源不存在
   - `500`：服务器错误

4. **统一的响应格式**

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
    "code": "NOT_FOUND",
    "message": "文档不存在"
  }
}
```

### 1.2 API 路由设计

| 方法 | 路径 | 功能 | 状态码 |
|------|------|------|--------|
| GET | `/api/documents` | 获取文档列表 | 200 |
| GET | `/api/documents/:id` | 获取文档详情 | 200/404 |
| POST | `/api/documents` | 创建文档 | 201 |
| PUT | `/api/documents/:id` | 更新文档 | 200/404 |
| DELETE | `/api/documents/:id` | 删除文档 | 200/404 |

---

## 二、实现文档路由模块

### 2.1 创建路由文件

创建 `server/src/routes/documents.ts`：

```typescript
import Router from '@koa/router'
import { getDatabase } from '../database/index.js'
import { success, error, notFound, serverError } from '../utils/response.js'
import type { Context } from 'koa'
import type { Document, DocumentListQuery } from '../types/index.js'

const router = new Router({
  prefix: '/api/documents',  // 路由前缀
})

export default router
```

**知识点：**
- `prefix` 选项：为所有路由添加统一前缀
- 模块化路由：每个业务模块独立管理路由


### 2.2 实现文档列表查询

```typescript
/**
 * GET /api/documents
 * 获取文档列表（支持分页、搜索、排序）
 */
router.get('/', async (ctx: Context) => {
  const db = getDatabase()

  // 获取查询参数
  const {
    page = '1',
    pageSize = '20',
    keyword = '',
    sortBy = 'updated_at',
    sortOrder = 'DESC',
  } = ctx.query as DocumentListQuery

  const pageNum = parseInt(page)
  const pageSizeNum = parseInt(pageSize)
  const offset = (pageNum - 1) * pageSizeNum

  try {
    // 构建查询条件
    let whereClause = 'WHERE is_deleted = 0'
    const params: any[] = []

    if (keyword) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 验证排序字段（防止 SQL 注入）
    const allowedSortFields = ['id', 'title', 'created_at', 'updated_at']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updated_at'
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM documents ${whereClause}`
    const countResult = db.prepare(countSql).get(...params) as { total: number }
    const total = countResult.total

    // 查询列表（不返回 yjs_state 和完整 content）
    const listSql = `
      SELECT 
        id,
        title,
        SUBSTR(content, 1, 200) as content_preview,
        metadata,
        created_at,
        updated_at
      FROM documents
      ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT ? OFFSET ?
    `
    params.push(pageSizeNum, offset)

    const documents = db.prepare(listSql).all(...params) as Document[]

    // 解析 metadata
    const formattedDocuments = documents.map(doc => ({
      ...doc,
      metadata: doc.metadata ? JSON.parse(doc.metadata as string) : {},
    }))

    success(ctx, {
      list: formattedDocuments,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    })
  } catch (err) {
    console.error('获取文档列表失败:', err)
    serverError(ctx, '获取文档列表失败')
  }
})
```

**核心知识点：**

1. **分页实现**
   ```sql
   LIMIT ? OFFSET ?
   -- LIMIT: 每页数量
   -- OFFSET: 跳过的记录数 = (page - 1) * pageSize
   ```

2. **模糊搜索**
   ```sql
   WHERE title LIKE '%keyword%' OR content LIKE '%keyword%'
   ```

3. **SQL 注入防护**
   - ✅ 使用参数化查询：`db.prepare(sql).get(...params)`
   - ✅ 白名单验证排序字段
   - ❌ 避免字符串拼接：`SELECT * FROM documents WHERE id = ${id}`

4. **性能优化**
   - 只返回必要字段（不返回 `yjs_state`）
   - 使用 `SUBSTR` 截取内容预览
   - 利用索引加速查询（`is_deleted`, `created_at`）


### 2.3 实现文档详情获取

```typescript
/**
 * GET /api/documents/:id
 * 获取单个文档详情
 */
router.get('/:id', async (ctx: Context) => {
  const db = getDatabase()
  const { id } = ctx.params

  try {
    const sql = `
      SELECT 
        id,
        title,
        content,
        yjs_state,
        metadata,
        created_at,
        updated_at
      FROM documents
      WHERE id = ? AND is_deleted = 0
    `

    const document = db.prepare(sql).get(id) as Document | undefined

    if (!document) {
      notFound(ctx, '文档不存在')
      return
    }

    // 解析 metadata
    const formattedDocument = {
      ...document,
      metadata: document.metadata ? JSON.parse(document.metadata as string) : {},
    }

    success(ctx, formattedDocument)
  } catch (err) {
    console.error('获取文档详情失败:', err)
    serverError(ctx, '获取文档详情失败')
  }
})
```

**知识点：**
- 路由参数：`ctx.params.id` 获取 URL 中的 `:id`
- 404 处理：资源不存在时返回 404 状态码
- 完整数据：详情接口返回完整的 `content` 和 `yjs_state`

### 2.4 实现文档创建

```typescript
/**
 * POST /api/documents
 * 创建新文档
 */
router.post('/', async (ctx: Context) => {
  const db = getDatabase()
  const { title = '无标题文档', content = '', metadata = {} } = ctx.request.body as any

  try {
    const sql = `
      INSERT INTO documents (title, content, metadata)
      VALUES (?, ?, ?)
    `

    const result = db.prepare(sql).run(title, content, JSON.stringify(metadata))

    // 获取新创建的文档
    const newDocument = db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .get(result.lastInsertRowid) as Document

    const formattedDocument = {
      ...newDocument,
      metadata: newDocument.metadata ? JSON.parse(newDocument.metadata as string) : {},
    }

    success(ctx, formattedDocument, '文档创建成功', 201)
  } catch (err) {
    console.error('创建文档失败:', err)
    serverError(ctx, '创建文档失败')
  }
})
```

**知识点：**
- `ctx.request.body`：获取 POST 请求体（需要 bodyParser 中间件）
- `result.lastInsertRowid`：获取新插入记录的 ID
- 状态码 201：表示资源创建成功
- 默认值：使用解构赋值提供默认值


### 2.5 实现文档更新

```typescript
/**
 * PUT /api/documents/:id
 * 更新文档
 */
router.put('/:id', async (ctx: Context) => {
  const db = getDatabase()
  const { id } = ctx.params
  const { title, content, metadata } = ctx.request.body as any

  try {
    // 检查文档是否存在
    const existingDoc = db
      .prepare('SELECT id FROM documents WHERE id = ? AND is_deleted = 0')
      .get(id)

    if (!existingDoc) {
      notFound(ctx, '文档不存在')
      return
    }

    // 构建动态更新 SQL
    const updates: string[] = []
    const params: any[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      params.push(title)
    }

    if (content !== undefined) {
      updates.push('content = ?')
      params.push(content)
    }

    if (metadata !== undefined) {
      updates.push('metadata = ?')
      params.push(JSON.stringify(metadata))
    }

    // 总是更新 updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP')

    if (updates.length === 1) {
      // 只有 updated_at，说明没有实际更新内容
      error(ctx, 'NO_UPDATE_CONTENT', '没有需要更新的内容', 400)
      return
    }

    params.push(id)

    const sql = `
      UPDATE documents
      SET ${updates.join(', ')}
      WHERE id = ?
    `

    db.prepare(sql).run(...params)

    // 获取更新后的文档
    const updatedDocument = db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .get(id) as Document

    const formattedDocument = {
      ...updatedDocument,
      metadata: updatedDocument.metadata ? JSON.parse(updatedDocument.metadata as string) : {},
    }

    success(ctx, formattedDocument, '文档更新成功')
  } catch (err) {
    console.error('更新文档失败:', err)
    serverError(ctx, '更新文档失败')
  }
})
```

**核心知识点：**

1. **动态 SQL 构建**
   - 只更新传入的字段
   - 使用数组拼接 SQL 片段
   - 避免更新不必要的字段

2. **部分更新 vs 全量更新**
   - `PUT`：通常表示全量更新
   - `PATCH`：表示部分更新
   - 本项目使用 PUT 实现部分更新（更灵活）

3. **先检查后更新**
   - 避免更新不存在的资源
   - 提供更友好的错误提示


### 2.6 实现文档删除

```typescript
/**
 * DELETE /api/documents/:id
 * 软删除文档
 */
router.delete('/:id', async (ctx: Context) => {
  const db = getDatabase()
  const { id } = ctx.params

  try {
    // 检查文档是否存在
    const existingDoc = db
      .prepare('SELECT id FROM documents WHERE id = ? AND is_deleted = 0')
      .get(id)

    if (!existingDoc) {
      notFound(ctx, '文档不存在')
      return
    }

    // 软删除
    const sql = `
      UPDATE documents
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `

    db.prepare(sql).run(id)

    success(ctx, null, '文档删除成功')
  } catch (err) {
    console.error('删除文档失败:', err)
    serverError(ctx, '删除文档失败')
  }
})
```

**软删除 vs 硬删除：**

| 特性 | 软删除 | 硬删除 |
|------|--------|--------|
| 实现方式 | 标记字段 `is_deleted = 1` | `DELETE FROM table` |
| 数据恢复 | ✅ 可以恢复 | ❌ 无法恢复 |
| 性能 | 查询需要过滤 | 查询更快 |
| 存储空间 | 占用空间 | 释放空间 |
| 审计追踪 | ✅ 保留历史 | ❌ 丢失历史 |

**企业级应用推荐：**
- 重要数据：使用软删除
- 临时数据：使用硬删除
- 定期清理：软删除 + 定时任务物理删除

---

## 三、集成 Body Parser 中间件

### 3.1 安装依赖

```bash
pnpm add @koa/bodyparser
```

### 3.2 注册中间件

修改 `server/src/index.ts`：

```typescript
import bodyParser from '@koa/bodyparser'

// 全局中间件（注意顺序）
app.use(errorHandler)
app.use(logger)
app.use(cors())
app.use(bodyParser())  // 添加 body parser
```

**中间件顺序很重要：**
1. `errorHandler`：最外层，捕获所有错误
2. `logger`：记录所有请求
3. `cors`：处理跨域
4. `bodyParser`：解析请求体
5. 业务路由

### 3.3 注册文档路由

```typescript
import documentsRouter from './routes/documents.js'

// 注册业务路由
app.use(documentsRouter.routes()).use(documentsRouter.allowedMethods())

// 注册基础路由
app.use(router.routes()).use(router.allowedMethods())
```

---

## 四、完善类型定义

修改 `server/src/types/index.ts`：

```typescript
// 分页信息
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 文档类型
export interface Document {
  id: number
  title: string
  content: string
  content_preview?: string
  yjs_state?: Buffer | null
  metadata: string | Record<string, any>
  is_deleted?: number
  created_at: string
  updated_at: string
}

// 文档列表查询参数
export interface DocumentListQuery {
  page?: string
  pageSize?: string
  keyword?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}
```

---

## 五、面试考点

### 5.1 RESTful API 设计

**Q: RESTful API 的核心原则是什么？**

A: 
1. 资源导向：使用名词表示资源
2. HTTP 方法语义化：GET/POST/PUT/DELETE
3. 无状态：每个请求独立，不依赖服务器状态
4. 统一接口：标准化的请求和响应格式
5. 分层系统：客户端不需要知道服务器实现细节

**Q: PUT 和 PATCH 的区别？**

A:
- `PUT`：全量更新，需要传递完整的资源数据
- `PATCH`：部分更新，只传递需要修改的字段
- 实践中：很多 API 使用 PUT 实现部分更新（更灵活）

### 5.2 SQL 注入防护

**Q: 如何防止 SQL 注入？**

A:
1. **参数化查询**（最重要）
   ```typescript
   // ✅ 安全
   db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
   
   // ❌ 危险
   db.prepare(`SELECT * FROM documents WHERE id = ${id}`).get()
   ```

2. **输入验证**
   ```typescript
   const allowedSortFields = ['id', 'title', 'created_at']
   const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updated_at'
   ```

3. **最小权限原则**
   - 数据库用户只授予必要的权限
   - 避免使用 root 用户

**Q: 什么是 SQL 注入？举个例子。**

A: SQL 注入是通过在输入中插入恶意 SQL 代码来攻击数据库。

```typescript
// 假设用户输入：id = "1 OR 1=1"
const sql = `SELECT * FROM documents WHERE id = ${id}`
// 实际执行：SELECT * FROM documents WHERE id = 1 OR 1=1
// 结果：返回所有文档（绕过权限检查）
```

### 5.3 分页实现

**Q: 分页的几种实现方式？**

A:
1. **OFFSET/LIMIT 分页**（本项目使用）
   ```sql
   SELECT * FROM documents LIMIT 20 OFFSET 40
   ```
   - 优点：简单易用
   - 缺点：深分页性能差（OFFSET 越大越慢）

2. **游标分页（Cursor-based）**
   ```sql
   SELECT * FROM documents WHERE id > last_id LIMIT 20
   ```
   - 优点：性能稳定
   - 缺点：不能跳页

3. **Seek Method**
   ```sql
   SELECT * FROM documents 
   WHERE (created_at, id) < (last_created_at, last_id)
   ORDER BY created_at DESC, id DESC
   LIMIT 20
   ```
   - 优点：性能最好
   - 缺点：实现复杂

**Q: 如何优化深分页性能？**

A:
1. 使用索引覆盖扫描
2. 延迟关联（先查 ID，再关联查详情）
3. 限制最大页数
4. 使用游标分页替代 OFFSET

### 5.4 软删除设计

**Q: 软删除的优缺点？**

A:
- 优点：
  - 数据可恢复
  - 保留审计记录
  - 避免外键约束问题
  
- 缺点：
  - 占用存储空间
  - 查询需要过滤 `is_deleted`
  - 唯一索引冲突（需要包含 is_deleted）

**Q: 如何处理软删除的唯一索引？**

A:
```sql
-- 方案1：唯一索引包含 is_deleted
CREATE UNIQUE INDEX idx_email ON users(email, is_deleted)

-- 方案2：使用部分索引（PostgreSQL）
CREATE UNIQUE INDEX idx_email ON users(email) WHERE is_deleted = 0

-- 方案3：删除时修改唯一字段
UPDATE users SET email = CONCAT(email, '_deleted_', id) WHERE id = ?
```

---

## 六、验证功能

### 6.1 启动服务器

```bash
pnpm dev:server
```

应该看到：
```
📦 数据库连接成功
✅ 数据库表初始化完成
🚀 服务器启动成功！
```

### 6.2 测试 API

**1. 创建文档**

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一篇文档",
    "content": "这是文档内容"
  }'
```

预期响应：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "我的第一篇文档",
    "content": "这是文档内容",
    "metadata": {},
    "created_at": "2024-01-28 10:00:00",
    "updated_at": "2024-01-28 10:00:00"
  },
  "message": "文档创建成功"
}
```

**2. 获取文档列表**

```bash
curl http://localhost:3000/api/documents
```

**3. 获取文档详情**

```bash
curl http://localhost:3000/api/documents/1
```

**4. 更新文档**

```bash
curl -X PUT http://localhost:3000/api/documents/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

**5. 删除文档**

```bash
curl -X DELETE http://localhost:3000/api/documents/1
```

**6. 测试分页和搜索**

```bash
# 分页
curl "http://localhost:3000/api/documents?page=1&pageSize=10"

# 搜索
curl "http://localhost:3000/api/documents?keyword=文档"

# 排序
curl "http://localhost:3000/api/documents?sortBy=created_at&sortOrder=ASC"
```

### 6.3 验证清单

- ✅ 创建文档成功，返回 201 状态码
- ✅ 获取列表支持分页
- ✅ 搜索功能正常
- ✅ 排序功能正常
- ✅ 获取详情返回完整数据
- ✅ 更新文档成功
- ✅ 删除文档成功（软删除）
- ✅ 删除后的文档不在列表中显示
- ✅ 访问不存在的文档返回 404
- ✅ 错误处理正常

---

## 七、本章小结

通过本章学习，我们完成了：

### 功能实现
- ✅ 完整的文档 CRUD API
- ✅ 分页、搜索、排序功能
- ✅ 参数验证和错误处理
- ✅ 软删除机制

### 核心概念
- ✅ RESTful API 设计规范
- ✅ SQL 注入防护
- ✅ 动态 SQL 构建
- ✅ 分页实现原理

### 最佳实践
- ✅ 参数化查询
- ✅ 白名单验证
- ✅ 统一错误处理
- ✅ 合理的状态码使用

---

## 八、下一章预告

在下一章（Chapter 5）中，我们将：

1. **集成 Zustand 状态管理**
   - 创建文档 Store
   - 实现异步 Actions
   - 状态持久化

2. **集成 Axios 请求库**
   - 配置请求拦截器
   - 统一错误处理
   - 请求取消

3. **前后端联调**
   - 调用后端 API
   - 处理加载状态
   - 错误提示

准备好了吗？让我们继续前进！🚀
