# 自动保存优化建议

## 当前实现 ✅

```typescript
// EditorContainer.tsx
const handleContentUpdate = useCallback((content: string) => {
  if (!currentDocument) return

  // 清除之前的定时器
  if (saveTimerRef.current) {
    clearTimeout(saveTimerRef.current)
  }

  // 设置新的定时器（2秒后保存）
  saveTimerRef.current = setTimeout(async () => {
    setIsSaving(true)
    try {
      await updateDocument(currentDocument.id, { content })
      setLastSaved(new Date())
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, 2000)
}, [currentDocument, updateDocument])
```

**优点：**
- ✅ 有防抖机制（2秒）
- ✅ 有保存状态显示
- ✅ 有定时器清理

---

## 可以优化的地方

### 1. 保存失败处理 ⚠️

**问题：** 保存失败只是 console.error，用户可能不知道

**建议：**
```typescript
// 添加错误状态和重试机制
const [saveError, setSaveError] = useState<string | null>(null)
const [retryCount, setRetryCount] = useState(0)

const handleContentUpdate = useCallback(async (content: string) => {
  // ... 防抖逻辑
  
  try {
    await updateDocument(currentDocument.id, { content })
    setLastSaved(new Date())
    setSaveError(null)
    setRetryCount(0)
  } catch (error) {
    console.error('保存失败:', error)
    setSaveError('保存失败，正在重试...')
    
    // 自动重试（最多3次）
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1)
      setTimeout(() => {
        handleContentUpdate(content)
      }, 5000) // 5秒后重试
    } else {
      setSaveError('保存失败，请检查网络连接')
    }
  }
}, [currentDocument, updateDocument, retryCount])
```

### 2. 本地缓存备份 ⚠️

**问题：** 如果保存失败且刷新页面，内容会丢失

**建议：**
```typescript
// 使用 localStorage 作为备份
const handleContentUpdate = useCallback((content: string) => {
  if (!currentDocument) return

  // 立即保存到本地缓存
  localStorage.setItem(`doc_${currentDocument.id}_backup`, content)
  localStorage.setItem(`doc_${currentDocument.id}_backup_time`, Date.now().toString())

  // 防抖保存到服务器
  if (saveTimerRef.current) {
    clearTimeout(saveTimerRef.current)
  }

  saveTimerRef.current = setTimeout(async () => {
    setIsSaving(true)
    try {
      await updateDocument(currentDocument.id, { content })
      setLastSaved(new Date())
      // 保存成功后清除本地备份
      localStorage.removeItem(`doc_${currentDocument.id}_backup`)
      localStorage.removeItem(`doc_${currentDocument.id}_backup_time`)
    } catch (error) {
      console.error('保存失败，内容已保存到本地缓存')
    } finally {
      setIsSaving(false)
    }
  }, 2000)
}, [currentDocument, updateDocument])

// 页面加载时检查本地备份
useEffect(() => {
  if (!currentDocument) return

  const backup = localStorage.getItem(`doc_${currentDocument.id}_backup`)
  const backupTime = localStorage.getItem(`doc_${currentDocument.id}_backup_time`)

  if (backup && backupTime) {
    const time = new Date(parseInt(backupTime))
    const serverTime = new Date(currentDocument.updated_at)

    // 如果本地备份比服务器更新，提示用户恢复
    if (time > serverTime) {
      if (confirm(`发现本地有更新的内容（${time.toLocaleString()}），是否恢复？`)) {
        // 恢复本地内容
        updateDocument(currentDocument.id, { content: backup })
      }
      // 清除备份
      localStorage.removeItem(`doc_${currentDocument.id}_backup`)
      localStorage.removeItem(`doc_${currentDocument.id}_backup_time`)
    }
  }
}, [currentDocument])
```

### 3. 离开页面前保存 ⚠️

**问题：** 用户关闭标签页时，可能有未保存的内容

