/**
 * 顶部导航栏组件
 */

import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../../store/documentStore'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate()
  const { createDocument } = useDocumentStore()

  // 创建新文档
  const handleCreateDocument = async () => {
    const doc = await createDocument({
      title: '无标题文档',
      content: '',
    })
    if (doc) {
      navigate(`/editor/${doc.id}`)
    }
  }

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

        {/* Logo - 点击返回首页 */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold">
            E
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            协同编辑器
          </h1>
        </button>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 新建文档按钮 */}
        <button
          onClick={handleCreateDocument}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建文档
        </button>

        {/* 分享按钮 */}
        <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          分享
        </button>

        {/* 用户头像 */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-700 hover:bg-purple-200">
          U
        </button>
      </div>
    </header>
  )
}

export default Header
