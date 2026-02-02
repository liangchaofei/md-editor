# Kimi (Moonshot) 集成指南

## 已完成的集成

### 1. 前端模型选择器

在 AI 对话面板顶部添加了模型选择器，支持：

**DeepSeek 模型：**
- DeepSeek Chat（通用对话）
- DeepSeek Reasoner（深度思考）

**Kimi 模型：**
- Kimi k1.5 (8K) - `moonshot-v1-8k`
- Kimi k1.5 (32K) - `moonshot-v1-32k`
- Kimi k1.5 (128K) - `moonshot-v1-128k`

### 2. 后端 API 支持

更新了 `server/src/services/ai.ts`：
- 自动根据模型选择 API 端点
- DeepSeek 模型使用 `https://api.deepseek.com`
- Kimi 模型使用 `https://api.moonshot.cn/v1`
- 自动选择对应的 API Key

### 3. 环境变量配置

更新了 `server/.env.example`：
```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Kimi (Moonshot) API 配置
MOONSHOT_API_KEY=your_moonshot_api_key_here
```

## 配置步骤

### 1. 获取 Kimi API Key

1. 访问 [Kimi 开放平台](https://platform.moonshot.cn/)
2. 注册/登录账号
3. 创建 API Key
4. 复制 API Key

### 2. 配置环境变量

编辑 `server/.env` 文件：

```env
# DeepSeek API 配置（已有）
DEEPSEEK_API_KEY=sk-xxx...
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Kimi API 配置（新增）
MOONSHOT_API_KEY=sk-xxx...
```

### 3. 重启服务器

```bash
cd server
pnpm dev
```

## 使用方法

1. 打开编辑器
2. 点击右侧 AI 助手面板
3. 在顶部选择模型：
   - 选择 "Kimi k1.5 (8K)" 用于短文本
   - 选择 "Kimi k1.5 (32K)" 用于中等长度文本
   - 选择 "Kimi k1.5 (128K)" 用于长文本
4. 输入问题，AI 会使用选择的模型回答

## 模型对比

### DeepSeek Chat
- ✅ 速度快
- ✅ 成本低
- ❌ 理解能力一般
- 适合：简单对话、文本生成

### DeepSeek Reasoner
- ✅ 深度思考
- ✅ 逻辑推理强
- ❌ 速度较慢
- 适合：复杂问题、需要推理的任务

### Kimi k1.5
- ✅ 理解能力强
- ✅ 上下文长（最高 128K）
- ✅ 中文优化
- ❌ 成本较高
- 适合：复杂文档编辑、长文本处理

## 测试 Kimi 模型

### 测试 1: 简单对话
```
选择：Kimi k1.5 (8K)
输入：你好，请介绍一下自己
预期：Kimi 会介绍自己是 Moonshot AI 的产品
```

### 测试 2: 文档编辑
```
选择：Kimi k1.5 (32K)
生成一个长文档
输入：把第一章节标题改为"项目背景"
预期：Kimi 能准确理解并定位
```

### 测试 3: 长文本处理
```
选择：Kimi k1.5 (128K)
生成一个超长文档（10000+ 字）
输入：总结这个文档的主要内容
预期：Kimi 能处理整个文档
```

## 注意事项

### 1. API Key 安全
- 不要将 API Key 提交到 Git
- `.env` 文件已在 `.gitignore` 中
- 定期更换 API Key

### 2. 成本控制
- Kimi 按 token 计费
- 128K 模型成本最高
- 根据需求选择合适的模型

### 3. 速率限制
- 注意 API 调用频率
- 避免短时间内大量请求
- 处理 429 错误（请求过于频繁）

## 故障排查

### 问题 1: Kimi 模型无响应

**检查：**
1. API Key 是否正确配置
2. 网络是否能访问 `api.moonshot.cn`
3. 查看服务器日志

**解决：**
```bash
# 查看服务器日志
cd server
pnpm dev

# 查看是否有错误信息
```

### 问题 2: 401 错误（未授权）

**原因：** API Key 无效

**解决：**
1. 检查 `.env` 文件中的 `MOONSHOT_API_KEY`
2. 确认 API Key 是否正确
3. 重新生成 API Key

### 问题 3: 模型选择后没有切换

**原因：** 前端状态未更新

**解决：**
1. 刷新页面
2. 检查浏览器控制台是否有错误
3. 确认模型选择器的 value 是否正确

## 后续优化

### 1. 添加更多模型
- GPT-4
- Claude
- 文心一言
- 通义千问

### 2. 模型配置持久化
- 保存用户选择的模型
- 使用 localStorage 存储

### 3. 模型能力展示
- 显示每个模型的特点
- 推荐适合的使用场景

### 4. 成本统计
- 显示每次对话的 token 消耗
- 统计总成本

## 相关文档

- [Kimi API 文档](https://platform.moonshot.cn/docs)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [OpenAI SDK 文档](https://github.com/openai/openai-node)
