/**
 * 自动触发 Hook
 */

import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface UseAutoTriggerParams {
  initialPrompt?: string
  documentId: number
  editor: Editor | null
  isOpen: boolean
  input: string
  handleSend: () => void
}

export function useAutoTrigger({
  initialPrompt,
  documentId,
  editor,
  isOpen,
  input,
  handleSend,
}: UseAutoTriggerParams) {
  const processedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!initialPrompt) {
      console.log('🔍 没有 initialPrompt，跳过自动触发')
      return
    }
    
    const currentKey = `${documentId}-${initialPrompt}`
    
    console.log('🔍 自动触发检查:', {
      currentKey,
      processedKey: processedKeyRef.current,
      shouldTrigger: processedKeyRef.current !== currentKey
    })
    
    if (processedKeyRef.current === currentKey) {
      console.log('❌ 该 key 已处理过，跳过')
      return
    }
    
    processedKeyRef.current = currentKey
    console.log('✅ 标记 key 为已处理:', currentKey)
    
    const checkAndTrigger = () => {
      console.log('⏰ 检查触发条件:', {
        editor: !!editor,
        isOpen,
        input: !!input
      })
      
      if (editor && isOpen && input) {
        console.log('🚀 执行自动发送')
        handleSend()
      } else {
        console.log('⏳ 条件未满足，500ms 后重试')
        setTimeout(checkAndTrigger, 500)
      }
    }
    
    const timer = setTimeout(checkAndTrigger, 300)
    
    return () => clearTimeout(timer)
  }, [initialPrompt, documentId])
}
