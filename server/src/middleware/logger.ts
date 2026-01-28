/**
 * 请求日志中间件
 */

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

/**
 * 根据 HTTP 方法返回颜色代码
 */
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

/**
 * 根据状态码返回颜色代码
 */
function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m' // 红色
  if (status >= 400) return '\x1b[33m' // 黄色
  if (status >= 300) return '\x1b[36m' // 青色
  if (status >= 200) return '\x1b[32m' // 绿色
  return '\x1b[0m' // 默认
}
