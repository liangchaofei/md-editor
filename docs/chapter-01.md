# Chapter 1: 项目脚手架搭建

## 本章目标

通过本章学习，你将掌握：

- ✅ 理解 Monorepo 架构的优势和应用场景
- ✅ 使用 pnpm workspace 管理多包项目
- ✅ 配置 Vite + React + TypeScript 前端项目
- ✅ 配置 Koa2 + TypeScript 后端项目
- ✅ 集成 Tailwind CSS 样式框架
- ✅ 配置 ESLint 和 Prettier 代码规范工具
- ✅ 理解项目目录结构设计原则

## 前置知识

在开始本章之前，你需要了解：

- Node.js 基础（npm/pnpm 包管理器）
- React 基础知识
- TypeScript 基础语法
- 命令行基本操作

如果你是完全的新手，建议先学习以上基础知识再继续。

---

## 一、理论讲解

### 1.1 为什么选择 Monorepo 架构？

**什么是 Monorepo？**

Monorepo（单一仓库）是一种将多个相关项目放在同一个 Git 仓库中管理的开发策略。与之相对的是 Polyrepo（多仓库），即每个项目独立一个仓库。

**Monorepo 的优势：**

1. **代码共享更容易**
   - 前后端可以共享类型定义（TypeScript interfaces）
   - 共享工具函数和常量
   - 避免重复代码

2. **统一的依赖管理**
   - 所有项目使用相同版本的依赖
   - 减少依赖冲突
   - 统一升级依赖版本

3. **原子性提交**
   - 前后端修改可以在一个 commit 中完成
   - 保证代码同步性
   - 更容易追踪变更历史

4. **简化开发流程**
   - 一次 `git clone` 获取所有代码
   - 统一的构建和测试流程
   - 更容易进行重构

**适用场景：**

- ✅ 前后端紧密耦合的项目（如我们的协同编辑器）
- ✅ 需要共享大量代码的项目
- ✅ 小到中型团队（2-20 人）

**不适用场景：**

- ❌ 完全独立的多个产品
- ❌ 超大型团队（>50 人）
- ❌ 需要独立发布周期的项目



### 1.2 为什么选择 pnpm？

**pnpm 相比 npm/yarn 的优势：**

1. **磁盘空间效率高**
   - 使用硬链接和符号链接
   - 所有项目共享同一份依赖
   - 节省 50-70% 的磁盘空间

2. **安装速度快**
   - 并行安装依赖
   - 比 npm 快 2-3 倍
   - 比 yarn 快 1.5-2 倍

3. **严格的依赖管理**
   - 只能访问 package.json 中声明的依赖
   - 避免幽灵依赖（phantom dependencies）
   - 更安全可靠

4. **原生支持 Monorepo**
   - 内置 workspace 功能
   - 无需额外工具（如 lerna）
   - 配置简单

**性能对比：**

```
安装 1000 个依赖包的时间：
npm:  45s
yarn: 30s
pnpm: 15s ⚡️
```



### 1.3 为什么选择 Vite？

**Vite 相比 Webpack/CRA 的优势：**

1. **极速的冷启动**
   - 使用原生 ES modules
   - 无需打包即可启动
   - 开发服务器启动时间 < 1s

2. **即时的热更新（HMR）**
   - 修改代码后立即生效
   - 不会随着项目增大而变慢
   - 保持应用状态

3. **按需编译**
   - 只编译当前页面需要的模块
   - 大幅减少编译时间
   - 提升开发体验

4. **生产构建优化**
   - 使用 Rollup 打包
   - 自动代码分割
   - Tree-shaking 优化

**启动速度对比：**

```
启动开发服务器时间：
Create React App: 30-60s
Webpack:          20-40s
Vite:             < 1s ⚡️
```

**工作原理：**

传统构建工具（Webpack）：
```
源代码 → 打包所有模块 → Bundle → 开发服务器 → 浏览器
        (耗时 30s+)
```

Vite：
```
源代码 → 开发服务器 → 按需编译 → 浏览器
        (耗时 < 1s)
```



### 1.4 为什么选择 Tailwind CSS？

**Tailwind CSS 的优势：**

1. **开发效率高**
   - 无需离开 HTML 写样式
   - 预设的设计系统
   - 快速原型开发

2. **体积小**
   - 自动移除未使用的样式
   - 生产环境通常 < 10KB
   - 比传统 CSS 框架小 90%

3. **高度可定制**
   - 通过配置文件定制设计系统
   - 不受组件库限制
   - 完全控制样式

4. **维护性好**
   - 样式和组件在一起
   - 避免 CSS 命名冲突
   - 易于重构

**对比传统 CSS：**

传统方式：
```css
/* styles.css */
.button {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
}
```

