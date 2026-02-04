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

      let result: { from: number; to: number } | null = null

      // 优先使用上下文定位（最精确）
      if (contextBefore || contextAfter) {
        result = findTextWithContext(
          docText,
          contextBefore || '',
          targetText,
          contextAfter || ''
        )
        
        if (result) {
        } else {
          console.log('❌ 上下文定位失败，尝试其他策略')
        }
      }

      // 如果上下文定位失败，回退到智能匹配
      if (!result) {
        const smartResult = smartFindText(docText, targetText)
        if (smartResult) {
          result = { from: smartResult.from, to: smartResult.to }
        } else {
          console.log('❌ 智能匹配失败')
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
      
      // 验证匹配的文本是否正确
      if (matchedText !== targetText) {
        
        // 检查是否匹配到了更多内容
        if (matchedText.includes(targetText)) {
          // 找到目标文本在匹配文本中的位置
          const targetIndex = matchedText.indexOf(targetText)
          if (targetIndex !== -1) {
            const adjustedFrom = from + targetIndex
            const adjustedTo = adjustedFrom + targetText.length
            
            
            // 验证调整后的文本
            const adjustedText = editor.state.doc.textBetween(adjustedFrom, adjustedTo, '\n')
            
            if (adjustedText === targetText) {
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
        // 简化方案：直接使用 state.doc.textBetween 来查找位置
        // 这样可以避免文本位置和文档位置的转换问题
        
        
        // 在整个文档中搜索匹配的文本
        let docFrom = -1
        let docTo = -1
        
        // 遍历文档的所有可能位置
        const docSize = editor.state.doc.content.size
        for (let pos = 0; pos < docSize - finalMatchedText.length; pos++) {
          try {
            const text = editor.state.doc.textBetween(pos, pos + finalMatchedText.length, '')
            if (text === finalMatchedText) {
              docFrom = pos
              docTo = pos + finalMatchedText.length
              break
            }
          } catch (e) {
            // 跳过无效位置
            continue
          }
        }
        
        if (docFrom === -1 || docTo === -1) {
          console.error('❌ 无法在文档中找到匹配位置')
          return {
            error: '无法在文档中定位文本',
            target: targetText,
            suggestion: null,
          }
        }
        
        // 验证找到的位置
        const verifyText = editor.state.doc.textBetween(docFrom, docTo, '')
        
        if (verifyText !== finalMatchedText) {
          console.error('❌ 验证失败')
          return {
            error: '位置验证失败',
            target: targetText,
            suggestion: null,
          }
        }
        
        // 1. 给原文添加删除线
        editor
          .chain()
          .focus()
          .setTextSelection({ from: docFrom, to: docTo })
          .toggleStrike()  // 添加删除线
          .run()
        
        // 2. 在原文后插入空格
        editor
          .chain()
          .focus()
          .setTextSelection(docTo)
          .insertContent(' ')  // 插入空格分隔
          .run()
        
        // 如果不是流式输出，直接插入完整文本
        if (!isStreaming) {
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

        
        // 存储文档位置
        suggestion.from = docFrom
        suggestion.to = docTo
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


      // 在原文后面（空格之后）追加字符
      const currentLength = suggestion.replacement.length
      const insertPos = suggestion.to + 1 + currentLength
      
      
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

    
      // 策略：使用 deleteRange + insertContentAt 一次性完成替换
      // 注意：suggestion.from 和 suggestion.to 已经是文档位置（不是文本位置）
      
      // 计算完整范围：原文 + 空格 + 新文本
      // 原文：from -> to
      // 空格：to -> to+1
      // 新文本：to+1 -> to+1+replacement.length
      const spacePos = suggestion.to
      const newTextStart = spacePos + 1
      const newTextEnd = newTextStart + suggestion.replacement.length
      
   
      // 验证当前内容
      const currentContent = editor.state.doc.textBetween(suggestion.from, newTextEnd, '\n')
      
      // 一次性替换整个范围（原文 + 空格 + 新文本）为纯文本
      editor
        .chain()
        .focus()
        .deleteRange({ from: suggestion.from, to: newTextEnd })
        .insertContentAt(suggestion.from, suggestion.replacement)
        .run()
      

      // 移除 suggestion 标记
      editor.commands.removeSuggestion(id)

      // 更新状态
      const updatedSuggestions = suggestionsRef.current.map(s =>
        s.id === id ? { ...s, status: 'accepted' as const } : s
      )
      updateSuggestions(updatedSuggestions)
      

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
      // 空格位置：suggestion.to
      // 新文本结束：suggestion.to + 1 + replacement.length
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
