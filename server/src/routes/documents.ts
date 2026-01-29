/**
 * 文档路由模块
 * 实现文档的增删改查功能
 */

import Router from '@koa/router'
import { getDatabase } from '../database/index.js'
import { success, error, notFound, serverError } from '../utils/response.js'
import type { Context } from 'koa'
import type { Document, DocumentListQuery } from '../types/index.js'

const router = new Router({
  prefix: '/api/documents',
})

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

export default router
