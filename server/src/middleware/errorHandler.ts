/**
 * 全局错误处理中间件
 */

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

    // 触发 Koa 的错误事件（用于日志记录）
    ctx.app.emit('error', err, ctx)
  }
}
