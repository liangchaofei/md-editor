# 快速开始指南

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-username/collaborative-editor.git
cd collaborative-editor
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `server/.env` 文件：

```env
# DeepSeek API（必需）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Kimi API（可选）
MOONSHOT_API_KEY=your_moonshot_api_key
MOONSHOT_BASE_URL=https://api.moonshot.cn

# 服务器配置
PORT=3000
NODE_ENV=development
```

**获取 API Key**：
- DeepSeek: https://platform.deepseek.com/
- Kimi: https://platform.moonshot.cn/

### 4. 启动开发服务器

```bash
pnpm dev
```

服务将在以下地址启动：
- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 功能演示

### 1. 创建文档

1. 点击左侧"新建文档"按钮
2. 输入文档标题
3. 开始编辑

### 2. 富文本编辑

- **工具栏**：点击顶部工具栏按钮
- **浮动菜单**：选中文字后自动显示
- **快捷键**：
  - `Ctrl+B`: 加粗
  - `Ctrl+I`: 斜体
  - `Ctrl+U`: 下划线
  - `Ctrl+Shift+X`: 删除线
  - `/`: 斜杠命令

### 3. AI 写作助手

#### 打开 AI 面板

- 点击右上角"AI 助手"按钮
- 或按 `Ctrl+K` 快捷键

#### 生成新内容

1. 在 AI 对话框输入需求，例如：
   ```
   写一篇关于 React 18 新特性的文章
   ```
2. 点击"发送"或按 `Enter`
3. AI 将在编辑器中流式生成内容

#### 修改现有内容

1. 在编辑器中输入一些内容
2. 在 AI 对话框输入修改需求，例如：
   ```
   把第一段改为更专业的表达
   ```
3. AI 将标记修改建议（删除线 + 绿色高亮）
4. Hover 到高亮文本，点击"接受"或"拒绝"

#### 快捷指令

1. 选中文字
2. 点击浮动菜单中的"AI 改写"按钮
3. 选择快捷选项或输入自定义需求

### 4. 实时协同编辑

1. 在另一个浏览器窗口打开同一文档
2. 在任一窗口编辑内容
3. 另一窗口将实时同步
4. 可以看到其他用户的光标和选区

### 5. 版本历史

1. 点击右上角"版本"按钮
2. 查看历史版本列表
3. 点击版本可预览内容
4. 点击"恢复"可恢复到该版本

### 6. 文档导出

1. 点击右上角"导出"按钮
2. 选择导出格式：
   - Markdown
   - HTML
   - 纯文本
   - 打印

## 快捷键

### 编辑器

- `Ctrl+B`: 加粗
- `Ctrl+I`: 斜体
- `Ctrl+U`: 下划线
- `Ctrl+Shift+X`: 删除线
- `Ctrl+Shift+H`: 高亮
- `Ctrl+Alt+1-6`: 标题 1-6
- `Ctrl+Shift+7`: 有序列表
- `Ctrl+Shift+8`: 无序列表
- `Ctrl+Shift+9`: 任务列表
- `Ctrl+Shift+C`: 代码块
- `Ctrl+Z`: 撤销
- `Ctrl+Shift+Z`: 重做
- `/`: 斜杠命令

### AI 功能

- `Ctrl+K`: 打开/关闭 AI 面板
- `Ctrl+Enter`: 接受 AI 建议
- `Esc`: 拒绝 AI 建议

## 常见问题

### Q1: AI 功能无法使用？

**A**: 检查以下几点：
1. 是否配置了 API Key
2. API Key 是否有效
3. 网络是否正常
4. 查看浏览器控制台错误信息

### Q2: 协同编辑不同步？

**A**: 检查以下几点：
1. WebSocket 连接是否正常（查看右上角连接状态）
2. 网络是否稳定
3. 刷新页面重新连接

### Q3: 编辑器卡顿？

**A**: 可能的原因：
1. 文档内容过大（建议拆分文档）
2. 浏览器性能不足（关闭其他标签页）
3. 网络延迟（检查网络连接）

### Q4: 如何清空对话历史？

**A**: 
1. 打开 AI 面板
2. 点击右上角"清空历史"按钮（垃圾桶图标）
3. 确认清空

### Q5: 如何切换 AI 模型？

**A**:
1. 打开 AI 面板
2. 点击右上角模型选择器
3. 选择想要的模型
4. 选择会自动保存

## 开发指南

### 项目结构

```
collaborative-editor/
├── client/          # 前端项目
│   ├── src/
│   │   ├── api/    # API 客户端
│   │   ├── components/  # React 组件
│   │   ├── extensions/  # Tiptap 扩展
│   │   ├── hooks/  # 自定义 Hooks
│   │   ├── store/  # Zustand 状态
│   │   ├── types/  # TypeScript 类型
│   │   └── utils/  # 工具函数
│   └── package.json
├── server/          # 后端项目
│   ├── src/
│   │   ├── config/      # 配置
│   │   ├── database/    # 数据库
│   │   ├── middleware/  # 中间件
│   │   ├── routes/      # 路由
│   │   ├── services/    # 服务
│   │   └── types/       # 类型
│   └── package.json
└── docs/            # 教程文档
```

### 添加新功能

1. **前端组件**：在 `client/src/components/` 中创建
2. **API 路由**：在 `server/src/routes/` 中添加
3. **Tiptap 扩展**：在 `client/src/extensions/` 中创建
4. **工具函数**：在 `client/src/utils/` 或 `server/src/utils/` 中添加

### 调试技巧

1. **前端调试**：
   - 打开浏览器开发者工具（F12）
   - 查看 Console 日志
   - 使用 React DevTools

2. **后端调试**：
   - 查看终端日志
   - 使用 `console.log` 输出
   - 使用 VS Code 调试器

3. **AI 调试**：
   - 点击 AI 面板右上角"调试"按钮
   - 查看控制台输出的文档内容
   - 检查 API 请求和响应

## 学习路径

### 新手入门

1. 阅读 `docs/chapter-01.md` 到 `docs/chapter-07.md`
2. 了解项目结构和基础功能
3. 尝试修改 UI 样式

### 进阶学习

1. 阅读 `docs/chapter-08.md` 到 `docs/chapter-18.md`
2. 学习富文本编辑器和协同编辑
3. 尝试添加新的编辑器功能

### 高级学习

1. 阅读 `docs/chapter-19.md` 到 `docs/chapter-28.md`
2. 学习 AI 集成和性能优化
3. 尝试优化 AI 功能

## 部署

### 开发环境

```bash
pnpm dev
```

### 生产环境

```bash
# 构建
pnpm build

# 启动
pnpm start
```

### Docker 部署

```bash
# 构建镜像
docker build -t collaborative-editor .

# 运行容器
docker run -p 3000:3000 -p 5173:5173 collaborative-editor
```

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

- 项目地址：https://github.com/your-username/collaborative-editor
- 问题反馈：https://github.com/your-username/collaborative-editor/issues
- 邮箱：your-email@example.com

---

**祝你使用愉快！🎉**
