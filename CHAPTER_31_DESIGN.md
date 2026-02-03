# Chapter 31: AI 分段生成 - 大纲驱动的文档创作

## 功能概述

实现基于大纲的分段生成功能，让 AI 先生成文档大纲，用户确认后再基于大纲生成完整文档。

## 核心流程

```
用户输入需求
    ↓
AI 深度思考
    ↓
生成文档大纲（树形结构）
    ↓
用户编辑大纲（增删改查、拖拽排序）
    ↓
点击"基于大纲生成文档"
    ↓
AI 流式生成完整文档
```

## 架构设计

### 1. 数据结构

```typescript
// 大纲节点
interface OutlineNode {
  id: string                    // 唯一标识
  title: string                 // 章节标题
  description?: string          // 章节描述（可选）
  level: number                 // 层级（1-6，对应 h1-h6）
  children?: OutlineNode[]      // 子节点
  order: number                 // 排序
  isCollapsed?: boolean         // 是否折叠
}

// 大纲数据
interface Outline {
  id: string                    // 大纲 ID
  documentId: number            // 关联的文档 ID
  title: string                 // 文档标题
  nodes: OutlineNode[]          // 大纲节点树
  createdAt: string             // 创建时间
  updatedAt: string             // 更新时间
}

// 生成模式
type GenerationMode = 'full' | 'outline'  // 全文生成 | 大纲生成
```

### 2. 组件结构

```
AIChatPanel
  ├── GenerationModeToggle      // 生成模式开关
  ├── MessageList               // 消息列表
  │   ├── UserMessage          // 用户消息
  │   └── AIMessage            // AI 回复
  │       ├── ThinkingProcess  // 思考过程
  │       └── OutlineView      // 大纲视图（新增）
  │           ├── OutlineTree  // 大纲树
  │           │   └── OutlineNode  // 大纲节点
  │           │       ├── NodeHandle    // 拖拽手柄
  │           │       ├── NodeTitle     // 标题（可编辑）
  │           │       ├── NodeActions   // 操作按钮
  │           │       └── NodeChildren  // 子节点
  │           └── OutlineActions       // 大纲操作
  │               ├── AddNodeButton    // 添加章节
  │               └── GenerateButton   // 生成文档
  └── InputBox                  // 输入框
```

### 3. API 设计

```typescript
// 后端 API
POST /api/ai/generate-outline   // 生成大纲
POST /api/ai/generate-from-outline  // 基于大纲生成文档

// 请求参数
interface GenerateOutlineRequest {
  prompt: string                // 用户需求
  model: string                 // 模型选择
  documentId: number            // 文档 ID
}

interface GenerateFromOutlineRequest {
  outline: Outline              // 大纲数据
  model: string                 // 模型选择
  documentId: number            // 文档 ID
}

// 响应格式（SSE 流式）
// 大纲生成
{
  type: 'thinking' | 'outline' | 'done' | 'error'
  data: {
    thinking?: string           // 思考过程
    outline?: Outline           // 大纲数据
    error?: string              // 错误信息
  }
}

// 文档生成
{
  type: 'content' | 'done' | 'error'
  data: {
    content?: string            // 文档内容（增量）
    error?: string              // 错误信息
  }
}
```

### 4. 状态管理

```typescript
// AIChatPanel 状态
interface AIChatState {
  generationMode: GenerationMode    // 生成模式
  currentOutline: Outline | null    // 当前大纲
  isGeneratingOutline: boolean      // 是否正在生成大纲
  isGeneratingDocument: boolean     // 是否正在生成文档
}
```

## 实现方案

### 方案 A：前端管理大纲（推荐）

**优点**：
- 实现简单
- 响应快速
- 无需后端存储
- 适合临时编辑

**缺点**：
- 刷新页面丢失
- 无法跨设备同步

**适用场景**：
- 大纲是临时的，用完即弃
- 用户确认后立即生成文档
- 不需要保存大纲历史