```jsx
<button className="button">点击</button>
```

Tailwind 方式：
```jsx
<button className="px-4 py-2 bg-blue-500 text-white rounded-md">
  点击
</button>
```

**优势：**
- ✅ 无需切换文件
- ✅ 样式可复用（通过组件）
- ✅ 自动 Tree-shaking
- ✅ 响应式设计简单（`md:px-8`）



### 1.5 为什么选择 Koa2？

**Koa2 相比 Express 的优势：**

1. **现代化的异步处理**
   - 原生支持 async/await
   - 更优雅的错误处理
   - 避免回调地狱

2. **轻量级**
   - 核心代码只有 ~600 行
   - 不绑定任何中间件
   - 按需引入功能

3. **洋葱模型中间件**
   - 更灵活的中间件机制
   - 更好的控制流
   - 易于理解和调试

4. **更好的错误处理**
   - 统一的错误处理机制
   - try-catch 友好
   - 更容易追踪错误

**中间件执行流程对比：**

Express（线性）：
```
请求 → 中间件1 → 中间件2 → 中间件3 → 响应
```

Koa（洋葱模型）：
```
请求 → 中间件1 ↓
       中间件2 ↓
       中间件3 ↓
       处理逻辑
       中间件3 ↑
       中间件2 ↑
       中间件1 ↑ → 响应
```

**代码对比：**

Express：
```javascript
app.get('/user/:id', (req, res, next) => {
  User.findById(req.params.id)
    .then(user => {
      res.json(user)
    })
    .catch(err => {
      next(err)
    })
})
```

Koa2：
```javascript
router.get('/user/:id', async ctx => {
  try {
    const user = await User.findById(ctx.params.id)
    ctx.body = user
  } catch (err) {
    ctx.throw(500, err)
  }
})
```



---

## 二、项目结构设计

### 2.1 整体架构

```
collaborative-editor/          # 项目根目录
├── client/                    # 前端应用（React）
│   ├── src/                   # 源代码
│   │   ├── components/        # React 组件
│   │   │   ├── layout/        # 布局组件（Header, Sidebar）
│   │   │   ├── editor/        # 编辑器相关组件
│   │   │   ├── ui/            # 通用 UI 组件（Button, Modal）
│   │   │   └── collaboration/ # 协同功能组件
│   │   ├── store/             # Zustand 状态管理
│   │   ├── hooks/             # 自定义 React Hooks
│   │   ├── types/             # TypeScript 类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── styles/            # 全局样式
│   │   ├── App.tsx            # 根组件
│   │   └── main.tsx           # 入口文件
│   ├── public/                # 静态资源
│   ├── index.html             # HTML 模板
│   ├── package.json           # 前端依赖
│   ├── tsconfig.json          # TS 配置
│   ├── vite.config.ts         # Vite 配置
│   └── tailwind.config.js     # Tailwind 配置
│
├── server/                    # 后端服务（Koa2）
│   ├── src/                   # 源代码
│   │   ├── routes/            # API 路由
│   │   │   └── documents.ts   # 文档相关 API
│   │   ├── database/          # 数据库配置
│   │   │   ├── index.ts       # 数据库连接
│   │   │   └── schema.ts      # 表结构定义
│   │   ├── hocuspocus/        # WebSocket 协同服务
│   │   │   └── server.ts      # Hocuspocus 配置
│   │   ├── types/             # TypeScript 类型定义
│   │   ├── middleware/        # Koa 中间件
│   │   └── index.ts           # 入口文件
│   ├── package.json           # 后端依赖
│   └── tsconfig.json          # TS 配置
│
├── docs/                      # 教程文档
│   ├── chapter-01.md          # 第一章
│   └── ...
│
├── package.json               # 根配置（workspace）
├── pnpm-workspace.yaml        # pnpm workspace 配置
├── .gitignore                 # Git 忽略文件
├── .prettierrc                # Prettier 配置
└── README.md                  # 项目说明
```



### 2.2 目录设计原则

**1. 按功能模块划分**

```
components/
├── layout/        # 布局相关
├── editor/        # 编辑器相关
├── ui/            # 通用组件
└── collaboration/ # 协同功能
```

**优势：**
- 职责清晰
- 易于查找
- 便于团队协作

**2. 扁平化结构**

❌ 避免过深的嵌套：
```
components/features/editor/toolbar/buttons/bold/BoldButton.tsx
```

✅ 保持扁平：
```
components/editor/BoldButton.tsx
```

**3. 文件命名规范**

- 组件文件：PascalCase（`UserList.tsx`）
- 工具函数：camelCase（`formatDate.ts`）
- 类型定义：PascalCase（`Document.ts`）
- 常量文件：UPPER_CASE（`API_ENDPOINTS.ts`）

