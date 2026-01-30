# Chapter 22 依赖安装说明

## 需要安装的依赖

```bash
cd client
pnpm add tiptap-markdown@latest
```

## 安装原因

为了让 Tiptap 编辑器能够正确解析和显示 Markdown 格式的内容，需要安装 `tiptap-markdown` 扩展。

## 功能说明

- 支持 Markdown 语法解析（标题、列表、粗体、斜体、代码等）
- 支持粘贴时自动转换 Markdown
- 支持复制时保留 Markdown 格式
- AI 生成的 Markdown 内容会自动转换为富文本格式

## 验证安装

安装完成后，启动开发服务器：

```bash
pnpm dev
```

测试 AI 生成功能，确认编辑器能正确显示格式化的内容。
