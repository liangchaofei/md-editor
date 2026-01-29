# Chapter 18: 文档历史版本

## 本章目标

在本章中，我们将为编辑器添加文档历史版本功能：

1. **自动版本快照**：定期保存文档版本
2. **版本列表**：查看所有历史版本
3. **版本预览**：查看历史版本内容
4. **版本恢复**：恢复到指定版本

这些功能将提供数据安全保障，让用户可以随时回退到之前的版本。

---

## 理论知识

### 1. 版本控制系统

#### 1.1 版本控制的重要性

- **数据安全**：防止误操作导致数据丢失
- **历史追溯**：查看文档的演变过程
- **协作支持**：多人编辑时可以回退到稳定版本
- **审计需求**：企业级应用的合规要求

#### 1.2 版本控制策略

| 策略 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| 全量快照 | 保存完整内容 | 恢复快速 | 占用空间大 |
| 增量快照 | 只保存变化 | 节省空间 | 恢复较慢 |
| 混合策略 | 定期全量+增量 | 平衡性能和空间 | 实现复杂 |

本章我们使用**全量快照**策略，简单且可靠。

### 2. 版本快照时机

#### 2.1 自动快照

- **定时快照**：每隔一定时间自动保存
- **编辑次数**：累计编辑N次后保存
- **重要操作**：关闭文档、切换文档时保存

#### 2.2 手动快照

- 用户主动创建版本
- 可以添加版本说明

### 3. 数据库设计

#### 3.1 版本表结构

```sql
CREATE TABLE document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

#### 3.2 索引优化

```sql
CREATE INDEX idx_document_versions_document_id 
ON document_versions(document_id);

CREATE INDEX idx_document_versions_created_at 
ON document_versions(created_at DESC);
```

### 4. 版本对比算法

#### 4.1 文本 Diff 算法

常用的文本对比算法：
- **Myers Diff**：Git 使用的算法
- **Patience Diff**：更适合代码对比
- **Word Diff**：按单词对比

#### 4.2 实现方案

我们使用简单的行对比，展示新增、删除和修改的内容。


---

## 实现步骤

### 步骤 1：创建版本表

更新 `server/src/database/index.ts`，添加版本表：

```typescript
// 在 initDatabase 函数中添加版本表创建

// 创建文档版本表
db.exec(`
  CREATE TABLE IF NOT EXISTS document_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  )
`)

// 创建索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_document_versions_document_id 
  ON document_versions(document_id)
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_document_versions_created_at 
  ON document_versions(created_at DESC)
`)

console.log('✅ 文档版本表初始化完成')
```

### 步骤 2：创建版本 API

创建 `server/src/routes/versions.ts`：

```typescript
/**
 * 文档版本路由
 */

import Router from '@koa/router'
import { db } from '../database'
import { success, error as errorResponse } from '../utils/response'

const router = new Router({
  prefix: '/api/versions',
})

/**
 * 获取文档的所有版本
 * GET /api/versions/:documentId
 */
router.get('/:documentId', async (ctx) => {
  try {
    const { documentId } = ctx.params
    const { page = 1, pageSize = 20 } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)

    // 查询版本列表
    const versions = db
      .prepare(
        `SELECT id, document_id, version_number, description, created_at,
         LENGTH(content) as content_size
         FROM document_versions
         WHERE document_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(documentId, Number(pageSize), offset)

    // 查询总数
    const { total } = db
      .prepare('SELECT COUNT(*) as total FROM document_versions WHERE document_id = ?')
      .get(documentId) as { total: number }

    ctx.body = success({
      versions,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    })
  } catch (error) {
    console.error('获取版本列表失败:', error)
    ctx.body = errorResponse('获取版本列表失败')
  }
})

/**
 * 获取指定版本的内容
 * GET /api/versions/:documentId/:versionId
 */
router.get('/:documentId/:versionId', async (ctx) => {
  try {
    const { documentId, versionId } = ctx.params

    const version = db
      .prepare(
        `SELECT * FROM document_versions 
         WHERE id = ? AND document_id = ?`
      )
      .get(versionId, documentId)

    if (!version) {
      ctx.body = errorResponse('版本不存在', 404)
      return
    }

    ctx.body = success(version)
  } catch (error) {
    console.error('获取版本内容失败:', error)
    ctx.body = errorResponse('获取版本内容失败')
  }
})