**4. 单一职责原则**

每个文件只做一件事：
- 一个组件一个文件
- 一个 Hook 一个文件
- 相关的类型可以放在一起



---

## 三、代码实现

### 步骤 1: 创建项目根目录

首先创建项目根目录并初始化：

```bash
# 创建项目目录
mkdir collaborative-editor
cd collaborative-editor

# 初始化 Git 仓库
git init
```

### 步骤 2: 配置 pnpm workspace

创建 `package.json`（根配置）：

```json
{
  "name": "collaborative-editor",
  "version": "1.0.0",
  "description": "企业级多人协同富文本编辑器",
  "private": true,
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\""
  },
  "devDependencies": {
    "prettier": "^3.2.5"
  }
}
```

**关键配置说明：**

1. **`"private": true`**
   - 防止意外发布到 npm
   - Monorepo 根目录通常不需要发布

2. **`"workspaces"`**
   - 声明子包位置
   - pnpm 会自动链接这些包

3. **`scripts` 命令**
   - `--parallel`: 并行执行命令
   - `-r`: 递归执行（所有子包）
   - `--filter`: 只在指定包中执行



创建 `pnpm-workspace.yaml`：

```yaml
packages:
  - 'client'
  - 'server'
```

**说明：**
- 这是 pnpm 的 workspace 配置文件
- 告诉 pnpm 哪些目录是子包
- 支持 glob 模式（如 `packages/*`）

### 步骤 3: 配置 Git 和代码格式化

创建 `.gitignore`：

```gitignore
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
build
*.local

# Environment variables
.env
.env.local

# IDE
.vscode/*
!.vscode/settings.json
.idea

# OS
.DS_Store

# Database
*.db
*.sqlite
```

创建 `.prettierrc`：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

**Prettier 配置说明：**

- `semi: false` - 不使用分号
- `singleQuote: true` - 使用单引号
- `tabWidth: 2` - 缩进 2 个空格
- `trailingComma: "es5"` - ES5 兼容的尾逗号
- `printWidth: 80` - 每行最多 80 字符
- `arrowParens: "avoid"` - 箭头函数单参数不加括号



### 步骤 4: 创建前端项目

创建 `client/package.json`：

```json
{
  "name": "client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "@typescript-eslint/parser": "^8.15.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.15.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5"
  }
}
```

**关键依赖说明：**

**生产依赖（dependencies）：**
- `react` & `react-dom` - React 核心库

**开发依赖（devDependencies）：**
- `vite` - 构建工具
- `@vitejs/plugin-react` - Vite 的 React 插件
- `typescript` - TypeScript 编译器
- `tailwindcss` - CSS 框架
- `eslint` - 代码检查工具



创建 `client/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

**TypeScript 配置详解：**

**编译选项：**
- `target: "ES2020"` - 编译目标为 ES2020
- `lib` - 包含的类型库（DOM API、ES2020 特性）
- `jsx: "react-jsx"` - 使用新的 JSX 转换（React 17+）

**严格模式：**
- `strict: true` - 启用所有严格类型检查
- `noUnusedLocals` - 禁止未使用的局部变量
- `noUnusedParameters` - 禁止未使用的参数

**路径映射：**
- `baseUrl: "."` - 基础路径
- `paths: { "@/*": ["src/*"] }` - 别名配置

使用示例：
```typescript
// 不使用别名
import Button from '../../components/ui/Button'

// 使用别名
import Button from '@/components/ui/Button'
```



创建 `client/vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

**Vite 配置详解：**

**1. plugins**
```typescript
plugins: [react()]
```
- 启用 React 插件
- 支持 JSX 转换
- 支持 Fast Refresh（热更新）

**2. resolve.alias**
```typescript
alias: {
  '@': path.resolve(__dirname, './src'),
}
```
- 配置路径别名
- 与 tsconfig.json 的 paths 对应
- 简化导入路径

**3. server.proxy**
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```
- 开发环境代理配置
- 将 `/api` 请求代理到后端服务器
- 解决跨域问题

**工作原理：**
```
浏览器请求: http://localhost:5173/api/documents
    ↓
Vite 代理转发: http://localhost:3000/api/documents
    ↓
Koa 服务器处理
```



创建 `client/tailwind.config.js`：

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
```

**Tailwind 配置详解：**

**1. content**
```javascript
content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
```
- 指定需要扫描的文件
- Tailwind 会分析这些文件中使用的类名
- 只打包用到的样式（Tree-shaking）

**2. theme.extend.colors**
```javascript
primary: {
  500: '#3b82f6',  // 主色调
  600: '#2563eb',  // 悬停色
  // ...
}
```
- 扩展默认颜色系统
- 定义品牌色
- 使用：`bg-primary-500`、`text-primary-600`

