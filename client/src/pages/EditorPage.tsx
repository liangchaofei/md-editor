/**
 * 编辑器页面组件
 * 包含侧边栏、编辑器和 AI 面板
 */

import { useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import EditorContainer from '../components/editor/EditorContainer'
import { useDocumentStore } from '../store/documentStore'

interface LocationState {
  initialPrompt?: string
  generationMode?: 'full' | 'outline'
  enableDeepThink?: boolean
}

function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { documents, currentDocument, setCurrentDocument, fetchDocuments } = useDocumentStore()
  
  // 获取从首页传递的状态
  const state = location.state as LocationState
  
  // 使用 ref 保存初始状态，防止在重新渲染时丢失
  const initialStateRef = useRef<LocationState | null>(null)
  
  // 只在第一次有 state 时保存
  useEffect(() => {
    if (state && !initialStateRef.current) {
      console.log('💾 保存初始状态:', state)
      initialStateRef.current = state
    }
  }, [state])
  
  // 使用保存的初始状态
  const initialState = initialStateRef.current
  
  // 调试日志
  console.log('📍 EditorPage 渲染:', {
    locationState: state,
    savedState: initialStateRef.current,
    finalState: initialState
  })

  // 获取文档列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 根据 URL 参数设置当前文档
  useEffect(() => {
    if (documentId) {
      const id = parseInt(documentId, 10)
      const doc = documents.find(d => d.id === id)
      if (doc) {
        setCurrentDocument(doc)
      }
    } else if (!currentDocument && documents.length > 0) {
      // 如果没有指定文档 ID，选择第一个文档
      const firstDoc = documents[0]
      setCurrentDocument(firstDoc)
      navigate(`/editor/${firstDoc.id}`, { replace: true })
    }
  }, [documentId, documents, currentDocument, setCurrentDocument, navigate])

  // 处理文档选择
  const handleDocumentSelect = (id: number) => {
    navigate(`/editor/${id}`)
  }

  return (
    <Layout onDocumentSelect={handleDocumentSelect}>
      <EditorContainer 
        initialPrompt={initialState?.initialPrompt}
        initialGenerationMode={initialState?.generationMode}
        initialEnableDeepThink={initialState?.enableDeepThink}
      />
    </Layout>
  )
}

export default EditorPage
