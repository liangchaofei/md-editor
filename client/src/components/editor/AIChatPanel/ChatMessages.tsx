/**
 * 消息列表组件
 */

import { useRef, useEffect } from 'react'
import type { Message } from '../../../types/message'
import type { Outline, OutlineNode, GenerationMode } from '../../../types/outline'
import MessageItem from './MessageItem'
import OutlineView from '../OutlineView'

interface ChatMessagesProps {
  messages: Message[]
  outline: Outline | null
  outlineError: string | null
  generationMode: GenerationMode
  isGenerating: boolean
  onUpdateOutline: (id: string, updates: Partial<OutlineNode>) => void
  onAddSibling: (id: string) => void
  onAddChild: (id: string) => void
  onDeleteNode: (id: string) => void
  onMoveNode: (dragId: string, dropId: string, position: 'before' | 'after' | 'child') => void
  onToggleCollapse: (id: string) => void
  onGenerateDocument: () => void
}

export default function ChatMessages({
  messages,
  outline,
  outlineError,
  generationMode,
  isGenerating,
  onUpdateOutline,
  onAddSibling,
  onAddChild,
  onDeleteNode,
  onMoveNode,
  onToggleCollapse,
  onGenerateDocument,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {outline ? (
        <OutlineView
          outline={outline}
          onUpdate={onUpdateOutline}
          onAddSibling={onAddSibling}
          onAddChild={onAddChild}
          onDelete={onDeleteNode}
          onMove={onMoveNode}
          onToggleCollapse={onToggleCollapse}
          onGenerateDocument={onGenerateDocument}
          isGenerating={isGenerating}
          error={outlineError}
        />
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm text-gray-500">您好，有什么可以帮您？</p>
          <p className="text-xs text-gray-400 mt-2">
            {generationMode === 'outline' 
              ? '输入您的需求，AI 将生成文档大纲供您编辑'
              : '输入您的需求，AI 将帮助您创作内容'}
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  )
}