**3. fontFamily**
```javascript
sans: ['-apple-system', 'BlinkMacSystemFont', ...]
```
- 定义字体栈
- 优先使用系统字体
- 提升性能和用户体验



创建 `client/postcss.config.js`：

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**PostCSS 配置说明：**

- `tailwindcss` - 处理 Tailwind 指令
- `autoprefixer` - 自动添加浏览器前缀

**工作流程：**
```
CSS 源码
  ↓
Tailwind 处理（生成工具类）
  ↓
Autoprefixer（添加前缀）
  ↓
最终 CSS
```

示例：
```css
/* 输入 */
.example {
  display: flex;
}

/* 输出（自动添加前缀） */
.example {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}
```



创建 `client/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>协同编辑器</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

创建 `client/src/main.tsx`：

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**代码说明：**

1. **`ReactDOM.createRoot`**
   - React 18 的新 API
   - 启用并发特性
   - 替代旧的 `ReactDOM.render`

2. **`React.StrictMode`**
   - 开发模式下的额外检查
   - 检测不安全的生命周期
   - 检测过时的 API
   - 检测副作用

3. **`document.getElementById('root')!`**
   - `!` 是 TypeScript 的非空断言
   - 告诉编译器这个元素一定存在



创建 `client/src/App.tsx`：

```typescript
import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-900">
          企业级协同编辑器
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          项目脚手架搭建完成 ✓
        </p>
        <div className="mt-8 flex gap-4">
          <div className="rounded-lg bg-white px-6 py-4 shadow-md">
            <h3 className="font-semibold text-gray-900">前端技术栈</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>✓ React 18 + TypeScript</li>
              <li>✓ Vite</li>
              <li>✓ Tailwind CSS</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white px-6 py-4 shadow-md">
            <h3 className="font-semibold text-gray-900">后端技术栈</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>✓ Node.js + TypeScript</li>
              <li>✓ Koa2</li>
              <li>✓ SQLite</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
```

**Tailwind 类名解析：**

- `min-h-screen` - 最小高度为屏幕高度
- `bg-gray-50` - 浅灰色背景
- `flex` - Flexbox 布局
- `items-center` - 垂直居中
- `justify-center` - 水平居中
- `text-4xl` - 字体大小（2.25rem）
- `font-bold` - 粗体
- `rounded-lg` - 圆角（0.5rem）
- `shadow-md` - 中等阴影
- `gap-4` - 间距（1rem）



创建 `client/src/styles/index.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 全局样式 */
@layer base {
  * {
    @apply box-border;
  }

  body {
    @apply font-sans antialiased;
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    @apply w-2 h-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-gray-100;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
  }
}

/* 自定义工具类 */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

**Tailwind 指令说明：**

**1. `@tailwind` 指令**
```css
@tailwind base;        /* 基础样式（reset） */
@tailwind components;  /* 组件样式 */
@tailwind utilities;   /* 工具类 */
```

**2. `@layer` 指令**
```css
@layer base {
  /* 基础样式层 */
}
```
- 组织样式层级
- 控制样式优先级
- 便于维护

**3. `@apply` 指令**
```css
body {
  @apply font-sans antialiased;
}
```
- 在 CSS 中使用 Tailwind 类
- 提取重复样式
- 保持一致性



### 步骤 5: 创建后端项目

创建 `server/package.json`：

```json
{
  "name": "server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint . --ext ts"
  },
  "dependencies": {
    "koa": "^2.15.3",
    "@koa/router": "^13.1.0",
    "@koa/cors": "^5.0.0"
  },
  "devDependencies": {
    "@types/koa": "^2.15.0",
    "@types/koa__router": "^12.0.4",
    "@types/koa__cors": "^5.0.0",
    "@types/node": "^22.10.2",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "@typescript-eslint/parser": "^8.15.0",
    "eslint": "^9.15.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

**关键依赖说明：**

**生产依赖：**
- `koa` - Web 框架
- `@koa/router` - 路由中间件
- `@koa/cors` - 跨域中间件

**开发依赖：**
- `tsx` - 直接运行 TypeScript（无需编译）
- `typescript` - TypeScript 编译器
- `@types/*` - TypeScript 类型定义

**tsx vs ts-node：**
```
tsx:     更快，基于 esbuild
ts-node: 更稳定，基于 TypeScript 编译器

开发环境推荐 tsx，生产环境编译后运行
```



创建 `server/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "skipLibCheck": true,

    /* Emit */
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    /* Interop Constraints */
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    /* Type Checking */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**与前端配置的区别：**

1. **lib: ["ES2020"]**
   - 不包含 DOM 类型
   - 只包含 Node.js 需要的类型

