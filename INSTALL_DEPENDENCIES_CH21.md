# Chapter 21 依赖安装说明

## 需要安装的依赖

### 前端依赖

```bash
cd client
pnpm add react-markdown remark-gfm rehype-highlight highlight.js
pnpm add -D @types/react-markdown
```

**依赖说明：**
- `react-markdown` - Markdown 渲染组件
- `remark-gfm` - GitHub Flavored Markdown 支持（表格、删除线等）
- `rehype-highlight` - 代码语法高亮
- `highlight.js` - 语法高亮库
- `@types/react-markdown` - TypeScript 类型定义

## 安装完成后

1. 重启开发服务器：
   ```bash
   # 在项目根目录
   pnpm dev
   ```

2. 测试 AI 对话功能：
   - 打开浏览器访问 http://localhost:5173
   - 选择一个文档
   - 在右侧 AI 面板输入消息
   - 观察 AI 流式回复

3. 测试 Markdown 渲染：
   - 输入："请用 Markdown 格式写一个代码示例"
   - 检查代码块是否有语法高亮

## 完成后告诉我！
