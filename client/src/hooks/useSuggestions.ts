/**
 * useSuggestions Hook
 * 管理 AI 修改建议的状态和操作
 */

import { useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import type { SuggestedChange } from '../types/suggestion'
import { findTextWithContext, smartFindText } from '../utils/textMatcher'

export function useSuggestions(editor: Editor | null) {
  const [suggestions, setSuggestions] = useState<SuggestedChange[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 使用 ref 来跟踪当前的 suggestions，避免闭包问题
  const suggestionsRef = useRef<SuggestedChange[]>([])
  
  // 同步 ref
  const updateSuggestions = useCallback((newSuggestions: SuggestedChange[]) => {
    suggestionsRef.current = newSuggestions
    setSuggestions(newSuggestions)
  }, [])

  /**
   * 添加修改建议（使用上下文定位）
   */
  const addSuggestion = useCallback(
    (
      targetText: string,
      replacement: string,
      description?: string,
      contextBefore?: string,
      contextAfter?: string,
      isStreaming?: boolean  // 新增：是否流式输出
    ) => {
      if (!editor) {
        console.error('❌ 编辑器未初始化')
        return null
      }

      // 使用 getText() 而不是 textContent，确保一致性
      const docText = editor.getText()
      console.log('📄 文档长度:', docText.length)
      console.log('🎯 要查找的目标文本:', `"${targetText}"`)
      console.log('📏 目标文本长度:', targetText.length)

      let result: { from: number; to: number } | null = null

      // 如果有上下文，使用上下文定位（更精确）
      if (contextBefore || contextAfter) {
        console.log('🎯 使用上下文定位')
        result = findTextWithContext(
          docText,
          contextBefore || '',
          targetText,
          contextAfter || ''
        )
      }

      // 如果上下文定位失败，回退到智能匹配
      if (!result) {
        console.log('🔄 回退到智能匹配')
        const smartResult = smartFindText(docText, targetText)
        if (smartResult) {
          result = { from: smartResult.from, to: smartResult.to }
        }
      }

      if (!result) {
        console.error('❌ 无法在文档中找到匹配文本')
        console.error('目标文本:', targetText)
        console.error('文档内容（前200字符）:', docText.substring(0, 200))

        return {
          error: '无法定位到目标文本',
          target: targetText,
          suggestion: null,
        }
      }

      const { from, to } = result
      console.log('✅ 找到位置:', { from, to })

      // 验证位置是否有效
      const docSize = editor.getText().length
      if (from < 0 || to > docSize) {
        console.error('❌ 位置超出文档范围:', { position: { from, to }, docSize })
        return {
          error: '位置超出文档范围',
          target: targetText,
          suggestion: null,
        }
      }

      // 使用 getText() 提取匹配的文本，确保一致性
      const matchedText = docText.substring(from, to)
      console.log('📝 匹配的文本:', `"${matchedText}"`)
      console.log('🎯 目标文本:', `"${targetText}"`)
      console.log('📏 匹配长度:', matchedText.length, '目标长度:', targetText.length)
      
      // 验证匹配的文本是否正确
      if (matchedText !== targetText) {
        console.warn('⚠️ 匹配的文本与目标文本不一致，尝试修正...')
        
        // 检查是否匹配到了更多内容
        if (matchedText.includes(targetText)) {
          // 找到目标文本在匹配文本中的位置
          const targetIndex = matchedText.indexOf(targetText)
          if (targetIndex !== -1) {
            const adjustedFrom = from + targetIndex
            const adjustedTo = adjustedFrom + targetText.length
            
            console.log('🔧 调整位置:', { 原始: { from, to }, 调整后: { from: adjustedFrom, to: adjustedTo } })
            
            // 验证调整后的文本
            const adjustedText = editor.state.doc.textBetween(adjustedFrom, adjustedTo, '\n')
            console.log('📝 调整后的文本:', `"${adjustedText}"`)
            
            if (adjustedText === targetText) {
              console.log('✅ 位置调整成功')
              result.from = adjustedFrom
              result.to = adjustedTo
            }
          }
        }
      }

      const id = `suggestion-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      
      // 使用调整后的位置
      const finalFrom = result.from
      const finalTo = result.to
      const finalMatchedText = docText.substring(finalFrom, finalTo)
      
      console.log('📍 最终位置:', { from: finalFrom, to: finalTo })
      console.log('📝 最终匹配文本:', `"${finalMatchedText}"`)
      console.log('🌊 流式模式:', isStreaming)

      const suggestion: SuggestedChange = {
        id,
        target: finalMatchedText,
        replacement,
        description,
        from: finalFrom,
        to: finalTo,
        status: 'pending',
      }

      // 添加到状态
      updateSuggestions([...suggestionsRef.current, suggestion])

      // 在编辑器中标记 - 使用 diff 展示方式
      try {
        // 1. 给原文添加删除线
        editor
          .chain()
          .focus()
          .setTextSelection({ from: result.from, to: result.to })
          .toggleStrike()  // 添加删除线
          .run()
        
        // 2. 在原文后插入空格
        const insertPos = result.to
        editor
          .chain()
          .focus()
          .setTextSelection(insertPos)
          .insertContent(' ')  // 插入空格分隔
          .run()
        
        // 如果不是流式输出，直接插入完整文本
        if (!isStreaming) {
          console.log('📝 非流式模式，直接插入完整文本')
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'text',
              text: replacement,
              marks: [
                { type: 'highlight', attrs: { color: '#86efac' } },  // 绿色高亮
                { type: 'suggestion', attrs: { id, replacement, description } }
              ]
            })
            .run()
        } else {
          console.log('🌊 流式模式，等待流式输出')
        }

        console.log('✅ 成功添加 diff 标记')
      } catch (error) {
        console.error('❌ 添加 diff 标记失败:', error)
        return {
          error: '添加标记失败',
          target: targetText,
          suggestion: null,
        }
      }

      return { error: null, suggestion }
    },
    [editor, updateSuggestions]
  )

  /**
   * 流式更新新文本
   */
  const streamReplacementText = useCallback(
    (id: string, char: string) => {
      if (!editor) {
        console.error('❌ streamReplacementText: 编辑器未初始化')
        return
      }

      const suggestion = suggestionsRef.current.find(s => s.id === id)
      if (!suggestion) {
        console.error('❌ streamReplacementText: 找不到建议', id)
        console.error('当前 suggestions:', suggestionsRef.current.map(s => s.id))
        return
      }

      console.log('🌊 流式追加字符:', char, '当前 replacement 长度:', suggestion.replacement.length)

      // 在原文后面（空格之后）追加字符
      const currentLength = suggestion.replacement.length
      const insertPos = suggestion.to + 1 + currentLength
      
      console.log('📍 插入位置:', insertPos, '= suggestion.to(', suggestion.to, ') + 1 + currentLength(', currentLength, ')')
      
      try {
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'text',
            text: char,
            marks: [
              { type: 'highlight', attrs: { color: '#86efac' } },  // 绿色高亮
              { type: 'suggestion', attrs: { id, replacement: suggestion.replacement + char, description: suggestion.description } }
            ]
          })
          .run()

        // 更新 suggestion 的 replacement
        const updatedSuggestions = suggestionsRef.current.map(s => 
          s.id === id ? { ...s, replacement: s.replacement + char } : s
        )
        updateSuggestions(updatedSuggestions)
        
        console.log('✅ 字符追加成功，新长度:', suggestion.replacement.length + 1)
      } catch (error) {
        console.error('❌ 追加字符失败:', error)
      }
    },
    [editor, updateSuggestions]
  )

  /**
   * 接受修改建议（diff 模式）
   */
  const acceptSuggestion = useCallback(
    (id: string) => {
      if (!editor) return

      const suggestion = suggestionsRef.current.find(s => s.id === id)
      if (!suggestion) return

      console.log('🎯 接受建议:', suggestion)
      console.log('  - 原文位置:', { from: suggestion.from, to: suggestion.to })
      console.log('  - 原文内容:', suggestion.target)
      console.log('  - 新文本:', suggestion.replacement)

      // 策略：使用 replaceRange 一次性完成替换
      // 1. 计算完整范围：从原文开始到新文本结束（包括空格）
      // 2. 直接替换为新文本（不带任何标记）
      
      const spacePos = suggestion.to
      const newTextStart = spacePos + 1
      const newTextEnd = newTextStart + suggestion.replacement.length
      
      console.log('  - 完整范围:', { from: suggestion.from, to: newTextEnd })
      console.log('  - 将替换为:', suggestion.replacement)
      
      // 一次性替换整个范围（原文 + 空格 + 新文本）为纯文本
      editor
        .chain()
        .focus()
        .deleteRange({ from: suggestion.from, to: newTextEnd })
        .insertContentAt(suggestion.from, suggestion.replacement)
        .run()
      
      console.log('  - 已完成替换')

      // 移除 suggestion 标记
      editor.commands.removeSuggestion(id)

      // 更新状态
      const updatedSuggestions = suggestionsRef.current.map(s =>
        s.id === id ? { ...s, status: 'accepted' as const } : s
      )
      updateSuggestions(updatedSuggestions)
      
      console.log('✅ 接受建议完成')
    },
    [editor, updateSuggestions]
  )

  /**
   * 拒绝修改建议（diff 模式）
   */
  const rejectSuggestion = useCallback(
    (id: string) => {
      if (!editor) return

      const suggestion = suggestionsRef.current.find(s => s.id === id)
      if (!suggestion) return

      // 1. 移除原文的删除线
      editor
        .chain()
        .focus()
        .setTextSelection({ from: suggestion.from, to: suggestion.to })
        .toggleStrike()  // 移除删除线
        .run()
      
      // 2. 删除新文本（包括前面的空格）
      const newTextStart = suggestion.to  // 空格的位置
      const newTextEnd = newTextStart + 1 + suggestion.replacement.length  // +1 是空格
      
      editor
        .chain()
        .focus()
        .setTextSelection({ from: newTextStart, to: newTextEnd })
        .deleteSelection()
        .run()

      // 移除标记
      editor.commands.removeSuggestion(id)

      // 更新状态
      const updatedSuggestions = suggestionsRef.current.map(s =>
        s.id === id ? { ...s, status: 'rejected' as const } : s
      )
      updateSuggestions(updatedSuggestions)
    },
    [editor, updateSuggestions]
  )

  /**
   * 清除所有建议
   */
  const clearSuggestions = useCallback(() => {
    if (!editor) return

    suggestionsRef.current.forEach(s => {
      editor.commands.removeSuggestion(s.id)
    })

    updateSuggestions([])
  }, [editor, updateSuggestions])

  /**
   * 批量添加建议
   */
  const addSuggestions = useCallback(
    (
      changes: Array<{
        targetText: string
        replacement: string
        description?: string
        contextBefore?: string
        contextAfter?: string
        isStreaming?: boolean
      }>
    ) => {
      setIsProcessing(true)

      const newSuggestions: SuggestedChange[] = []
      const errors: Array<{ target: string; error: string }> = []

      changes.forEach((change) => {
        const result = addSuggestion(
          change.targetText,
          change.replacement,
          change.description,
          change.contextBefore,
          change.contextAfter,
          change.isStreaming
        )
        if (result) {
          if (result.error) {
            errors.push({ target: change.targetText, error: result.error })
          } else if (result.suggestion) {
            newSuggestions.push(result.suggestion)
          }
        }
      })

      setIsProcessing(false)

      // 返回结果和错误信息
      return {
        suggestions: newSuggestions,
        errors,
        success: errors.length === 0,
      }
    },
    [addSuggestion]
  )

  return {
    suggestions,
    isProcessing,
    addSuggestion,
    addSuggestions,
    streamReplacementText,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
  }
}
