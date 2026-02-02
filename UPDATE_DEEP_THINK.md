# 深度思考功能更新说明

## ⚠️ 重要说明

**深度思考功能仅支持 DeepSeek 模型！**

- ✅ **DeepSeek** - 支持深度思考（使用 `deepseek-reasoner`）
- ❌ **Kimi** - 不支持深度思考（标准 API `moonshot-v1-*` 无思考过程输出）

**原因：**
- Kimi 的标准 API（`moonshot-v1-8k/32k/128k`）不支持思考过程输出
- Kimi K2 Thinking 是专门的思考模型，但需要单独的 API 端点（目前未集成）

**建议：**
- 需要深度思考时，使用 **DeepSeek + 深度思考**
- 需要更好的理解能力时，使用 **Kimi (32K/128K)** 但不启用深度思考

---

## 更新内容

### 1. 新增深度思考开关

在 AI 对话输入框下方添加了"深度思考"按钮，类似 DeepSeek 官网的设计。

**位置：** 输入框下方
**样式：**
- 未启用：白色背景 + 灰色边框
- 已启用：紫色背景 + 紫色边框 + 勾选图标

**功能：**
- 点击切换开关状态
- 启用后自动切换到对应的思考模型：
  - ✅ DeepSeek → `deepseek-reasoner`（显示思考过程）
  - ❌ Kimi → 不支持（显示警告提示）

### 2. 简化模型选择

**之前：**
```
DeepSeek Chat
DeepSeek Reasoner  ← 移除
Kimi k1.5 (8K)
Kimi k1.5 (32K)
Kimi k1.5 (128K)
```

**现在：**
```
DeepSeek
Kimi (8K)
Kimi (32K)
Kimi (128K)
```

通过深度思考开关自动切换到 Reasoner 模型，无需手动选择。

### 3. 智能模型切换

启用深度思考时：
- **DeepSeek** → 自动使用 `deepseek-reasoner`（显示详细思考过程）
- **Kimi** → 不支持深度思考（显示警告："⚠️ 当前模型不支持深度思考"）

### 4. 视觉反馈

启用深度思考后，会显示提示文字：
- ✅ DeepSeek: "将使用 DeepSeek Reasoner"
- ❌ Kimi: "⚠️ 当前模型不支持深度思考"

## 使用示例

### 场景 1：快速对话（不启用深度思考）

1. 选择 "DeepSeek"
2. 输入："写一个 Hello World"
3. 点击发送
4. 快速得到结果（无思考过程）

### 场景 2：复杂任务（启用深度思考）

1. 选择 "DeepSeek"
2. **点击"深度思考"按钮**（变成紫色）
3. 输入："把基础入门改为零基础入门学习"
4. 点击发送
5. AI 会显示详细的思考过程（紫色背景）
6. 思考完成后返回精确的修改建议

### 场景 3：长文档编辑（Kimi 不启用深度思考）

1. 选择 "Kimi (32K)" 或 "Kimi (128K)"
2. **不要启用深度思考**（Kimi 不支持）
3. 输入修改需求
4. 利用 Kimi 的强大理解能力和大上下文

## 技术实现

### 前端代码

```typescript
// 状态管理
const [enableDeepThink, setEnableDeepThink] = useState(false)

// 模型切换逻辑
let selectedModel = model
if (enableDeepThink) {
  if (model.startsWith('deepseek-')) {
    selectedModel = 'deepseek-reasoner'
  } else if (model.startsWith('moonshot-')) {
    selectedModel = 'moonshot-v1-128k'
  }
}

// 调用 API
await streamChatAPI({
  messages: [...],
  model: selectedModel,  // 使用切换后的模型
  // ...
})
```

### UI 组件

```tsx
<button
  onClick={() => setEnableDeepThink(!enableDeepThink)}
  className={enableDeepThink 
    ? 'bg-purple-100 text-purple-700 border-purple-300'
    : 'bg-white text-gray-600 border-gray-300'
  }
>
  <svg>...</svg>
  <span>深度思考</span>
  {enableDeepThink && <CheckIcon />}
</button>
```

## 优势

### 1. 用户体验更好
- 不需要手动切换模型
- 一键启用深度思考
- 清晰的视觉反馈

### 2. 界面更简洁
- 减少模型选项（从 5 个减少到 4 个）
- 功能更聚焦

### 3. 更符合直觉
- 类似 DeepSeek 官网的设计
- 用户熟悉的交互方式

## 测试建议

### 对比测试

**任务：** "把基础入门改为零基础入门学习"

| 配置 | 响应速度 | 定位准确性 | 思考质量 |
|------|---------|-----------|---------|
| DeepSeek（普通） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | - |
| DeepSeek + 深度思考 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Kimi (32K) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | - |
| Kimi (32K) + 深度思考 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**建议：**
- 简单任务：不启用深度思考（更快）
- 复杂任务：启用深度思考（更准确）
- 长文档：使用 Kimi + 深度思考（最佳效果）

## 相关文件

- `client/src/components/editor/AIChatPanel.tsx` - AI 对话面板（主要修改）
- `KIMI_TEST_GUIDE.md` - 完整测试指南
- `KIMI_INTEGRATION.md` - Kimi 集成文档

## 下一步

1. 配置 Kimi API Key（`server/.env`）
2. 重启服务器
3. 测试深度思考功能
4. 对比不同配置的效果
5. 根据测试结果优化 Prompt

---

**更新时间：** 2026-01-30
**版本：** v1.1.0
