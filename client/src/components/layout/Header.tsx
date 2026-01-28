/**
 * 顶部导航栏组件
 */

import React from 'react'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* 左侧：Logo 和标题 */}
      <div className="flex items-center gap-3">
        {/* 侧边栏切换按钮 */}
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label="切换侧边栏"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {sidebarOpen ? (
              // 关闭图标
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              // 菜单图标
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white font-bold">
            E
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            协同编辑器
          </h1>
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 分享按钮 */}
        <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          分享
        </button>

        {/* 用户头像 */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 hover:bg-primary-200">
          U
        </button>
      </div>
    </header>
  )
}

export default Header
