/**
 * 统一响应格式工具函数
 */

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
