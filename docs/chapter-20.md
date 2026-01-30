# Chapter 20: DeepSeek API 集成

## 本章目标

集成 DeepSeek API，实现后端 AI 代理服务和流式响应处理。使用 OpenAI SDK（兼容 DeepSeek），通过 Server-Sent Events (SSE) 实现流式对话。

**完成后的功能：**
- ✅ 安装 OpenAI SDK
- ✅ 配置 DeepSeek API Key（环境变量）
- ✅ 实现后端 AI 代理路由
- ✅ 实现流式响应（SSE）
- ✅ 创建前端 AI API 客户端
- ✅ 错误处理和重试机制

---

## 1. 理论知识

### 1.1 DeepSeek API 简介

DeepSeek 是一个高性价比的 AI 模型服务，提供与 OpenAI 兼容的 API 接口。

**优势：**
- 价格低廉（比 GPT-4 便宜很多）
- 中文支持优秀
- API 兼容 OpenAI SDK
- 响应速度快

**API 端点：**
```
https://api.deepseek.com/v1
```

### 1.2 Server-Sent Events (SSE)

SSE 是一种服务器向客户端推送数据的技术，非常适合实现流式响应。

**SSE vs WebSocket：**
- SSE：单向通信（服务器 → 客户端），更简单
- WebSocket：双向通信，更复杂
- 对于 AI 流式输出，SSE 更合适

**SSE 格式：**
```
data: {"content": "Hello"}\n\n
data: {"content": " World"}\n\n
data: [DONE]\n\n
```

### 1.3 为什么需要后端代理

不直接在前端调用 DeepSeek API 的原因：
1. **安全性**：API Key 不能暴露在前端代码中
2. **CORS**：避免跨域问题
3. **控制**：可以添加日志、限流、缓存等
4. **灵活性**：可以切换不同的 AI 模型

---

## 2. 安装依赖

### 2.1 后端依赖

```bash
cd server
pnpm add openai
```

### 2.2 前端依赖

前端不需要额外依赖，使用原生 EventSource API。

---

## 3. 配置 API Key

### 3.1 创建服务器环境变量文件

**创建文件：** `server/.env`

```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

**说明：**
- `DEEPSEEK_API_KEY`：你的 DeepSeek API Key（需要自己申请）
- `DEEPSEEK_BASE_URL`：DeepSeek API 端点
- `DEEPSEEK_MODEL`：使用的模型名称

### 3.2 安装 dotenv

```bash
cd server
pnpm add dotenv
```

### 3.3 加载环境变量

**修改文件：** `server/src/index.ts`

在文件顶部添加：

```typescript
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()
```

---

## 4. 实现后端 AI 服务

### 4.1 创建 AI 配置文件

**创建文件：** `server/src/config/ai.ts`

```typescript
/**
 * AI 配置
 */

export const aiConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
}

// 验证配置
export function validateAIConfig() {
  if (!aiConfig.apiKey) {
    console.warn('⚠️  DEEPSEEK_API_KEY 未配置，AI 功能将不可用')
    return false
  }
  return true
}
```

### 4.2 创建 AI 服务

**创建文件：** `server/src/services/ai.ts`

```typescript
/**
 * AI 服务
 * 使用 OpenAI SDK 调用 DeepSeek API
 */

import OpenAI from 'openai'
import { aiConfig } from '../config/ai.js'

