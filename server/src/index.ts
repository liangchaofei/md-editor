import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from '@koa/bodyparser'
import Router from '@koa/router'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDatabase, closeDatabase, getDatabase } from './database/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './middleware/logger.js'
import { success } from './utils/response.js'
import documentsRouter from './routes/documents.js'
import versionsRouter from './routes/versions.js'
import aiRouter from './routes/ai.js'
import { startHocuspocusServer } from './hocuspocus.js'

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量（指定 .env 文件路径）
dotenv.config({ path: join(__dirname, '../.env') })

const app = new Koa()
const router = new Router()

// 全局中间件（注意顺序）
app.use(errorHandler) // 错误处理（最外层）
app.use(logger) // 日志记录
app.use(cors()) // 跨域处理
app.use(bodyParser()) // 请求体解析

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
router.get('/api/db-test', ctx => {
  const db = getDatabase()
  const result = db.prepare('SELECT 1 as test').get()
  success(ctx, result, '数据库连接正常')
})

// 注册业务路由
app.use(documentsRouter.routes()).use(documentsRouter.allowedMethods())
app.use(versionsRouter.routes()).use(versionsRouter.allowedMethods())
app.use(aiRouter.routes()).use(aiRouter.allowedMethods())

// 注册基础路由
app.use(router.routes()).use(router.allowedMethods())

// 错误事件监听
app.on('error', err => {
  console.error('❌ 应用错误:', err)
})

const PORT = process.env.PORT || 3000

// 启动服务器
async function startServer() {
  try {
    // 调试：打印环境变量加载状态
    console.log('\n🔧 环境变量加载状态:')
    console.log(`   DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '已配置 ✓' : '未配置 ✗'}`)
    console.log(`   DEEPSEEK_BASE_URL: ${process.env.DEEPSEEK_BASE_URL || '使用默认值'}`)
    console.log(`   DEEPSEEK_MODEL: ${process.env.DEEPSEEK_MODEL || '使用默认值'}`)
    
    // 初始化数据库
    initDatabase()

    // 启动 Hocuspocus WebSocket 服务器
    await startHocuspocusServer()

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50))
      console.log('🚀 服务器启动成功！')
      console.log('='.repeat(50))
      console.log(`📍 HTTP 服务: http://localhost:${PORT}`)
      console.log(`🔌 WebSocket 服务: ws://localhost:1234`)
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
process.on('SIGINT', () => {
  console.log('\n⏳ 正在关闭服务器...')
  closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏳ 正在关闭服务器...')
  closeDatabase()
  process.exit(0)
})

// 启动
startServer()
