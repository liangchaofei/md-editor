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