**实现**：
```typescript
// 前端状态管理
const [currentOutline, setCurrentOutline] = useState<Outline | null>(null)

// 大纲操作
const addNode = (parentId: string, node: OutlineNode) => { ... }
const updateNode = (nodeId: string, updates: Partial<OutlineNode>) => { ... }
const deleteNode = (nodeId: string) => { ... }
const moveNode = (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => { ... }
```

### 方案 B：后端存储大纲

**优点**：
- 数据持久化
- 可以保存多个版本
- 支持跨设备同步
- 可以作为文档模板

**缺点**：
- 实现复杂
- 需要数据库表
- 需要 CRUD API

**适用场景**：
- 大纲需要保存
- 需要大纲历史
- 需要大纲模板功能

**实现**：
```sql
-- 大纲表
CREATE TABLE outlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  nodes TEXT NOT NULL,  -- JSON 格式
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

## 推荐方案：方案 A（前端管理）

**理由**：
1. **简单高效** - 无需后端存储，实现快速
2. **符合场景** - 大纲是临时的，用完即弃
3. **用户体验好** - 响应快速，无延迟
4. **易于扩展** - 后续可以升级到方案 B

## 实现步骤

### 步骤 1：创建大纲相关类型

创建 `client/src/types/outline.ts`：

```typescript
export interface OutlineNode {
  id: string
  title: string
  description?: string
  level: number
  children?: OutlineNode[]
  order: number
  isCollapsed?: boolean
}

export interface Outline {
  id: string
  documentId: number
  title: string
  nodes: OutlineNode[]
  createdAt: string
  updatedAt: string
}

export type GenerationMode = 'full' | 'outline'
```

### 步骤 2：创建大纲组件

创建 `client/src/components/editor/OutlineView.tsx`：

**核心功能**：
- 树形结构展示
- 折叠/展开
- 拖拽排序
- 增删改查
- 生成文档按钮

**组件结构**：
```typescript
<OutlineView outline={outline} onUpdate={handleUpdate}>
  <OutlineTree nodes={outline.nodes}>
    <OutlineNode node={node}>
      <NodeHandle />        // 拖拽手柄
      <NodeTitle />         // 标题（可编辑）
      <NodeActions />       // 操作按钮
      <NodeChildren />      // 子节点（递归）
    </OutlineNode>
  </OutlineTree>
  <OutlineActions>
    <AddNodeButton />       // 添加章节
    <GenerateButton />      // 生成文档
  </OutlineActions>
</OutlineView>
```

### 步骤 3：创建大纲管理 Hook

创建 `client/src/hooks/useOutline.ts`：

```typescript
export function useOutline() {
  const [outline, setOutline] = useState<Outline | null>(null)

  // 添加节点
  const addNode = (parentId: string | null, node: Partial<OutlineNode>) => { ... }

  // 更新节点
  const updateNode = (nodeId: string, updates: Partial<OutlineNode>) => { ... }

  // 删除节点
  const deleteNode = (nodeId: string) => { ... }

  // 移动节点
  const moveNode = (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => { ... }

  // 折叠/展开
  const toggleCollapse = (nodeId: string) => { ... }

  return {
    outline,
    setOutline,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    toggleCollapse,
  }
}
```

### 步骤 4：后端 API 实现

在 `server/src/routes/ai.ts` 中添加：

```typescript
// 生成大纲
router.post('/generate-outline', async (ctx) => {
  const { prompt, model, documentId } = ctx.request.body

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // 构建 Prompt
  const systemPrompt = `你是一个专业的文档大纲生成助手。
根据用户的需求，生成一个结构化的文档大纲。

要求：
1. 大纲要有清晰的层级结构（1-3 层）
2. 每个章节要有简短的描述
3. 章节标题要简洁明了
4. 返回 JSON 格式

输出格式：
{
  "title": "文档标题",
  "nodes": [
    {
      "id": "1",
      "title": "第一章",
      "description": "章节描述",
      "level": 1,
      "order": 0,
      "children": [
        {
          "id": "1-1",
          "title": "第一节",
          "description": "节描述",
          "level": 2,
          "order": 0
        }
      ]
    }
  ]
}`

  // 调用 AI
  const stream = await aiService.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    stream: true,
  })

  // 流式返回
  // ...
})

