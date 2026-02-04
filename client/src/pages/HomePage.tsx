/**
 * 首页组件
 * AI 对话式写作界面
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../store/documentStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DEFAULT_MODEL } from '../utils/modelPreferences'

type GenerationMode = 'full' | 'outline'

function HomePage() {
  const navigate = useNavigate()
  const { documents, loading, fetchDocuments } = useDocumentStore()
  const [input, setInput] = useState('')
  const [generationMode, setGenerationMode] = useState<GenerationMode>('full')
  const [enableDeepThink, setEnableDeepThink] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)

  // 获取最近文档（最多显示 6 个）
  const recentDocuments = documents.slice(0, 6)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 开始创作
  const handleStartWriting = async () => {
    if (!input.trim()) return


    // 创建新文档并跳转到编辑器，同时传递初始提示词
    const { createDocument } = useDocumentStore.getState()
    const doc = await createDocument({
      title: input.substring(0, 50) || '无标题文档',
      content: '',
    })
    
    
    if (doc) {
      const navigationState = {
        initialPrompt: input,
        generationMode,
        enableDeepThink,
      }
      
   
      // 跳转到编辑器，并通过 state 传递初始提示词、模式和深度思考开关
      navigate(`/editor/${doc.id}`, {
        state: navigationState
      })
    }
  }

  // 打开文档
  const handleOpenDocument = (id: number) => {
    navigate(`/editor/${id}`)
  }

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

  // 按 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleStartWriting()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 顶部导航 */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-lg shadow-lg">
                E
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">智能写作助手</h1>
                <p className="text-xs text-gray-500">融合大模型能力，支持知识库学习</p>
              </div>
            </div>

            {/* 右侧按钮 */}
            <div className="flex items-center gap-2">
              {/* 我的文档按钮 */}
              <button
                onClick={() => setShowDocuments(!showDocuments)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                我的文档
              </button>

              {/* 用户头像 */}
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors">
                U
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="mx-auto w-full max-w-4xl px-4">
          {/* 欢迎标题 */}
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-4xl font-bold text-gray-900">
              Hi，我是<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">智能写作助手</span>
            </h2>
            <p className="text-base text-gray-600">
              融合大模型能力，支持知识库学习、全文搜索文献、对接智能体等功能，生成文档
            </p>
          </div>

          {/* 输入框区域 */}
          <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6 shadow-lg">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="您好，有什么可以帮您？"
              className="w-full resize-none border-0 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
              rows={4}
            />

            {/* 底部工具栏 */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              {/* 左侧：模式选择和深度思考 */}
              <div className="flex items-center gap-3">
                {/* 分步生成按钮 */}
                <button
                  onClick={() => setGenerationMode(generationMode === 'outline' ? 'full' : 'outline')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    generationMode === 'outline'
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                  title={generationMode === 'outline' ? '已启用分步生成' : '点击启用分步生成'}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  分步生成
                  {generationMode === 'outline' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* 深度思考开关 */}
                <button
                  onClick={() => setEnableDeepThink(!enableDeepThink)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    enableDeepThink
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                  title={enableDeepThink ? '已启用深度思考' : '点击启用深度思考'}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  深度思考
                  {enableDeepThink && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>

              {/* 右侧：附件和发送按钮 */}
              <div className="flex items-center gap-2">
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <button
                  onClick={handleStartWriting}
                  disabled={!input.trim()}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 提示文字 */}
          <p className="text-center text-sm text-gray-400">
            内容由AI生成，仅供参考
          </p>

          {/* 我的文档列表（可折叠） */}
          {showDocuments && recentDocuments.length > 0 && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">最近文档</h3>
                <button
                  onClick={() => navigate('/editor')}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  查看全部 →
                </button>
              </div>

              <div className="space-y-2">
                {recentDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleOpenDocument(doc.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="truncate text-sm font-medium text-gray-900">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {formatTime(doc.updated_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default HomePage
