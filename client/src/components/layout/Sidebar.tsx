/**
 * 左侧边栏组件
 * 显示文档列表
 */

import { useEffect, useState } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import DeleteConfirmDialog from '../dialogs/DeleteConfirmDialog'
import DocumentMenu from '../menus/DocumentMenu'

interface SidebarProps {
  isOpen: boolean
  onDocumentSelect?: (id: number) => void
  onToggle?: () => void
}

function Sidebar({ isOpen, onDocumentSelect, onToggle }: SidebarProps) {
  const {
    documents,
    currentDocument,
    loading,
    error,
    pagination,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    setCurrentDocument,
    setQuery,
  } = useDocumentStore()

  const [keyword, setKeyword] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<{ id: number; title: string } | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // 组件挂载时获取文档列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 默认选中第一个文档
  useEffect(() => {
    if (!currentDocument && documents.length > 0) {
      const firstDoc = documents[0]
      setCurrentDocument(firstDoc)
      onDocumentSelect?.(firstDoc.id)
    }
  }, [documents, currentDocument, setCurrentDocument, onDocumentSelect])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery({ keyword, page: 1 })
      fetchDocuments()
    }, 300)

    return () => clearTimeout(timer)
  }, [keyword, setQuery, fetchDocuments])

  // 创建新文档
  const handleCreate = async () => {
    const doc = await createDocument({
      title: '无标题文档',
      content: '',
    })
    if (doc) {
      setCurrentDocument(doc)
      onDocumentSelect?.(doc.id)
    }
  }

  // 选择文档
  const handleSelect = (id: number) => {
    const doc = documents.find(d => d.id === id)
    if (doc) {
      setCurrentDocument(doc)
      onDocumentSelect?.(id)
    }
  }

  // 开始重命名
  const handleStartRename = (id: number, currentTitle: string) => {
    setRenamingId(id)
    setRenameValue(currentTitle)
  }

  // 完成重命名
  const handleFinishRename = async (id: number) => {
    if (renameValue.trim() && renameValue !== documents.find(d => d.id === id)?.title) {
      await updateDocument(id, { title: renameValue.trim() })
    }
    setRenamingId(null)
    setRenameValue('')
  }

  // 取消重命名
  const handleCancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  // 打开删除确认对话框
  const handleOpenDeleteDialog = (id: number, title: string) => {
    setDocumentToDelete({ id, title })
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete.id)
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* 顶部：新建按钮和搜索 */}
        <div className="border-b border-gray-200 p-4">
          {/* 新建文档按钮 */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            新建文档
          </button>

          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索文档..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* 文档列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* 错误提示 */}
          {error && (
            <div className="mx-2 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 加载状态 */}
          {loading && documents.length === 0 && (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 rounded-lg bg-gray-200"></div>
                </div>
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!loading && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="mb-3 h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                {keyword ? '没有找到相关文档' : '还没有文档'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                点击上方按钮创建新文档
              </p>
            </div>
          )}

          {/* 文档列表 */}
          {documents.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold uppercase text-gray-500">
                  全部文档
                </h3>
                {pagination && (
                  <span className="text-xs text-gray-400">
                    {pagination.total} 个
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {documents.map(doc => (
                  <DocumentItem
                    key={doc.id}
                    id={doc.id}
                    title={doc.title}
                    updatedAt={doc.updated_at}
                    active={currentDocument?.id === doc.id}
                    isRenaming={renamingId === doc.id}
                    renameValue={renameValue}
                    onRenameValueChange={setRenameValue}
                    onClick={() => handleSelect(doc.id)}
                    onDoubleClick={() => handleStartRename(doc.id, doc.title)}
                    onRenameFinish={() => handleFinishRename(doc.id)}
                    onRenameCancel={handleCancelRename}
                    onRename={() => handleStartRename(doc.id, doc.title)}
                    onDelete={() => handleOpenDeleteDialog(doc.id, doc.title)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部：收起按钮 */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="收起侧边栏"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
            <span>收起</span>
          </button>
        </div>
      </aside>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        title={documentToDelete?.title || ''}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={loading}
      />
    </>
  )
}

// 文档项组件
interface DocumentItemProps {
  id: number
  title: string
  updatedAt: string
  active?: boolean
  isRenaming?: boolean
  renameValue?: string
  onRenameValueChange?: (value: string) => void
  onClick: () => void
  onDoubleClick?: () => void
  onRenameFinish?: () => void
  onRenameCancel?: () => void
  onRename: () => void
  onDelete: () => void
}

function DocumentItem({
  title,
  updatedAt,
  active = false,
  isRenaming = false,
  renameValue = '',
  onRenameValueChange,
  onClick,
  onDoubleClick,
  onRenameFinish,
  onRenameCancel,
  onRename,
  onDelete,
}: DocumentItemProps) {
  // 格式化时间
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN,
      })
    } catch {
      return '刚刚'
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameFinish?.()
    } else if (e.key === 'Escape') {
      onRenameCancel?.()
    }
  }

  return (
    <div
      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {/* 左侧：图标和标题 */}
      <div
        className="flex min-w-0 flex-1 items-center gap-2"
        onClick={isRenaming ? undefined : onClick}
        onDoubleClick={isRenaming ? undefined : onDoubleClick}
      >
        {/* 文档图标 */}
        <svg
          className="h-4 w-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        {/* 文档标题或重命名输入框 */}
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={e => onRenameValueChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onRenameFinish}
            autoFocus
            className="min-w-0 flex-1 rounded border border-primary-500 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <span className="truncate font-medium">{title}</span>
        )}
      </div>

      {/* 右侧：时间和菜单 */}
      {!isRenaming && (
        <div className="flex items-center gap-2">
          {/* 时间 */}
          <span className="flex-shrink-0 text-xs text-gray-500">
            {formatTime(updatedAt)}
          </span>

          {/* 菜单按钮 */}
          <div
            className="opacity-0 group-hover:opacity-100"
            onClick={e => e.stopPropagation()}
          >
            <DocumentMenu onRename={onRename} onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
