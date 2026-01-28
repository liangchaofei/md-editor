# 教程目录

## 课程介绍

这是一套从零开始构建企业级多人协同富文本编辑器的完整教程。通过 20 章循序渐进的学习，你将掌握现代 Web 应用开发的核心技术。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite（构建工具）
- Tailwind CSS（样式）
- Tiptap（富文本编辑器）
- Y.js（协同编辑）
- Zustand（状态管理）

### 后端
- Node.js + TypeScript
- Koa2（HTTP 服务器）
- Hocuspocus（WebSocket 协同服务）
- SQLite（本地数据库）

## 课程大纲

### 阶段一：项目初始化（Chapter 1-3）

#### ✅ [Chapter 1: 项目脚手架搭建](./chapter-01.md)
**已完成** | Git Commit: `feat: 初始化项目结构和基础配置`

**学习内容：**
- Monorepo 架构设计
- pnpm workspace 配置
- Vite + React + TypeScript 前端项目
- Koa2 + TypeScript 后端项目
- Tailwind CSS 集成
- ESLint 和 Prettier 配置

**核心知识点：**
- 为什么选择 Monorepo
- Vite 的工作原理和性能优势
- Koa2 的洋葱模型中间件机制
- TypeScript 严格模式
- Tailwind CSS 按需加载原理

**面试考点：**
- Monorepo vs Polyrepo
- Vite vs Webpack 性能对比
- Koa 洋葱模型实现原理
- TypeScript strict 模式包含的检查项

---

#### Chapter 2: 后端基础架构
**即将开始**

**学习内容：**
- SQLite 数据库配置
- 数据库表设计
- 错误处理中间件
- 日志中间件
- 统一响应格式

---

#### Chapter 3: 前端基础布局
**待开始**

**学习内容：**
- 三栏布局实现
- 响应式设计
- Header 组件
- Sidebar 组件
- 布局状态管理

---

### 阶段二：文档管理功能（Chapter 4-7）

#### Chapter 4: 文档 CRUD API
#### Chapter 5: Zustand 状态管理
#### Chapter 6: 左侧文档列表 UI
#### Chapter 7: 文档操作功能

---

### 阶段三：基础编辑器（Chapter 8-10）

#### Chapter 8: Tiptap 编辑器集成
#### Chapter 9: 编辑器工具栏
#### Chapter 10: 编辑器样式优化

---

### 阶段四：协同编辑核心（Chapter 11-14）

#### Chapter 11: Y.js 基础集成
#### Chapter 12: Hocuspocus 服务器
#### Chapter 13: 前端协同连接
#### Chapter 14: 协作光标和用户信息

---

### 阶段五：高级功能（Chapter 15-18）

#### Chapter 15: 文档分享和权限
#### Chapter 16: 文档历史版本
#### Chapter 17: 富文本增强功能
#### Chapter 18: 评论系统

---

### 阶段六：优化和部署（Chapter 19-20）

#### Chapter 19: 性能优化和测试
#### Chapter 20: 生产环境配置和部署

---

## 学习建议

### 适合人群
- 有 JavaScript 基础的前端开发者
- 想学习协同编辑技术的开发者
- 准备面试的求职者
- 想提升架构能力的工程师

### 学习方法
1. **按顺序学习** - 每章都基于前一章的内容
2. **动手实践** - 跟着教程一步步编写代码
3. **理解原理** - 不要只是复制代码，理解背后的原理
4. **扩展学习** - 查看"知识扩展"部分深入学习
5. **面试准备** - 重点关注"面试考点"部分

### 时间安排
- 每章预计学习时间：2-4 小时
- 总课程时间：40-80 小时
- 建议每周完成 2-3 章

### 前置知识
- JavaScript ES6+ 语法
- React 基础（组件、Hooks）
- TypeScript 基础
- Node.js 基础
- Git 基本操作

## 项目特色

### 1. 循序渐进
从最基础的项目搭建开始，逐步添加功能，每一步都有详细解释。

### 2. 理论结合实践
不仅教你怎么做，更重要的是告诉你为什么这样做。

### 3. 企业级标准
代码质量、架构设计、最佳实践都按照企业级标准。

### 4. 面试导向
每章都包含相关的面试考点，帮助你准备技术面试。

### 5. 完整项目
最终完成一个功能完整、可以实际使用的协同编辑器。

## 获取帮助

### 文档
- 每章教程：`docs/chapter-XX.md`
- 快速开始：`GETTING_STARTED.md`
- 项目说明：`README.md`

### 代码
- 每章对应一个 Git commit
- 可以随时回退到任意章节
- 代码包含详细注释

### 问题反馈
如果遇到问题：
1. 检查是否按照教程步骤操作
2. 查看常见问题部分
3. 查看 Git commit 历史
4. 提交 Issue

## 版权声明

本教程仅供学习使用，请勿用于商业用途。

---

**准备好了吗？让我们从 [Chapter 1](./chapter-01.md) 开始吧！🚀**