2. **outDir: "./dist"**
   - 编译输出目录
   - 前端使用 Vite 打包，不需要此配置

3. **declaration: true**
   - 生成 .d.ts 类型声明文件
   - 便于其他包引用



创建 `server/src/index.ts`：

```typescript
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
```

**代码详解：**

**1. 创建 Koa 应用**
```typescript
const app = new Koa()
```
- 创建 Koa 实例
- 类似 Express 的 `express()`

**2. CORS 中间件**
```typescript
app.use(cors())
```
- 允许跨域请求
- 开发环境必需（前端 5173，后端 3000）



**3. 路由定义**
```typescript
router.get('/health', ctx => {
  ctx.body = {
    status: 'ok',
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
  }
})
```
- `ctx` 是 Koa 的上下文对象
- `ctx.body` 设置响应体
- Koa 自动设置 Content-Type 为 application/json

**4. 注册路由**
```typescript
app.use(router.routes()).use(router.allowedMethods())
```
- `router.routes()` - 注册路由中间件
- `router.allowedMethods()` - 处理 OPTIONS 请求

**5. 错误处理**
```typescript
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err, ctx)
})
```
- 全局错误监听
- 捕获未处理的错误
- 生产环境应该记录到日志系统

**6. 启动服务器**
```typescript
app.listen(PORT, () => {
  console.log(`🚀 服务器启动成功！`)
})
```
- 监听端口
- 启动回调函数



---

## 四、运行项目

### 4.1 安装依赖

在项目根目录执行：

```bash
# 安装所有依赖（包括前后端）
pnpm install
```

**pnpm 会做什么：**
1. 读取 `pnpm-workspace.yaml`
2. 扫描 `client` 和 `server` 目录
3. 安装所有依赖
4. 创建软链接（workspace 包之间）

**安装过程：**
```
collaborative-editor/
├── node_modules/          # 根依赖（prettier）
├── client/
│   └── node_modules/      # 前端依赖
└── server/
    └── node_modules/      # 后端依赖
```

### 4.2 启动开发服务器

**方式一：同时启动前后端**
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

### 4.3 验证运行

**1. 后端验证**

打开浏览器访问：
- http://localhost:3000/health
- http://localhost:3000/api/info

应该看到 JSON 响应。

**2. 前端验证**

打开浏览器访问：
- http://localhost:5173

应该看到欢迎页面。



### 4.4 常见问题

**问题 1: pnpm 命令不存在**

```bash
# 安装 pnpm
npm install -g pnpm

# 或使用 corepack（Node.js 16.13+）
corepack enable
corepack prepare pnpm@latest --activate
```

**问题 2: 端口被占用**

```bash
# macOS/Linux 查看端口占用
lsof -i :3000
lsof -i :5173

# 杀死进程
kill -9 <PID>

# 或修改端口
# client/vite.config.ts: server.port
# server/src/index.ts: PORT
```

**问题 3: TypeScript 报错**

```bash
# 清除缓存
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules
rm pnpm-lock.yaml

# 重新安装
pnpm install
```

**问题 4: Tailwind 样式不生效**

检查：
1. `postcss.config.js` 是否存在
2. `tailwind.config.js` 的 content 配置
3. `index.css` 是否导入了 Tailwind 指令
4. 浏览器是否缓存了旧样式（硬刷新 Cmd+Shift+R）



---

## 五、实现难点与面试考点

### 5.1 Monorepo 架构

**面试问题：Monorepo 和 Polyrepo 的区别？**

**回答要点：**

**Monorepo（单一仓库）：**
- 所有项目在一个仓库
- 统一的版本控制
- 代码共享容易
- 适合紧密耦合的项目

**Polyrepo（多仓库）：**
- 每个项目独立仓库
- 独立的版本控制
- 代码隔离性好
- 适合独立的产品

**权衡：**
- Monorepo 适合小团队、紧密协作
- Polyrepo 适合大团队、独立发布

**实际案例：**
- Google、Facebook 使用 Monorepo
- Netflix、Amazon 使用 Polyrepo

### 5.2 模块解析策略

**面试问题：TypeScript 的 moduleResolution 有哪些选项？**

**回答要点：**

**1. node（传统）**
```json
"moduleResolution": "node"
```
- 模拟 Node.js 的模块解析
- 查找 node_modules
- 支持 package.json 的 main 字段

**2. bundler（现代）**
```json
"moduleResolution": "bundler"
```
- 为打包工具优化
- 支持 package.json 的 exports 字段
- 更灵活的路径解析
- Vite、Webpack 推荐使用

**区别：**
```typescript
// node 模式
import { foo } from 'package/dist/index.js'

// bundler 模式
import { foo } from 'package'  // 自动解析
```