// 基于大纲生成文档
router.post('/generate-from-outline', async (ctx) => {
  const { outline, model, documentId } = ctx.request.body

  // 设置 SSE 响应头
  // ...

  // 构建 Prompt
  const systemPrompt = `你是一个专业的文档写作助手。
根据提供的大纲，生成完整的文档内容。

要求：
1. 严格按照大纲结构生成
2. 每个章节内容要充实
3. 使用 Markdown 格式
4. 保持专业和准确`

  const userPrompt = `请根据以下大纲生成完整文档：

${formatOutlineToText(outline)}

请生成完整的文档内容。`

  // 调用 AI
  // ...
})
```

### 步骤 5：集成到 AIChatPanel

在 `client/src/components/editor/AIChatPanel.tsx` 中：

```typescript
// 添加生成模式状态
const [generationMode, setGenerationMode] = useState<GenerationMode>('full')
const [currentOutline, setCurrentOutline] = useState<Outline | null>(null)

// 添加生成模式切换
<div className="flex items-center gap-2 mb-4">
  <label className="text-sm text-gray-600">生成模式：</label>
  <button
    onClick={() => setGenerationMode('full')}
    className={generationMode === 'full' ? 'active' : ''}
  >
    全文生成
  </button>
  <button
    onClick={() => setGenerationMode('outline')}
    className={generationMode === 'outline' ? 'active' : ''}
  >
    分段生成
  </button>
</div>

