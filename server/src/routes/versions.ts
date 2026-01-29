/**
 * 文档版本路由
 */

import Router from '@koa/router'
import { getDatabase } from '../database/index.js'
import { success, error } from '../utils/response.js'

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
    const { page = '1', pageSize = '20' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const db = getDatabase()

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
    const result = db
      .prepare('SELECT COUNT(*) as total FROM document_versions WHERE document_id = ?')
      .get(documentId) as { total: number }

    success(ctx, {
      versions,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(pageSize)),
      },
    })
  } catch (err) {
    console.error('获取版本列表失败:', err)
    error(ctx, 'GET_VERSIONS_ERROR', '获取版本列表失败')
  }
})

/**
 * 获取指定版本的内容
 * GET /api/versions/:documentId/:versionId
 */
router.get('/:documentId/:versionId', async (ctx) => {
  try {
    const { documentId, versionId } = ctx.params
    const db = getDatabase()

    const version = db
      .prepare(
        `SELECT * FROM document_versions 
         WHERE id = ? AND document_id = ?`
      )
      .get(versionId, documentId)

    if (!version) {
      error(ctx, 'VERSION_NOT_FOUND', '版本不存在', 404)
      return
    }

    success(ctx, version)
  } catch (err) {
    console.error('获取版本内容失败:', err)
    error(ctx, 'GET_VERSION_ERROR', '获取版本内容失败')
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

    const db = getDatabase()

    // 获取当前最大版本号
    const result = db
      .prepare(
        'SELECT COALESCE(MAX(version_number), 0) as maxVersion FROM document_versions WHERE document_id = ?'
      )
      .get(documentId) as { maxVersion: number }

    const versionNumber = result.maxVersion + 1

    // 插入新版本
    const insertResult = db
      .prepare(
        `INSERT INTO document_versions (document_id, content, version_number, description)
         VALUES (?, ?, ?, ?)`
      )
      .run(documentId, content, versionNumber, description || null)

    const version = db
      .prepare('SELECT * FROM document_versions WHERE id = ?')
      .get(insertResult.lastInsertRowid)

    success(ctx, version)
  } catch (err) {
    console.error('创建版本失败:', err)
    error(ctx, 'CREATE_VERSION_ERROR', '创建版本失败')
  }
})

/**
 * 恢复到指定版本
 * POST /api/versions/:documentId/:versionId/restore
 */
router.post('/:documentId/:versionId/restore', async (ctx) => {
  try {
    const { documentId, versionId } = ctx.params
    const db = getDatabase()

    // 获取版本内容
    const version = db
      .prepare('SELECT content FROM document_versions WHERE id = ? AND document_id = ?')
      .get(versionId, documentId) as { content: string } | undefined

    if (!version) {
      error(ctx, 'VERSION_NOT_FOUND', '版本不存在', 404)
      return
    }

    // 更新文档内容
    db.prepare('UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      version.content,
      documentId
    )

    // 创建恢复操作的新版本
    const result = db
      .prepare(
        'SELECT COALESCE(MAX(version_number), 0) as maxVersion FROM document_versions WHERE document_id = ?'
      )
      .get(documentId) as { maxVersion: number }

    db.prepare(
      `INSERT INTO document_versions (document_id, content, version_number, description)
       VALUES (?, ?, ?, ?)`
    ).run(documentId, version.content, result.maxVersion + 1, `恢复到版本 #${versionId}`)

    success(ctx, { message: '版本恢复成功' })
  } catch (err) {
    console.error('恢复版本失败:', err)
    error(ctx, 'RESTORE_VERSION_ERROR', '恢复版本失败')
  }
})

/**
 * 删除版本
 * DELETE /api/versions/:documentId/:versionId
 */
router.delete('/:documentId/:versionId', async (ctx) => {
  try {
    const { documentId, versionId } = ctx.params
    const db = getDatabase()

    const result = db
      .prepare('DELETE FROM document_versions WHERE id = ? AND document_id = ?')
      .run(versionId, documentId)

    if (result.changes === 0) {
      error(ctx, 'VERSION_NOT_FOUND', '版本不存在', 404)
      return
    }

    success(ctx, { message: '版本删除成功' })
  } catch (err) {
    console.error('删除版本失败:', err)
    error(ctx, 'DELETE_VERSION_ERROR', '删除版本失败')
  }
})

export default router