/**
 * 创建新版本
 * POST /api/versions/:documentId
 */
router.post('/:documentId', async (ctx) => {
  try {
    const { documentId } = ctx.params
    const { content, description } = ctx.request.body as {
      content: string
      description?: string
    }

    // 获取当前最大版本号
    const { maxVersion } = db
      .prepare(
        'SELECT COALESCE(MAX(version_number), 0) as maxVersion FROM document_versions WHERE document_id = ?'
      )
      .get(documentId) as { maxVersion: number }

    const versionNumber = maxVersion + 1

    // 插入新版本
    const result = db
      .prepare(
        `INSERT INTO document_versions (document_id, content, version_number, description)
         VALUES (?, ?, ?, ?)`
      )
      .run(documentId, content, versionNumber, description || null)

    const version = db
      .prepare('SELECT * FROM document_versions WHERE id = ?')
      .get(result.lastInsertRowid)

    ctx.body = success(version)
  } catch (error) {
    console.error('创建版本失败:', error)
    ctx.body = errorResponse('创建版本失败')
  }
})

/**
 * 恢复到指定版本
 * POST /api/versions/:documentId/:versionId/restore
 */
router.post('/:documentId/:versionId/restore', async (ctx) => {
  try {
    const { documentId, versionId } = ctx.params

    // 获取版本内容
    const version = db
      .prepare('SELECT content FROM document_versions WHERE id = ? AND document_id = ?')
      .get(versionId, documentId) as { content: string } | undefined

    if (!version) {
      ctx.body = errorResponse('版本不存在', 404)
      return
    }

    // 更新文档内容
    db.prepare('UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      version.content,
      documentId
    )

    // 创建恢复操作的新版本
    const { maxVersion } = db
      .prepare(
        'SELECT COALESCE(MAX(version_number), 0) as maxVersion FROM document_versions WHERE document_id = ?'
      )
      .get(documentId) as { maxVersion: number }

    db.prepare(
      `INSERT INTO document_versions (document_id, content, version_number, description)
       VALUES (?, ?, ?, ?)`
    ).run(documentId, version.content, maxVersion + 1, `恢复到版本 #${versionId}`)

    ctx.body = success({ message: '版本恢复成功' })
  } catch (error) {
    console.error('恢复版本失败:', error)
    ctx.body = errorResponse('恢复版本失败')
  }
})

/**
 * 删除版本
 * DELETE /api/versions/:documentId/:versionId
 */
router.delete('/:documentId/:versionId', async (ctx) => {
  try {
    const { documentId, versionId } = ctx.params

    const result = db
      .prepare('DELETE FROM document_versions WHERE id = ? AND document_id = ?')
      .run(versionId, documentId)

    if (result.changes === 0) {
      ctx.body = errorResponse('版本不存在', 404)
      return
    }

    ctx.body = success({ message: '版本删除成功' })
  } catch (error) {
    console.error('删除版本失败:', error)
    ctx.body = errorResponse('删除版本失败')
  }
})

export default router
```

### 步骤 3：注册版本路由

更新 `server/src/index.ts`，注册版本路由：

```typescript
// 导入版本路由
import versionsRouter from './routes/versions'

// 注册路由
app.use(versionsRouter.routes()).use(versionsRouter.allowedMethods())
```

### 步骤 4：创建版本 API 客户端

创建 `client/src/api/version.ts`：

```typescript
/**
 * 版本 API
 */

import { request } from './request'

export interface Version {
  id: number
  document_id: number
  content: string
  version_number: number
  description: string | null
  created_at: string
  content_size?: number
}

