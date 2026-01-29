/**
 * 主布局组件
 * 三栏布局：Header + Sidebar + Main
 */

import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
  onDocumentSelect?: (id: number) => void
}

function Layout({ children, onDocumentSelect }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          onDocumentSelect={onDocumentSelect}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Editor Area */}
        <main className="flex-1 overflow-auto relative">
          {/* 展开侧边栏按钮（仅在侧边栏收起时显示） */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 top-20 z-10 flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
              title="展开侧边栏"
            >
              <svg
                className="h-5 w-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