### 5.3 Vite 工作原理

**面试问题：Vite 为什么比 Webpack 快？**

**回答要点：**

**1. 开发环境：使用原生 ESM**
```
传统打包工具（Webpack）：
源代码 → 打包所有模块 → Bundle → 开发服务器
        (耗时 30s+)

Vite：
源代码 → 开发服务器 → 按需编译 → 浏览器
        (耗时 < 1s)
```

**2. 预构建依赖**
```javascript
// Vite 启动时预构建依赖
node_modules/lodash → .vite/deps/lodash.js
```
- 将 CommonJS 转为 ESM
- 合并多个模块（减少请求）
- 使用 esbuild（Go 编写，极快）

**3. 热更新（HMR）**
```
Webpack HMR：
修改文件 → 重新打包模块 → 更新浏览器
          (随项目增大变慢)

Vite HMR：
修改文件 → 只编译该模块 → 精确更新
          (始终快速)
```

**4. 生产构建：使用 Rollup**
- Rollup 的 Tree-shaking 更好
- 生成更小的 Bundle
- 更好的代码分割

**性能对比：**
```
项目启动时间：
Webpack: 30-60s
Vite:    < 1s

HMR 更新时间：
Webpack: 1-3s
Vite:    < 100ms
```



### 5.4 Koa 洋葱模型

**面试问题：解释 Koa 的洋葱模型中间件机制**

**回答要点：**

**洋葱模型示意图：**
```
        请求
         ↓
    ┌────────────┐
    │  中间件 1   │ → 进入
    │ ┌────────┐ │
    │ │中间件2 │ │ → 进入
    │ │┌──────┐│ │
    │ ││中间件3││ │ → 进入
    │ ││ 核心 ││ │ → 处理
    │ │└──────┘│ │ ← 返回
    │ └────────┘ │ ← 返回
    └────────────┘ ← 返回
         ↓
        响应
```

**代码示例：**
```typescript
// 中间件 1
app.use(async (ctx, next) => {
  console.log('1 - 进入')
  await next()  // 调用下一个中间件
  console.log('1 - 返回')
})

// 中间件 2
app.use(async (ctx, next) => {
  console.log('2 - 进入')
  await next()
  console.log('2 - 返回')
})

// 中间件 3
app.use(async (ctx, next) => {
  console.log('3 - 进入')
  ctx.body = 'Hello'
  console.log('3 - 返回')
})

// 输出顺序：
// 1 - 进入
// 2 - 进入
// 3 - 进入
// 3 - 返回
// 2 - 返回
// 1 - 返回
```

**应用场景：**
1. **日志记录**
```typescript
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})
```

2. **错误处理**
```typescript
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})
```



### 5.5 TypeScript 严格模式

**面试问题：TypeScript 的 strict 模式包含哪些检查？**

**回答要点：**

**`"strict": true` 等价于启用以下所有选项：**

1. **`strictNullChecks`**
```typescript
// 启用后
let name: string = null  // ❌ 错误
let name: string | null = null  // ✅ 正确

// 禁用后
let name: string = null  // ✅ 允许（不安全）
```

2. **`strictFunctionTypes`**
```typescript
// 函数参数逆变检查
type Handler = (arg: string | number) => void
const handler: Handler = (arg: string) => {}  // ❌ 错误
```

3. **`strictBindCallApply`**
```typescript
function foo(a: number, b: string) {}
foo.call(null, 1, 'hello')  // ✅ 类型检查
foo.call(null, 'hello', 1)  // ❌ 错误
```

4. **`strictPropertyInitialization`**
```typescript
class User {
  name: string  // ❌ 错误：未初始化
  age: number = 0  // ✅ 正确
}
```

5. **`noImplicitAny`**
```typescript
function add(a, b) {  // ❌ 错误：隐式 any
  return a + b
}

function add(a: number, b: number) {  // ✅ 正确
  return a + b
}
```

6. **`noImplicitThis`**
```typescript
function foo() {
  console.log(this.name)  // ❌ 错误：this 类型不明确
}
```

**为什么要启用严格模式？**
- ✅ 更早发现错误
- ✅ 更好的类型安全
- ✅ 更好的 IDE 提示
- ✅ 更容易重构



### 5.6 Tailwind CSS 工作原理

**面试问题：Tailwind CSS 如何实现按需加载？**

**回答要点：**

**1. 扫描阶段**
```javascript
// tailwind.config.js
content: ['./src/**/*.{js,ts,jsx,tsx}']
```
- Tailwind 扫描指定文件
- 提取所有类名
- 使用正则匹配