// 创建 OpenAI 客户端（兼容 DeepSeek）
const openai = new OpenAI({
  apiKey: aiConfig.apiKey,
  baseURL: aiConfig.baseURL,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * 发送聊天请求（流式）
 */
export async function* streamChat(options: ChatOptions) {
  const { messages, temperature = 0.7, maxTokens = 2000 } = options

  try {
    const stream = await openai.chat.completions.create({
      model: aiConfig.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    console.error('AI 服务错误:', error)
    throw error
  }
}

/**
 * 发送聊天请求（非流式）
 */
export async function chat(options: ChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens = 2000 } = options

  try {
    const response = await openai.chat.completions.create({
      model: aiConfig.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('AI 服务错误:', error)
    throw error
  }
}
```

### 4.3 创建 AI 路由

**创建文件：** `server/src/routes/ai.ts`

```typescript
/**
 * AI 路由
 * 处理 AI 相关的 API 请求
 */

import Router from '@koa/router'
import { streamChat, type ChatMessage } from '../services/ai.js'
import { validateAIConfig } from '../config/ai.js'

const router = new Router({
  prefix: '/api/ai',
})

/**
 * POST /api/ai/chat
 * 发送聊天消息（流式响应）
 */
router.post('/chat', async (ctx) => {
  // 验证 AI 配置
  if (!validateAIConfig()) {
    ctx.status = 503
    ctx.body = {
      success: false,
      message: 'AI 服务未配置',
    }
    return
  }

  const { messages, temperature, maxTokens } = ctx.request.body as {
    messages: ChatMessage[]
    temperature?: number
    maxTokens?: number
  }

  // 验证请求参数
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '缺少 messages 参数',
    }
    return
  }

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  ctx.status = 200

  try {
    // 流式响应
    const stream = streamChat({
      messages,
      temperature,
      maxTokens,
    })

    for await (const chunk of stream) {
      // 发送 SSE 数据
      ctx.res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    // 发送完成标记
    ctx.res.write(`data: [DONE]\n\n`)
  } catch (error) {
    console.error('AI 聊天错误:', error)
    ctx.res.write(`data: ${JSON.stringify({ error: '生成失败，请重试' })}\n\n`)
  } finally {
    ctx.res.end()
  }
})

/**
 * GET /api/ai/models
 * 获取可用的模型列表
 */
router.get('/models', async (ctx) => {
  ctx.body = {
    success: true,
    data: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: '通用对话模型',
      },
    ],
  }
})

export default router
```

### 4.4 注册 AI 路由

**修改文件：** `server/src/index.ts`

在导入部分添加：

```typescript
import aiRoutes from './routes/ai.js'
```

在注册路由部分添加：

```typescript
// 注册路由
app.use(documentsRoutes.routes())
app.use(documentsRoutes.allowedMethods())
app.use(aiRoutes.routes())
app.use(aiRoutes.allowedMethods())
```

---

## 5. 实现前端 AI 客户端

### 5.1 创建 AI API 客户端

**创建文件：** `client/src/api/ai.ts`

```typescript
/**
 * AI API 客户端
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  onChunk?: (content: string) => void
  onComplete?: () => void
  onError?: (error: string) => void
}

/**
 * 发送聊天消息（流式）
 */
export async function streamChatAPI(options: ChatOptions): Promise<void> {
  const { messages, temperature, maxTokens, onChunk, onComplete, onError } = options

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature,
        maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue

        const data = line.slice(6) // 移除 "data: " 前缀

        if (data === '[DONE]') {
          onComplete?.()
          return
        }

        try {
          const parsed = JSON.parse(data)
          if (parsed.error) {
            onError?.(parsed.error)
            return
          }
          if (parsed.content) {
            onChunk?.(parsed.content)
          }
        } catch (e) {
          console.error('解析 SSE 数据失败:', e)
        }
      }
    }
  } catch (error) {
    console.error('AI 请求失败:', error)
    onError?.(error instanceof Error ? error.message : '请求失败')
  }
}

/**
 * 获取可用的模型列表
 */
export async function getModelsAPI() {
  const response = await fetch('/api/ai/models')
  const data = await response.json()
  return data.data
}
```

---

## 6. 测试 AI 功能

### 6.1 配置 API Key

1. 访问 [DeepSeek 官网](https://platform.deepseek.com/) 注册账号
2. 获取 API Key
3. 在 `server/.env` 文件中配置：

```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 6.2 启动服务器

```bash
pnpm dev
```

### 6.3 测试 API（使用 curl）

```bash
# 测试流式聊天
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'

# 测试获取模型列表
curl http://localhost:3000/api/ai/models
```