export interface VersionListResponse {
  versions: Version[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 获取文档版本列表
 */
export async function getVersions(documentId: number, page = 1, pageSize = 20) {
  return request<VersionListResponse>(`/api/versions/${documentId}?page=${page}&pageSize=${pageSize}`)
}

/**
 * 获取指定版本内容
 */
export async function getVersion(documentId: number, versionId: number) {
  return request<Version>(`/api/versions/${documentId}/${versionId}`)
}

/**
 * 创建新版本
 */
export async function createVersion(documentId: number, content: string, description?: string) {
  return request<Version>(`/api/versions/${documentId}`, {
    method: 'POST',
    body: JSON.stringify({ content, description }),
  })
}

/**
 * 恢复到指定版本
 */
export async function restoreVersion(documentId: number, versionId: number) {
  return request(`/api/versions/${documentId}/${versionId}/restore`, {
    method: 'POST',
  })
}

/**
 * 删除版本
 */
export async function deleteVersion(documentId: number, versionId: number) {
  return request(`/api/versions/${documentId}/${versionId}`, {
    method: 'DELETE',
  })
}
```

### 步骤 5：创建版本历史组件

创建 `client/src/components/editor/VersionHistory.tsx`：

```typescript
/**
 * 版本历史组件
 */

import { useState, useEffect } from 'react'
import { getVersions, getVersion, restoreVersion, deleteVersion, type Version } from '../../api/version'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface VersionHistoryProps {
  documentId: number
  onClose: () => void
  onRestore: (content: string) => void
}

export function VersionHistory({ documentId, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewContent, setPreviewContent] = useState('')

  // 加载版本列表
  useEffect(() => {
    loadVersions()
  }, [documentId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const data = await getVersions(documentId)
      setVersions(data.versions)
    } catch (error) {
      console.error('加载版本列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 预览版本
  const handlePreview = async (version: Version) => {
    try {
      setSelectedVersion(version)
      const data = await getVersion(documentId, version.id)
      setPreviewContent(data.content)
    } catch (error) {
      console.error('加载版本内容失败:', error)
    }
  }

  // 恢复版本
  const handleRestore = async (versionId: number) => {
    if (!confirm('确定要恢复到此版本吗？当前内容将被替换。')) {
      return
    }

    try {
      await restoreVersion(documentId, versionId)
      if (selectedVersion) {
        onRestore(previewContent)
      }
      alert('版本恢复成功')
      onClose()
    } catch (error) {
      console.error('恢复版本失败:', error)
      alert('恢复版本失败')
    }
  }

  // 删除版本
  const handleDelete = async (versionId: number) => {
    if (!confirm('确定要删除此版本吗？')) {
      return
    }

    try {
      await deleteVersion(documentId, versionId)
      setVersions(versions.filter((v) => v.id !== versionId))
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(null)
        setPreviewContent('')
      }
      alert('版本删除成功')
    } catch (error) {
      console.error('删除版本失败:', error)
      alert('删除版本失败')
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: zhCN,
    })
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">版本历史</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 版本列表 */}
          <div className="w-80 border-r overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">加载中...</div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">暂无历史版本</div>
            ) : (
              <div className="divide-y">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedVersion?.id === version.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handlePreview(version)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium">版本 #{version.version_number}</div>
                      <div className="text-xs text-gray-500">{formatTime(version.created_at)}</div>
                    </div>
                    {version.description && (
                      <div className="text-sm text-gray-600 mb-2">{version.description}</div>
                    )}
                    {version.content_size && (
                      <div className="text-xs text-gray-400">{formatSize(version.content_size)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 预览区域 */}
          <div className="flex-1 flex flex-col">
            {selectedVersion ? (
              <>
                {/* 预览头部 */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">版本 #{selectedVersion.version_number}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedVersion.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(selectedVersion.id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      恢复此版本
                    </button>
                    <button
                      onClick={() => handleDelete(selectedVersion.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 预览内容 */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                选择一个版本查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**代码说明**：

1. **版本列表**：
   - 显示所有历史版本
   - 显示版本号、时间、描述、大小
   - 使用 `date-fns` 格式化相对时间

2. **版本预览**：
   - 点击版本加载内容
   - 使用 `dangerouslySetInnerHTML` 渲染 HTML
   - 显示版本详细信息

3. **版本操作**：
   - 恢复版本：替换当前文档内容
   - 删除版本：从列表中移除
   - 操作前确认提示

### 步骤 6：集成到编辑器

更新 `client/src/components/editor/TiptapEditor.tsx`，添加版本历史按钮：

```typescript
// 导入版本历史组件
import { VersionHistory } from './VersionHistory'
import { createVersion } from '../../api/version'

// 在组件中添加状态
const [showVersionHistory, setShowVersionHistory] = useState(false)

// 添加保存版本函数
const handleSaveVersion = async (description?: string) => {
  if (!documentId || !editor) return

  try {
    const content = editor.getHTML()
    await createVersion(documentId, content, description)
    alert('版本保存成功')
  } catch (error) {
    console.error('保存版本失败:', error)
    alert('保存版本失败')
  }
}

// 添加恢复版本函数
const handleRestoreVersion = (content: string) => {
  if (!editor) return
  editor.commands.setContent(content)
}

// 在工具栏中添加版本历史按钮
<button
  onClick={() => setShowVersionHistory(true)}
  className="p-2 hover:bg-gray-100 rounded transition-colors"
  title="版本历史"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
</button>

<button
  onClick={() => {
    const description = prompt('请输入版本说明（可选）:')
    if (description !== null) {
      handleSaveVersion(description || undefined)
    }
  }}
  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
>
  保存版本
</button>

// 在组件末尾添加版本历史弹窗
{showVersionHistory && documentId && (
  <VersionHistory
    documentId={documentId}
    onClose={() => setShowVersionHistory(false)}
    onRestore={handleRestoreVersion}
  />
)}
```

### 步骤 7：安装依赖

安装 `date-fns` 用于时间格式化：

```bash
cd client
pnpm add date-fns
```

---

## 功能验证

### 1. 测试版本创建

1. 打开一个文档
2. 编辑内容
3. 点击"保存版本"按钮
4. 输入版本说明（可选）
5. 确认版本创建成功

### 2. 测试版本列表

1. 点击"版本历史"按钮
2. 查看版本列表
3. 验证版本号、时间、描述显示正确
4. 验证文件大小显示正确

### 3. 测试版本预览

1. 在版本列表中点击某个版本
2. 查看右侧预览区域
3. 验证内容显示正确
4. 验证格式保持一致

### 4. 测试版本恢复

1. 选择一个历史版本
2. 点击"恢复此版本"
3. 确认操作
4. 验证编辑器内容已更新
5. 验证创建了新的恢复版本

### 5. 测试版本删除

1. 选择一个版本
2. 点击"删除"按钮
3. 确认操作
4. 验证版本从列表中移除

### 6. 测试协作场景

1. 打开两个浏览器窗口
2. 在窗口 A 中保存版本
3. 在窗口 B 中查看版本历史
4. 验证版本同步显示

---

## 优化建议

### 1. 自动版本快照

可以添加自动保存版本的功能：

```typescript
// 定时自动保存
useEffect(() => {
  if (!documentId || !editor) return

  const interval = setInterval(() => {
    const content = editor.getHTML()
    createVersion(documentId, content, '自动保存')
  }, 5 * 60 * 1000) // 每 5 分钟

  return () => clearInterval(interval)
}, [documentId, editor])
```

### 2. 版本对比

可以添加版本对比功能，显示两个版本之间的差异：

```typescript
import { diffWords } from 'diff'

function compareVersions(oldContent: string, newContent: string) {
  const diff = diffWords(oldContent, newContent)
  return diff.map((part) => ({
    value: part.value,
    added: part.added,
    removed: part.removed,
  }))
}
```

### 3. 版本压缩

对于大文档，可以使用压缩算法减少存储空间：

```typescript
import pako from 'pako'

// 压缩内容
function compressContent(content: string): string {
  const compressed = pako.deflate(content)
  return btoa(String.fromCharCode(...compressed))
}

// 解压内容
function decompressContent(compressed: string): string {
  const binary = atob(compressed)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const decompressed = pako.inflate(bytes)
  return new TextDecoder().decode(decompressed)
}
```

### 4. 版本标签

可以为重要版本添加标签：

```typescript
interface Version {
  // ... 其他字段
  tags?: string[]
  is_milestone?: boolean
}

// 标记为里程碑版本
function markAsMilestone(versionId: number) {
  return request(`/api/versions/${versionId}/milestone`, {
    method: 'POST',
  })
}
```

### 5. 版本导出

可以导出特定版本的内容：

```typescript
function exportVersion(version: Version) {
  const blob = new Blob([version.content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `version-${version.version_number}.html`
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## 性能优化

### 1. 分页加载

版本列表使用分页，避免一次加载过多数据：

```typescript
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)

const loadMoreVersions = async () => {
  const data = await getVersions(documentId, page + 1)
  setVersions([...versions, ...data.versions])
  setPage(page + 1)
  setHasMore(data.pagination.page < data.pagination.totalPages)
}
```

### 2. 虚拟滚动

对于大量版本，使用虚拟滚动优化性能：

```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={versions.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {/* 渲染版本项 */}
    </div>
  )}
</FixedSizeList>
```

### 3. 内容缓存

缓存已加载的版本内容：

```typescript
const contentCache = useRef<Map<number, string>>(new Map())

const loadVersionContent = async (versionId: number) => {
  if (contentCache.current.has(versionId)) {
    return contentCache.current.get(versionId)!
  }

  const data = await getVersion(documentId, versionId)
  contentCache.current.set(versionId, data.content)
  return data.content
}
```

---

## 安全考虑

### 1. 权限控制

确保用户只能访问自己有权限的文档版本：

```typescript
// 后端验证
router.get('/:documentId', async (ctx) => {
  const { documentId } = ctx.params
  const userId = ctx.state.user.id

  // 检查文档权限
  const document = db
    .prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(documentId, userId)

  if (!document) {
    ctx.body = errorResponse('无权访问', 403)
    return
  }

  // ... 查询版本
})
```

### 2. 版本数量限制

限制每个文档的版本数量，避免占用过多存储：

```typescript
const MAX_VERSIONS = 50

// 创建新版本时检查
const versionCount = db
  .prepare('SELECT COUNT(*) as count FROM document_versions WHERE document_id = ?')
  .get(documentId) as { count: number }

if (versionCount.count >= MAX_VERSIONS) {
  // 删除最旧的版本
  db.prepare(
    `DELETE FROM document_versions 
     WHERE id = (
       SELECT id FROM document_versions 
       WHERE document_id = ? 
       ORDER BY created_at ASC 
       LIMIT 1
     )`
  ).run(documentId)
}
```

### 3. 内容验证

验证版本内容的合法性：

```typescript
function validateContent(content: string): boolean {
  // 检查内容长度
  if (content.length > 10 * 1024 * 1024) {
    return false // 超过 10MB
  }

  // 检查是否包含恶意脚本
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ]

  return !dangerousPatterns.some((pattern) => pattern.test(content))
}
```

---

## 本章小结

在本章中，我们实现了完整的文档版本历史功能：

### 实现的功能

1. ✅ **版本管理**
   - 创建版本快照
   - 查看版本列表
   - 预览版本内容
   - 恢复到指定版本
   - 删除历史版本

2. ✅ **用户界面**
   - 版本列表侧边栏
   - 版本预览区域
   - 版本操作按钮
   - 时间和大小格式化

3. ✅ **数据管理**
   - SQLite 版本表
   - 版本号自动递增
   - 索引优化查询
   - 分页加载支持

### 技术要点

1. **数据库设计**：使用外键关联文档，添加索引优化查询
2. **API 设计**：RESTful 风格，支持 CRUD 操作
3. **UI 组件**：弹窗式界面，列表+预览布局
4. **时间处理**：使用 date-fns 格式化相对时间
5. **错误处理**：操作前确认，失败后提示

### 下一步

在下一章中，我们将进行性能优化，包括：
- 编辑器性能优化
- 协作性能优化
- 数据库查询优化
- 前端资源优化

---

## 常见问题

### 1. 版本内容过大怎么办？

可以使用压缩算法（如 gzip）压缩内容后存储。

### 2. 如何实现版本对比？

可以使用 `diff` 库对比两个版本的差异，高亮显示变化。

### 3. 版本恢复后协作用户会看到吗？

会的，因为恢复操作会更新文档内容，通过 Y.js 同步到所有客户端。

### 4. 可以恢复到任意时间点吗？

目前只能恢复到已保存的版本快照，不支持任意时间点恢复。

### 5. 版本数据会占用多少空间？

取决于文档大小和版本数量。建议定期清理旧版本或使用压缩。

