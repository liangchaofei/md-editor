import { useState } from 'react'
import Layout from './components/layout/Layout'
import EditorContainer from './components/editor/EditorContainer'
import DocumentTest from './components/DocumentTest'

function App() {
  // 添加一个开关来切换测试模式
  const [testMode, setTestMode] = useState(false)

  return (
    <div>
      {/* 测试模式切换按钮 */}
      <button
        onClick={() => setTestMode(!testMode)}
        className="fixed right-4 top-4 z-50 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white shadow-lg hover:bg-purple-600"
      >
        {testMode ? '返回编辑器' : '测试 API'}
      </button>

      {testMode ? (
        <DocumentTest />
      ) : (
        <Layout>
          <EditorContainer />
        </Layout>
      )}
    </div>
  )
}

export default App