**2. 生成阶段**
```css
/* 只生成用到的类 */
.bg-blue-500 { background-color: #3b82f6; }
.text-white { color: #ffffff; }
/* 未使用的类不会生成 */
```

**3. 优化阶段**
```
开发环境：
- 生成所有类（方便调试）
- 文件较大（~3MB）

生产环境：
- 只保留使用的类
- 压缩和优化
- 文件很小（~10KB）
```

**工作流程：**
```
源代码
  ↓
扫描类名（bg-blue-500, text-white）
  ↓
生成对应的 CSS
  ↓
PurgeCSS 移除未使用的类
  ↓
最终 CSS（< 10KB）
```

**动态类名问题：**
```typescript
// ❌ 错误：无法被扫描到
const color = 'blue'
<div className={`bg-${color}-500`} />

// ✅ 正确：完整的类名
<div className={color === 'blue' ? 'bg-blue-500' : 'bg-red-500'} />
```

**原因：**
- Tailwind 使用静态分析
- 无法解析动态字符串
- 必须写完整的类名



---

## 六、知识扩展

### 6.1 pnpm 的硬链接和符号链接

**硬链接（Hard Link）：**
```
.pnpm-store/
  └── lodash@4.17.21/
      └── node_modules/
          └── lodash/

项目 A/node_modules/lodash → 硬链接到 .pnpm-store
项目 B/node_modules/lodash → 硬链接到 .pnpm-store
```

**优势：**
- 多个项目共享同一份文件
- 节省磁盘空间
- 安装速度快

**符号链接（Symbolic Link）：**
```
node_modules/
  └── .pnpm/
      └── lodash@4.17.21/
  └── lodash → 符号链接到 .pnpm/lodash@4.17.21
```

**优势：**
- 严格的依赖管理
- 避免幽灵依赖

### 6.2 Vite 的预构建

**为什么需要预构建？**

1. **CommonJS 转 ESM**
```javascript
// lodash 是 CommonJS
const _ = require('lodash')

// 预构建后变成 ESM
import _ from 'lodash'
```

2. **减少 HTTP 请求**
```
lodash 有 100+ 个模块
  ↓
预构建合并成 1 个文件
  ↓
只需 1 个 HTTP 请求
```

**预构建缓存：**
```
node_modules/.vite/
  └── deps/
      ├── lodash.js
      ├── react.js
      └── ...
```

**何时重新预构建？**
- package.json 变化
- 配置文件变化
- 手动删除缓存



### 6.3 React 18 的新特性

**1. 并发渲染（Concurrent Rendering）**
```typescript
// React 18
ReactDOM.createRoot(root).render(<App />)

// React 17
ReactDOM.render(<App />, root)
```

**优势：**
- 可中断的渲染
- 优先级调度
- 更流畅的用户体验

**2. 自动批处理（Automatic Batching）**
```typescript
// React 17：只在事件处理中批处理
onClick={() => {
  setCount(c => c + 1)
  setFlag(f => !f)
  // 只触发一次重渲染
}}

// React 18：所有更新都批处理
setTimeout(() => {
  setCount(c => c + 1)
  setFlag(f => !f)
  // 也只触发一次重渲染 ✨
}, 1000)
```

**3. Suspense 改进**
```typescript
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

**4. useTransition**
```typescript
const [isPending, startTransition] = useTransition()

startTransition(() => {
  setSearchQuery(input)  // 低优先级更新
})
```

### 6.4 ESLint 和 Prettier 的区别

**ESLint：**
- 代码质量检查
- 发现潜在错误
- 强制编码规范

```typescript
// ESLint 会报错
const x = 1
x = 2  // ❌ 不能给常量赋值

if (x = 1) {}  // ❌ 应该用 === 而不是 =
```

**Prettier：**
- 代码格式化
- 统一代码风格
- 自动修复

```typescript
// Prettier 会格式化
const obj={a:1,b:2}
// ↓
const obj = { a: 1, b: 2 }
```

**配合使用：**
```json
{
  "extends": [
    "eslint:recommended",
    "prettier"  // 禁用 ESLint 的格式规则
  ]
}
```



---

## 七、本章小结

通过本章学习，我们完成了：

### 技术选型
- ✅ 采用 Monorepo 架构管理前后端代码
- ✅ 使用 pnpm workspace 实现依赖管理
- ✅ 前端选择 Vite + React + TypeScript + Tailwind CSS
- ✅ 后端选择 Koa2 + TypeScript

### 项目搭建
- ✅ 配置了完整的 TypeScript 环境
- ✅ 集成了 Tailwind CSS 样式系统
- ✅ 配置了 ESLint 和 Prettier 代码规范
- ✅ 创建了清晰的目录结构

### 核心概念
- ✅ 理解了 Monorepo 的优势和应用场景
- ✅ 掌握了 Vite 的工作原理和性能优势
- ✅ 学习了 Koa2 的洋葱模型中间件机制
- ✅ 了解了 TypeScript 严格模式的重要性

### 开发环境
- ✅ 前端开发服务器运行在 http://localhost:5173
- ✅ 后端 API 服务器运行在 http://localhost:3000
- ✅ 配置了代理解决跨域问题
- ✅ 支持热更新和自动重启

### 项目结构
```
collaborative-editor/
├── client/          # 前端（React + Vite）
├── server/          # 后端（Koa2）
├── docs/            # 教程文档
└── package.json     # 根配置
```

---

## 八、验证本章实现

### 8.1 检查环境

运行环境检查脚本：

```bash
node scripts/check-env.js
```

**预期输出：**
```
🔍 检查开发环境...

