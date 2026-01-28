# 企业级多人协同富文本编辑器

一个基于 React + Tiptap + Y.js 的现代化协同编辑器。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite（构建工具）
- Tailwind CSS（样式）
- Tiptap（富文本编辑器）
- Y.js（协同编辑）
- Zustand（状态管理）
- Headless UI（无样式组件）

### 后端
- Node.js + TypeScript
- Koa2（HTTP 服务器）
- Hocuspocus（WebSocket 协同服务）
- SQLite（本地数据库）

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
# 同时启动前后端
pnpm dev

# 或者分别启动
pnpm dev:client  # 前端: http://localhost:5173
pnpm dev:server  # 后端: http://localhost:3000
```

### 构建生产版本

```bash
pnpm build
```

## 项目结构

```
collaborative-editor/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── store/         # Zustand 状态管理
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── types/         # TypeScript 类型定义
│   │   ├── utils/         # 工具函数
│   │   └── styles/        # 全局样式
│   └── package.json
│
├── server/                # 后端服务
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── database/      # 数据库配置
│   │   ├── hocuspocus/    # WebSocket 服务
│   │   └── types/         # TypeScript 类型定义
│   └── package.json
│
└── package.json           # 根配置
```

## 功能特性

- ✅ 实时多人协同编辑
- ✅ 富文本编辑（加粗、斜体、标题等）
- ✅ 文档管理（新增、编辑、删除）
- ✅ 协作光标显示
- ✅ 在线用户列表
- ✅ 离线编辑支持
- ✅ 自动保存
- ✅ 文档分享
- ✅ 权限管理

## 开发规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand

## License

MIT
