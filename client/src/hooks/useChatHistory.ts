/**
 * useChatHistory Hook
 * 管理 AI 对话历史的持久化
 */

import { useState, useEffect, useCallback } from 'react'
import type { Message } from '../types/message'

const STORAGE_KEY_PREFIX = 'ai-chat-history-'

export function useChatHistory(documentId: number) {
  const [messages, setMessages] = useState<Message[]>([])
  const storageKey = `${STORAGE_KEY_PREFIX}${documentId}`

  // 从 localStorage 加载历史
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Message[]
        // 清理未完成的流式状态
        const cleaned = parsed.map(msg => {
          if (msg.isStreaming) {
            // 如果消息还在流式状态，标记为已完成
            return {
              ...msg,
              isStreaming: false,
              isGeneratingToEditor: false,
              content: msg.content || '（生成被中断）'
            }
          }
          return msg
        })
        setMessages(cleaned)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('加载对话历史失败:', error)
      setMessages([])
    }
  }, [storageKey])

  // 保存到 localStorage
  const saveMessages = useCallback((newMessages: Message[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMessages))
      setMessages(newMessages)
    } catch (error) {
      console.error('保存对话历史失败:', error)
    }
  }, [storageKey])

  // 添加消息
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev, message]
      saveMessages(newMessages)
      return newMessages
    })
  }, [saveMessages])

  // 更新最后一条消息
  const updateLastMessage = useCallback((updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const newMessages = [...prev]
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = updater(newMessages[newMessages.length - 1])
      }
      saveMessages(newMessages)
      return newMessages
    })
  }, [saveMessages])

  // 清空历史
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setMessages([])
    } catch (error) {
      console.error('清空对话历史失败:', error)
    }
  }, [storageKey])

  return {
    messages,
    addMessage,
    updateLastMessage,
    clearHistory,
    setMessages: saveMessages,
  }
}
