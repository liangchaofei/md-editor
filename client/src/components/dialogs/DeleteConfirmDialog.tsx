/**
 * 删除确认对话框
 */

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

function DeleteConfirmDialog({
  isOpen,
  title,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* 对话框容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          {/* 图标 */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* 标题 */}
          <DialogTitle className="mb-2 text-lg font-semibold text-gray-900">
            确认删除
          </DialogTitle>

          {/* 内容 */}
          <p className="mb-6 text-sm text-gray-600">
            确定要删除文档 <span className="font-medium">"{title}"</span> 吗？
            此操作无法撤销。
          </p>

          {/* 按钮 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? '删除中...' : '删除'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default DeleteConfirmDialog