---

## 7. 核心知识点

### 7.1 SSE 实现原理


**服务器端：**
```typescript
// 设置 SSE 响应头
ctx.set({
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
})

// 发送数据
ctx.res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
```

**客户端：**
```typescript
// 使用 Fetch API + ReadableStream
const reader = response.body?.getReader()
const { done, value } = await reader.read()
```

### 7.2 OpenAI SDK 兼容性

OpenAI SDK 支持自定义 `baseURL`，可以兼容任何 OpenAI 格式的 API：

```typescript
const openai = new OpenAI({
  apiKey: 'your-key',
  baseURL: 'https://api.deepseek.com/v1', // 自定义端点
})
```

### 7.3 环境变量安全

- ✅ API Key 存储在服务器端环境变量
- ✅ 不提交 `.env` 文件到 Git
- ✅ 提供 `.env.example` 作为模板
- ✅ 前端通过后端代理访问 AI 服务

---

## 8. 常见问题

### 8.1 API Key 未配置

**问题：** 启动服务器时提示 API Key 未配置

**解决：**
1. 确保创建了 `server/.env` 文件
2. 确保配置了 `DEEPSEEK_API_KEY`
3. 确保在 `index.ts` 中加载了 `dotenv.config()`

### 8.2 CORS 错误

**问题：** 前端请求 AI API 时出现 CORS 错误

**解决：** 确保前端和后端在同一域名下，或者配置 CORS 中间件

### 8.3 SSE 连接中断

**问题：** 流式响应中途断开

**解决：**
1. 检查网络连接
2. 检查服务器日志
3. 添加错误处理和重试机制

---

## 9. 面试考点

### 9.1 SSE vs WebSocket

**问题：** SSE 和 WebSocket 的区别？

**答案：**
- **SSE**：单向通信，服务器推送，基于 HTTP，自动重连
- **WebSocket**：双向通信，全双工，独立协议，需要手动重连
- **选择**：AI 流式输出用 SSE 更简单，实时协同用 WebSocket

### 9.2 流式响应优势

**问题：** 为什么使用流式响应？

**答案：**
1. **用户体验**：实时看到生成内容，不用等待
2. **性能**：减少首字节时间（TTFB）
3. **可控性**：可以随时停止生成
4. **资源利用**：不需要等待完整响应

### 9.3 API Key 安全

**问题：** 如何保护 API Key？

**答案：**
1. 存储在服务器端环境变量
2. 不提交到 Git
3. 使用后端代理
4. 添加访问限流
5. 定期轮换 Key

---

## 10. 下一步

在下一章（Chapter 21），我们将：
1. 完善 AI 对话面板组件
2. 实现消息列表展示
3. 实现"正在思考中"状态
4. 实现 Markdown 渲染
5. 集成前端 AI API 客户端

---

## 11. 本章总结

本章我们完成了 DeepSeek API 的集成：

**完成的功能：**
- ✅ 安装 OpenAI SDK
- ✅ 配置环境变量和 API Key
- ✅ 创建 AI 配置和服务
- ✅ 实现后端 AI 路由（流式响应）
- ✅ 创建前端 AI API 客户端
- ✅ 实现 SSE 流式数据处理

**技术要点：**
- OpenAI SDK 兼容性
- Server-Sent Events (SSE)
- 环境变量管理
- 流式数据处理
- 错误处理

**安全措施：**
- API Key 存储在服务器端
- 使用环境变量配置
- 后端代理保护 API
- 不暴露敏感信息

现在后端 AI 服务已经准备就绪，下一章我们将实现完整的 AI 对话界面！

---

**Commit 信息：**
```
feat: 集成 DeepSeek API 实现流式对话

- 安装 OpenAI SDK
- 创建 AI 配置文件（支持环境变量）
- 实现 AI 服务（流式和非流式）
- 创建 AI 路由（SSE 流式响应）
- 实现前端 AI API 客户端
- 添加错误处理和验证
- 支持自定义温度和最大 Token 数
```