**建议：**
```typescript
// 监听页面关闭事件
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // 如果有未保存的内容，提示用户
    if (saveTimerRef.current) {
      e.preventDefault()
      e.returnValue = '您有未保存的更改，确定要离开吗？'
      
      // 尝试立即保存（使用 sendBeacon API）
      if (currentDocument && pendingContent.current) {
        const data = JSON.stringify({
          id: currentDocument.id,
          content: pendingContent.current,
        })
        navigator.sendBeacon('/api/documents/save', data)
      }
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [currentDocument])
```

### 4. 保存状态更明显 ⚠️

**问题：** 当前保存状态在状态栏，不够明显

**建议：**
```typescript
// 添加 Toast 提示
import { toast } from 'react-hot-toast'

const handleContentUpdate = useCallback(async (content: string) => {
  // ... 防抖逻辑
  
  try {
    await updateDocument(currentDocument.id, { content })
    setLastSaved(new Date())
    // 成功时不显示 toast（避免打扰）
  } catch (error) {
    // 失败时显示明显的提示
    toast.error('保存失败，请检查网络连接', {
      duration: 5000,
      position: 'top-center',
    })
  }
}, [currentDocument, updateDocument])
```

### 5. 协同冲突处理 ⚠️

**问题：** 多人编辑时，可能出现冲突

**建议：**
```typescript
// 检测冲突
const handleContentUpdate = useCallback(async (content: string) => {
  // ... 防抖逻辑
  
  try {
    const response = await updateDocument(currentDocument.id, { 
      content,
      version: currentDocument.version // 发送版本号
    })
    
    setLastSaved(new Date())
  } catch (error) {
    if (error.code === 'CONFLICT') {
      // 检测到冲突
      const shouldOverwrite = confirm(
        '检测到其他用户的更改，是否覆盖？\n' +
        '点击"确定"覆盖，点击"取消"刷新页面查看最新内容。'
      )
      
      if (shouldOverwrite) {
        // 强制覆盖
        await updateDocument(currentDocument.id, { 
          content,
          force: true 
        })
      } else {
        // 刷新页面
        window.location.reload()
      }
    }
  }
}, [currentDocument, updateDocument])
```

### 6. 性能优化 ⚠️

**问题：** 每次编辑都触发保存逻辑，可能影响性能

**建议：**
```typescript
// 使用 useRef 保存待保存的内容，避免频繁创建定时器
const pendingContentRef = useRef<string>('')
const lastSavedContentRef = useRef<string>('')

const handleContentUpdate = useCallback((content: string) => {
  if (!currentDocument) return

  // 保存待保存的内容
  pendingContentRef.current = content

  // 如果内容没有变化，不保存
  if (content === lastSavedContentRef.current) {
    return
  }

  // 立即保存到本地缓存（不影响性能）
  localStorage.setItem(`doc_${currentDocument.id}_backup`, content)

  // 清除之前的定时器
  if (saveTimerRef.current) {
    clearTimeout(saveTimerRef.current)
  }

  // 设置新的定时器
  saveTimerRef.current = setTimeout(async () => {
    const contentToSave = pendingContentRef.current
    
    // 如果内容没有变化，不保存
    if (contentToSave === lastSavedContentRef.current) {
      return
    }

    setIsSaving(true)
    try {
      await updateDocument(currentDocument.id, { content: contentToSave })
      lastSavedContentRef.current = contentToSave
      setLastSaved(new Date())
      localStorage.removeItem(`doc_${currentDocument.id}_backup`)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, 2000)
}, [currentDocument, updateDocument])
```

---

## 优先级建议

### 高优先级（必须做）
1. **本地缓存备份** - 防止数据丢失
2. **保存失败重试** - 提升可靠性
3. **离开页面前保存** - 避免丢失未保存内容

### 中优先级（建议做）
4. **保存状态提示优化** - 提升用户体验
5. **性能优化** - 大文档编辑流畅度

### 低优先级（可选）
6. **协同冲突处理** - 多人编辑场景（已有 Y.js 处理大部分情况）

---

## 总结

当前的自动保存实现已经很不错了，主要需要加强：
1. **数据安全性** - 本地备份、重试机制
2. **用户体验** - 更明显的保存状态、离开提示
3. **性能优化** - 避免不必要的保存

最重要的是**本地缓存备份**，这是防止数据丢失的最后一道防线。
