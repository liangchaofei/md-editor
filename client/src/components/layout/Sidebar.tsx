/**
 * 左侧边栏组件
 * 显示文档列表
 */

import React from 'react'

interface SidebarProps {
  isOpen: boolean
}

function Sidebar({ isOpen }: SidebarProps) {
  if (!isOpen) {
    return null
  }

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* 顶部：新建按钮和搜索 */}
      <div className="border-b border-gray-200 p-4">
        {/* 新建文档按钮 */}
        <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
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

      {/* 文档分组 */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* 全部文档 */}
        <div className="mb-4">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">
            全部文档
          </h3>
          <div className="space-y-1">
            {/* 文档项占位 */}
            <DocumentItem
              title="产品需求文档"
              time="2 小时前"
              active={true}
            />
            <DocumentItem title="技术方案" time="昨天" />
            <DocumentItem title="会议记录" time="3 天前" />
          </div>
        </div>

        {/* 最近编辑 */}
        <div className="mb-4">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">
            最近编辑
          </h3>
          <div className="space-y-1">
            <DocumentItem title="项目计划" time="1 周前" />
            <DocumentItem title="设计稿" time="2 周前" />
          </div>
        </div>
      </div>
    </aside>
  )
}

// 文档项组件
interface DocumentItemProps {
  title: string
  time: string
  active?: boolean
}

function DocumentItem({ title, time, active = false }: DocumentItemProps) {
  return (
    <button
      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
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

        {/* 文档标题 */}
        <span className="truncate font-medium">{title}</span>
      </div>

      {/* 时间 */}
      <span className="ml-2 flex-shrink-0 text-xs text-gray-500">
        {time}
      </span>

      {/* 更多操作按钮（悬停显示） */}
      <button
        className="ml-2 hidden rounded p-1 hover:bg-gray-200 group-hover:block"
        onClick={e => {
          e.stopPropagation()
          // TODO: 显示菜单
        }}
      >
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>
    </button>
  )
}

export default Sidebar
