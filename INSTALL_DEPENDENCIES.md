# Chapter 20 依赖安装说明

## 需要安装的依赖

### 1. 后端依赖

```bash
cd server
pnpm add openai dotenv
```

### 2. 配置 DeepSeek API Key

创建 `server/.env` 文件（参考 `server/.env.example`）：

```bash
cd server
cp .env.example .env
```

然后编辑 `.env` 文件，填入你的 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 3. 获取 DeepSeek API Key

1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制 API Key 到 `.env` 文件

### 4. 启动服务

```bash
# 在项目根目录
pnpm dev
```

### 5. 测试 AI API

使用 curl 测试：

```bash
# 测试流式聊天
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ]
  }'

# 测试获取模型列表
curl http://localhost:3000/api/ai/models
```

## 注意事项

1. **不要提交 `.env` 文件到 Git**
   - `.env` 文件已经在 `.gitignore` 中
   - 只提交 `.env.example` 作为模板

2. **API Key 安全**
   - 不要在前端代码中使用 API Key
   - 所有 AI 请求都通过后端代理

3. **费用控制**
   - DeepSeek API 按使用量计费
   - 建议设置使用限额
   - 可以在 DeepSeek 控制台查看使用情况

## 完成后

安装完依赖并配置好 API Key 后，告诉我，我会继续下一步！
