# 拖拽功能开关

## 修改内容

### 添加拖拽功能开关
- ✅ 在 TiptapEditor 中添加 `isDragEnabled` 状态（默认 false）
- ✅ 条件性加载 DragAndDrop 扩展
- ✅ 条件性显示 DragHandle 组件
- ✅ 在编辑器顶部添加拖拽开关按钮

## 使用方法

1. 打开编辑器
2. 在文档标题右侧找到"拖拽"按钮
3. 点击按钮开启/关闭拖拽功能
4. 开启后，鼠标悬停在段落左侧会显示拖拽手柄（⋮⋮）

## 按钮状态

- **关闭状态**（默认）：灰色边框，白色背景
- **开启状态**：蓝色边框，蓝色背景

## 技术实现

### 1. 状态管理
```typescript
const [isDragEnabled, setIsDragEnabled] = useState(false)
```

### 2. 条件性加载扩展
```typescript
extensions: [
  // ... 其他扩展
  ...(isDragEnabled ? [DragAndDrop] : []),
]
```

### 3. 条件性显示组件
```typescript
{isDragEnabled && <DragHandle editor={editor} />}
```

### 4. 依赖更新
```typescript
}, [document.id, ydoc, provider, isDragEnabled])
```

## 注意事项

- 拖拽功能默认关闭，避免影响正常编辑
- 切换开关会重新初始化编辑器
- 开关状态不会持久化（刷新页面后恢复默认）

## 后续优化（可选）

- [ ] 将开关状态保存到 localStorage
- [ ] 添加全局设置面板
- [ ] 添加快捷键切换（如 Ctrl+Shift+D）
- [ ] 添加拖拽功能的使用提示