// 根据模式显示不同内容
{generationMode === 'outline' && currentOutline && (
  <OutlineView
    outline={currentOutline}
    onUpdate={setCurrentOutline}
    onGenerate={handleGenerateFromOutline}
  />
)}
```

## 技术实现细节

### 1. 大纲树形结构

**递归渲染**：
```typescript
function OutlineNode({ node, level, onUpdate, onDelete }: Props) {
  return (
    <div className="outline-node" style={{ paddingLeft: `${level * 20}px` }}>
      {/* 拖拽手柄 */}
      <div className="node-handle">⋮⋮</div>
      
      {/* 折叠按钮 */}
      {node.children && node.children.length > 0 && (
        <button onClick={() => toggleCollapse(node.id)}>
          {node.isCollapsed ? '▶' : '▼'}
        </button>
      )}
      
      {/* 标题（可编辑） */}
      <input
        value={node.title}
        onChange={(e) => onUpdate(node.id, { title: e.target.value })}
      />
      
      {/* 操作按钮 */}
      <div className="node-actions">
        <button onClick={() => addChild(node.id)}>+</button>
        <button onClick={() => onDelete(node.id)}>-</button>
      </div>
      
      {/* 子节点（递归） */}
      {!node.isCollapsed && node.children && (
        <div className="node-children">
          {node.children.map(child => (
            <OutlineNode
              key={child.id}
              node={child}
              level={level + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### 2. 大纲拖拽排序

**使用 HTML5 Drag and Drop API**：
```typescript
const handleDragStart = (e: React.DragEvent, nodeId: string) => {
  e.dataTransfer.setData('nodeId', nodeId)
}

const handleDrop = (e: React.DragEvent, targetId: string) => {
  const draggedId = e.dataTransfer.getData('nodeId')
  moveNode(draggedId, targetId, 'after')
}
```

### 3. AI Prompt 设计

**生成大纲的 Prompt**：
```
你是一个专业的文档大纲生成助手。
根据用户的需求，生成一个结构化的文档大纲。

用户需求：{prompt}

要求：
1. 大纲要有清晰的层级结构（1-3 层）
2. 每个章节要有简短的描述
3. 章节标题要简洁明了
4. 返回 JSON 格式

输出格式：
{
  "title": "文档标题",
  "nodes": [...]
}
```

**基于大纲生成文档的 Prompt**：
```
你是一个专业的文档写作助手。
根据提供的大纲，生成完整的文档内容。

大纲：
{formatOutlineToText(outline)}

要求：
1. 严格按照大纲结构生成
2. 每个章节内容要充实
3. 使用 Markdown 格式
4. 保持专业和准确
```

### 4. 大纲编辑操作

**增删改查**：
```typescript
// 添加节点
const addNode = (parentId: string | null, node: Partial<OutlineNode>) => {
  const newNode: OutlineNode = {
    id: generateId(),
    title: node.title || '新章节',
    level: node.level || 1,
    order: node.order || 0,
    children: [],
  }
  
  if (parentId) {
    // 添加为子节点
    updateNodeChildren(parentId, (children) => [...children, newNode])
  } else {
    // 添加为根节点
    setOutline(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }))
  }
}

// 更新节点
const updateNode = (nodeId: string, updates: Partial<OutlineNode>) => {
  setOutline(prev => updateNodeInTree(prev, nodeId, updates))
}

// 删除节点
const deleteNode = (nodeId: string) => {
  setOutline(prev => deleteNodeFromTree(prev, nodeId))
}

// 移动节点（拖拽排序）
const moveNode = (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => {
  setOutline(prev => moveNodeInTree(prev, nodeId, targetId, position))
}
```

## UI 设计

### 1. 生成模式切换

```tsx
<div className="flex items-center gap-2 p-3 border-b border-gray-200">
  <span className="text-sm text-gray-600">生成模式：</span>
  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
    <button
      onClick={() => setGenerationMode('full')}
      className={`px-3 py-1 text-sm rounded-md transition-colors ${
        generationMode === 'full'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      全文生成
    </button>
    <button
      onClick={() => setGenerationMode('outline')}
      className={`px-3 py-1 text-sm rounded-md transition-colors ${
        generationMode === 'outline'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      分段生成
    </button>
  </div>
</div>
```

### 2. 大纲视图

```tsx
<div className="outline-view p-4 bg-gray-50 rounded-lg">
  {/* 标题 */}
  <div className="mb-4">
    <input
      value={outline.title}
      onChange={(e) => updateOutline({ title: e.target.value })}
      className="text-lg font-bold w-full border-none bg-transparent"
      placeholder="文档标题"
    />
  </div>
  
  {/* 大纲树 */}
  <div className="outline-tree">
    {outline.nodes.map(node => (
      <OutlineNode
        key={node.id}
        node={node}
        level={0}
        onUpdate={updateNode}
        onDelete={deleteNode}
        onMove={moveNode}
      />
    ))}
  </div>
  
  {/* 操作按钮 */}
  <div className="mt-4 flex gap-2">
    <button
      onClick={() => addNode(null, { level: 1 })}
      className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      添加章节
    </button>
    
    <button
      onClick={handleGenerateFromOutline}
      disabled={isGenerating}
      className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      基于大纲生成文档
    </button>
  </div>
</div>
```

### 3. 大纲节点

```tsx
<div className="outline-node flex items-start gap-2 py-2 hover:bg-gray-100 rounded">
  {/* 拖拽手柄 */}
  <div
    draggable
    onDragStart={(e) => handleDragStart(e, node.id)}
    className="cursor-grab hover:bg-gray-200 rounded p-1"
  >
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="3" cy="3" r="1" />
      <circle cx="3" cy="8" r="1" />
      <circle cx="3" cy="13" r="1" />
      <circle cx="8" cy="3" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="8" cy="13" r="1" />
    </svg>
  </div>
  
  {/* 折叠按钮 */}
  {node.children && node.children.length > 0 && (
    <button
      onClick={() => toggleCollapse(node.id)}
      className="text-gray-400 hover:text-gray-600"
    >
      {node.isCollapsed ? '▶' : '▼'}
    </button>
  )}
  
  {/* 标题 */}
  <input
    value={node.title}
    onChange={(e) => onUpdate(node.id, { title: e.target.value })}
    className="flex-1 border-none bg-transparent text-sm"
    placeholder="章节标题"
  />
  
  {/* 操作按钮 */}
  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
    <button
      onClick={() => addChild(node.id)}
      className="p-1 hover:bg-gray-200 rounded"
      title="添加子章节"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
    <button
      onClick={() => onDelete(node.id)}
      className="p-1 hover:bg-red-100 rounded text-red-600"
      title="删除"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
</div>
```

## 用户体验流程

### 流程 1：生成大纲

1. 用户切换到"分段生成"模式
2. 输入需求："写一篇关于 AI 的文章"
3. AI 深度思考（显示思考过程）
4. AI 生成大纲（树形结构）
5. 右侧显示大纲，左侧编辑器空白

### 流程 2：编辑大纲

1. 用户查看大纲
2. 编辑章节标题
3. 添加/删除章节
4. 拖拽调整顺序
5. 折叠/展开章节

### 流程 3：生成文档

1. 用户点击"基于大纲生成文档"
2. AI 根据大纲生成内容
3. 左侧编辑器流式显示内容
4. 右侧显示生成进度
5. 生成完成

## 性能优化

### 1. 大纲渲染优化

- 虚拟滚动（如果节点很多）
- 懒加载子节点
- 防抖输入

### 2. 拖拽优化

- 使用 requestAnimationFrame
- 节流拖拽事件
- 优化重渲染

### 3. 流式生成优化

- 批量更新（100ms）
- 使用 Markdown 扩展
- 避免频繁重渲染

## 数据持久化建议

### 阶段 1：前端临时存储（推荐先实现）

**优点**：
- 实现简单快速
- 无需后端改动
- 适合 MVP

**实现**：
```typescript
// 使用 useState 管理
const [currentOutline, setCurrentOutline] = useState<Outline | null>(null)

// 可选：使用 localStorage 临时保存
useEffect(() => {
  if (currentOutline) {
    localStorage.setItem(`outline_${documentId}`, JSON.stringify(currentOutline))
  }
}, [currentOutline, documentId])
```

### 阶段 2：后端持久化（后续优化）

**优点**：
- 数据持久化
- 支持历史版本
- 可以作为模板

**实现**：
- 创建 outlines 表
- 实现 CRUD API
- 支持版本管理

## 实现难度评估

### 简单（前端临时存储）

**工作量**：4-6 小时

**需要实现**：
1. 大纲类型定义（30 分钟）
2. OutlineView 组件（2 小时）
3. useOutline Hook（1 小时）
4. 后端 API（1.5 小时）
5. 集成到 AIChatPanel（1 小时）
6. 测试和调试（1 小时）

### 中等（后端持久化）

**工作量**：8-10 小时

**额外需要**：
1. 数据库表设计（30 分钟）
2. 后端 CRUD API（2 小时）
3. 前端 API 集成（1 小时）
4. 版本管理（1.5 小时）

## 推荐实现方案

### 第一阶段：MVP（前端临时存储）

**目标**：快速实现核心功能，验证用户体验

**实现**：
1. ✅ 生成模式切换
2. ✅ AI 生成大纲
3. ✅ 大纲展示和编辑
4. ✅ 基于大纲生成文档
5. ✅ 前端状态管理

**不实现**：
- ❌ 大纲持久化
- ❌ 大纲历史版本
- ❌ 大纲模板

### 第二阶段：优化（后端持久化）

**目标**：完善功能，提升用户体验

**实现**：
1. 大纲持久化到数据库
2. 大纲历史版本
3. 大纲模板功能
4. 大纲分享

## 总结

这个功能设计得很好，实现起来也不复杂。推荐先实现前端临时存储的 MVP 版本，验证用户体验后再考虑后端持久化。

**核心优势**：
- ✅ 用户可以控制文档结构
- ✅ 分段生成更可控
- ✅ 大纲可以编辑优化
- ✅ 提升 AI 生成质量

**技术可行性**：
- ✅ 前端实现简单
- ✅ 后端 API 简单
- ✅ 与现有功能集成容易
- ✅ 性能影响小

准备好开始实现了吗？