✅ Node.js: 18.x.x (>= 18.0)
✅ pnpm: 8.x.x (>= 8.0)

==================================================

✅ 环境检查通过！可以开始开发了。
```

### 8.2 安装依赖

```bash
pnpm install
```

**预期结果：**
- 安装成功，无报错
- 生成 `pnpm-lock.yaml` 文件
- 生成 `node_modules` 目录

### 8.3 启动后端服务

```bash
pnpm dev:server
```

**预期输出：**
```
🚀 服务器启动成功！
📍 地址: http://localhost:3000
🏥 健康检查: http://localhost:3000/health
📡 API 信息: http://localhost:3000/api/info
```

**验证接口：**

在浏览器访问 http://localhost:3000/health，应该看到：
```json
{
  "status": "ok",
  "message": "服务器运行正常",
  "timestamp": "2024-01-28T..."
}
```

访问 http://localhost:3000/api/info，应该看到：
```json
{
  "name": "协同编辑器后端服务",
  "version": "1.0.0",
  "description": "基于 Koa2 + TypeScript 的后端服务"
}
```

### 8.4 启动前端服务

打开新终端，运行：

```bash
pnpm dev:client
```

**预期输出：**
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**验证页面：**

在浏览器访问 http://localhost:5173，应该看到：
- 标题："企业级协同编辑器"
- 副标题："项目脚手架搭建完成 ✓"
- 两个卡片显示前后端技术栈

### 8.5 验证热更新

**前端热更新：**

1. 修改 `client/src/App.tsx`，将标题改为其他文字
2. 保存文件
3. 浏览器应该自动刷新，显示新内容

**后端热重启：**

1. 修改 `server/src/index.ts`，修改健康检查的 message
2. 保存文件
3. 终端显示 "重启中..."
4. 刷新浏览器，访问 `/health` 应该看到新的 message

### 8.6 验证 Tailwind CSS

在 `client/src/App.tsx` 中添加一个按钮：

```tsx
<button className="mt-4 rounded-lg bg-primary-500 px-6 py-2 text-white hover:bg-primary-600">
  测试按钮
</button>
```

保存后，浏览器应该显示一个蓝色按钮，鼠标悬停时颜色变深。

### 8.7 验证 TypeScript

在 `client/src/App.tsx` 中故意写错代码：

```tsx
const num: number = "hello"  // 应该报错
```

**预期结果：**
- VS Code 显示红色波浪线
- 鼠标悬停显示错误信息："Type 'string' is not assignable to type 'number'"

### 8.8 验证代码格式化

运行格式化命令：

```bash
pnpm format
```

**预期结果：**
- 所有文件按照 Prettier 规则格式化
- 输出显示格式化的文件列表

### 8.9 检查项目结构

运行以下命令查看项目结构：

```bash
tree -L 2 -I 'node_modules'
```

**预期结构：**
```
.
├── client/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── chapter-01.md
├── scripts/
│   └── check-env.js
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### ✅ 验证通过标准

如果以上所有验证都通过，说明 Chapter 1 实现正确！你可以继续学习 Chapter 2。

如果有任何验证失败，请：
1. 检查是否按照教程步骤操作
2. 查看错误信息
3. 对比 Git commit 中的代码
4. 重新执行相关步骤

---

## 九、下一章预告

在下一章（Chapter 2）中，我们将：

1. **搭建 SQLite 数据库**
   - 设计文档表结构
   - 配置数据库连接
   - 实现数据库初始化

2. **完善后端架构**
   - 创建数据库访问层
   - 实现错误处理中间件
   - 添加日志中间件

3. **实现基础 API**
   - 健康检查接口
   - 数据库连接测试
   - 统一的响应格式

**学习重点：**
- SQLite 在 Node.js 中的使用
- 数据库表设计最佳实践
- Koa 中间件的实际应用
- 错误处理和日志记录

准备好了吗？让我们继续前进！🚀

