import Koa from 'koa'
import cors from '@koa/cors'
import Router from '@koa/router'

const app = new Koa()
const router = new Router()

// 中间件
app.use(cors())

// 健康检查接口
router.get('/health', ctx => {
  ctx.body = {
    status: 'ok',
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
  }
})

// API 路由
router.get('/api/info', ctx => {
  ctx.body = {
    name: '协同编辑器后端服务',
    version: '1.0.0',
    description: '基于 Koa2 + TypeScript 的后端服务',
  }
})

// 注册路由
app.use(router.routes()).use(router.allowedMethods())

// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err, ctx)
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 服务器启动成功！`)
  console.log(`📍 地址: http://localhost:${PORT}`)
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`)
  console.log(`📡 API 信息: http://localhost:${PORT}/api/info`)
})
