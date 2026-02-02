/**
 * useInlineAI Hook
 * 管理内联 AI 菜单的状态和操作
 */

import { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { executeAICommand } from '../api/ai'

export function useInlineAI(editor: Editor | null) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  /**
   * 打开内联菜单
   */
  const openMenu = useCallback(() => {
    if (!editor) return

    // 获取光标位置
    const { from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)

    // 计算菜单位置（光标下方）
    setMenuPosition({
      top: coords.bottom + window.scrollY + 8,
      left: coords.left + window.scrollX,
    })
    setIsMenuOpen(true)
  }, [editor])

  /**
   * 关闭内联菜单
   */
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    setMenuPosition(null)
  }, [])

  /**
   * 执行 AI 指令
   */
  const executeCommand = useCallback(
    async (commandId: string, customInput?: string) => {
      if (!editor) return

      setIsGenerating(true)
      closeMenu()

      try {
        // 提取上下文
        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to, '\n')
        
        // 获取光标前后的文本
        const beforeText = editor.state.doc.textBetween(Math.max(0, from - 500), from, '\n')
        const afterText = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 500), '\n')

        // 构建上下文
        const context = {
          selectedText,
          beforeText,
          afterText,
        }

        // 根据指令类型确定操作
        let type = commandId
        let userInput = customInput

        // 映射指令 ID 到 API 类型
        const commandMap: Record<string, string> = {
          polish: 'rewrite',
          continue: 'continue',
          expand: 'expand',
          summarize: 'summarize',
          formal: 'rewrite',
          casual: 'rewrite',
          academic: 'rewrite',
          official: 'rewrite',
          spoken: 'rewrite',
          custom: 'rewrite',
        }

        type = commandMap[commandId] || 'rewrite'

        // 为特定指令添加提示词
        if (!userInput) {
          const promptMap: Record<string, string> = {
            polish: '请润色以下文本，使其更加流畅、准确、优雅',
            formal: '请将以下文本转换为正式、专业的语气',
            casual: '请将以下文本转换为轻松、活泼的语气',
            academic: '请将以下文本转换为学术、严谨的风格',
            official: '请将以下文本转换为党政公文风格',
            spoken: '请将以下文本转换为口语化的表达',
          }
          userInput = promptMap[commandId]
        }

        // 记录插入位置（用于高亮）
        const insertFrom = selectedText ? from : to

        // 调用 AI API
        let generatedContent = ''
        let isFirstChunk = true

        await executeAICommand({
          type,
          context,
          userInput,
          onChunk: (chunk) => {
            generatedContent += chunk
            
            // 实时更新编辑器内容
            if (isFirstChunk) {
              // 第一次：删除选中内容（如果有）并插入
              if (selectedText) {
                editor.chain()
                  .focus()
                  .deleteRange({ from, to })
                  .insertContentAt(from, chunk)
                  .run()
              } else {
                editor.chain()
                  .focus()
                  .insertContentAt(insertFrom, chunk)
                  .run()
              }
              isFirstChunk = false
            } else {
              // 后续：追加内容
              const currentPos = insertFrom + generatedContent.length - chunk.length
              editor.chain()
                .focus()
                .insertContentAt(currentPos + chunk.length, chunk)
                .run()
            }
          },
          onComplete: () => {
            // 高亮新生成的内容
            const insertTo = insertFrom + generatedContent.length
            editor.chain()
              .focus()
              .setTextSelection({ from: insertFrom, to: insertTo })
              .setHighlight({ color: '#fef08a' })  // 黄色高亮
              .setTextSelection(insertTo)  // 移动光标到末尾
              .run()

            setIsGenerating(false)
          },
          onError: (error) => {
            console.error('AI 指令执行失败:', error)
            setIsGenerating(false)
          },
        })
      } catch (error) {
        console.error('执行 AI 指令失败:', error)
        setIsGenerating(false)
      }
    },
    [editor, closeMenu]
  )

  return {
    isMenuOpen,
    menuPosition,
    isGenerating,
    openMenu,
    closeMenu,
    executeCommand,
  }
}
