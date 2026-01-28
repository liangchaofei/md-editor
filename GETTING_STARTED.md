# 快速开始指南

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 安装步骤

### 1. 安装 pnpm（如果还没有）

```bash
# 使用 npm 安装
npm install -g pnpm

# 或使用 corepack（Node.js 16.13+）
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. 克隆项目

```bash
git clone <repository-url>
cd collaborative-editor
```

### 3. 安装依赖

```bash
pnpm install
```

这会安装所有前后端依赖，大约需要 1-2 分钟。

### 4. 启动开发服务器

**方式一：同时启动前后端（推荐）**

```bash
pnpm dev
```

**方式二：分别启动**

```bash
# 终端 1 - 启动后端
pnpm dev:server

# 终端 2 - 启动前端
pnpm dev:client
```

### 5. 访问应用

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/health

## 开发命令

```bash
# 启动开发服务器
pnpm dev

# 只启动前端
pnpm dev:client

# 只启动后端
pnpm dev:server

# 构建生产版本
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 项目结构

```
collaborative-editor/
├── client/          # 前端应用（React + Vite）
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── store/       # 状态管理
│   │   ├── hooks/       # 自定义 Hooks
│   │   └── styles/      # 样式文件
│   └── package.json
│
├── server/          # 后端服务（Koa2）
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── database/    # 数据库配置
│   │   └── types/       # 类型定义
│   └── package.json
│
├── docs/            # 教程文档
│   └── chapter-01.md
│
└── package.json     # 根配置
```

## 常见问题

### pnpm 命令不存在

```bash
npm install -g pnpm
```

### 端口被占用

修改端口配置：
- 前端：`client/vite.config.ts` 中的 `server.port`
- 后端：`server/src/index.ts` 中的 `PORT`

### 依赖安装失败

```bash
# 清除缓存
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules
rm pnpm-lock.yaml

# 重新安装
pnpm install
```

## 下一步

查看 `docs/chapter-01.md` 了解详细的项目搭建过程和技术原理。

## 技术支持

如有问题，请查看：
1. 教程文档：`docs/` 目录
2. README.md
3. 提交 Issue

祝你学习愉快！🚀
