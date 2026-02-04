/**
 * 文本匹配工具
 * 用于在文档中查找 AI 建议的目标文本位置
 */

/**
 * 在文档中查找目标文本的位置
 * @param docText 完整文档文本
 * @param target 要查找的目标文本
 * @returns 找到的位置 { from, to } 或 null
 */
export function findTextPosition(
  docText: string,
  target: string
): { from: number; to: number } | null {

  // 规范化文本：去除多余空格，统一换行
  const normalizeText = (text: string) => {
    return text
      .replace(/\s+/g, ' ') // 多个空格替换为单个空格
      .replace(/\n+/g, '\n') // 多个换行替换为单个换行
      .trim()
  }

  const normalizedDoc = normalizeText(docText)
  const normalizedTarget = normalizeText(target)


  // 1. 尝试精确匹配
  let index = docText.indexOf(target)
  if (index !== -1) {
   
    console.groupEnd()
    return {
      from: index,
      to: index + target.length,
    }
  }

  // 2. 尝试规范化后匹配（在原文档中查找规范化的目标）
  index = docText.indexOf(normalizedTarget)
  if (index !== -1) {
   
    return {
      from: index,
      to: index + normalizedTarget.length,
    }
  }

  // 3. 尝试在规范化文档中查找规范化目标
  index = normalizedDoc.indexOf(normalizedTarget)
  if (index !== -1) {
    
    // 需要映射回原始文档的位置
    // 简单策略：在原文档中查找相似的文本
    const result = findSimilarText(docText, normalizedTarget, 0.8)
    if (result) {
      return {
        from: result.from,
        to: result.to,
      }
    }
  }

  // 4. 尝试部分匹配（去掉标点符号）
  const removePunctuation = (text: string) => {
    return text
      .replace(/[，。！？、；：""''（）《》【】\s]/g, '') // 移除标点和空格
  }

  const docNoPunc = removePunctuation(docText)
  const targetNoPunc = removePunctuation(target)


  index = docNoPunc.indexOf(targetNoPunc)
  if (index !== -1) {
    
    // 映射回原文档位置（需要考虑标点符号）
    let originalIndex = 0
    let noPuncIndex = 0
    
    while (noPuncIndex < index && originalIndex < docText.length) {
      if (!/[，。！？、；：""''（）《》【】\s]/.test(docText[originalIndex])) {
        noPuncIndex++
      }
      originalIndex++
    }
    
    const from = originalIndex
    let to = from
    let matched = 0
    
    while (matched < targetNoPunc.length && to < docText.length) {
      if (!/[，。！？、；：""''（）《》【】\s]/.test(docText[to])) {
        matched++
      }
      to++
    }
    
    console.groupEnd()
    return { from, to }
  }

  // 5. 尝试模糊匹配（使用相似度）
  const result = findSimilarText(docText, target, 0.6)
  if (result) {
   
    return {
      from: result.from,
      to: result.to,
    }
  }

  
  return null
}

/**
 * 计算两个字符串的相似度（Levenshtein 距离）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度 0-1，1 表示完全相同
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0

  const matrix: number[][] = []

  // 初始化矩阵
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // 计算编辑距离
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 删除
        matrix[i][j - 1] + 1, // 插入
        matrix[i - 1][j - 1] + cost // 替换
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return 1 - distance / maxLen
}

/**
 * 在文档中查找最相似的文本片段
 * @param docText 完整文档文本
 * @param target 要查找的目标文本
 * @param threshold 相似度阈值（0-1）
 * @returns 找到的位置和相似度，或 null
 */
export function findSimilarText(
  docText: string,
  target: string,
  threshold: number = 0.8
): { from: number; to: number; similarity: number } | null {
  const targetLen = target.length
  let bestMatch: { from: number; to: number; similarity: number } | null = null

  // 滑动窗口查找（优化：每次移动多个字符以提高性能）
  const step = Math.max(1, Math.floor(targetLen / 10))
  
  for (let i = 0; i <= docText.length - targetLen; i += step) {
    const slice = docText.slice(i, i + targetLen)
    const similarity = calculateSimilarity(slice, target)

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          from: i,
          to: i + targetLen,
          similarity,
        }
      }
      
      // 如果找到非常高的相似度，提前返回
      if (similarity > 0.95) {
        break
      }
    }
  }
  
  // 如果找到了较好的匹配，在其附近精确搜索
  if (bestMatch && bestMatch.similarity < 0.95) {
    const searchStart = Math.max(0, bestMatch.from - targetLen)
    const searchEnd = Math.min(docText.length - targetLen, bestMatch.from + targetLen)
    
    for (let i = searchStart; i <= searchEnd; i++) {
      const slice = docText.slice(i, i + targetLen)
      const similarity = calculateSimilarity(slice, target)
      
      if (similarity > bestMatch.similarity) {
        bestMatch = {
          from: i,
          to: i + targetLen,
          similarity,
        }
      }
    }
  }

  return bestMatch
}

/**
 * 可视化两个字符串的差异（用于调试）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 差异描述
 */
export function visualizeDifference(str1: string, str2: string): string {
  const maxLen = Math.min(str1.length, str2.length, 100)
  const differences: string[] = []
  
  for (let i = 0; i < maxLen; i++) {
    if (str1[i] !== str2[i]) {
      differences.push(
        `位置 ${i}: "${str1[i]}" (${str1.charCodeAt(i)}) vs "${str2[i]}" (${str2.charCodeAt(i)})`
      )
    }
  }
  
  if (str1.length !== str2.length) {
    differences.push(`长度不同: ${str1.length} vs ${str2.length}`)
  }
  
  return differences.length > 0 
    ? differences.slice(0, 5).join('\n') + (differences.length > 5 ? '\n...' : '')
    : '无差异'
}


/**
 * 智能查找文本位置
 * 使用关键词模糊匹配
 */
export function smartFindText(
  docText: string,
  keywords: string
): { from: number; to: number; matchedText: string } | null {

  
  // 1. 尝试直接查找关键词
  let index = docText.indexOf(keywords)
  if (index !== -1) {
    // 找到了，尝试扩展到完整的行或段落
    let from = index
    let to = index + keywords.length
    
    // 向前扩展到行首
    while (from > 0 && docText[from - 1] !== '\n') {
      from--
    }
    
    // 向后扩展到行尾
    while (to < docText.length && docText[to] !== '\n') {
      to++
    }
    
    const matchedText = docText.substring(from, to)
   
    
    return { from, to, matchedText }
  }
  
  // 2. 尝试规范化后查找
  const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()
  const normalizedDoc = normalizeText(docText)
  const normalizedKeywords = normalizeText(keywords)
  
  index = normalizedDoc.indexOf(normalizedKeywords)
  if (index !== -1) {
    // 映射回原文档位置（简化处理）
    const result = findTextPosition(docText, keywords)
    console.groupEnd()
    return result ? { ...result, matchedText: docText.substring(result.from, result.to) } : null
  }
  
  // 3. 尝试分词匹配（查找包含所有关键词的段落）
  const keywordList = keywords.split(/\s+/).filter(k => k.length > 1)
  const paragraphs = docText.split('\n\n')
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i]
    const matchCount = keywordList.filter(k => paragraph.includes(k)).length
    
    if (matchCount >= keywordList.length * 0.7) {
      // 至少匹配70%的关键词
      const from = docText.indexOf(paragraph)
      const to = from + paragraph.length
   
      
      return { from, to, matchedText: paragraph }
    }
  }
  
  console.error('❌ 所有匹配策略均失败')
  console.groupEnd()
  return null
}


/**
 * 使用上下文精确定位文本
 * 通过前后文唯一确定位置
 */
export function findTextWithContext(
  docText: string,
  contextBefore: string,
  targetText: string,
  contextAfter: string
): { from: number; to: number } | null {
  
  
  // 构建完整的搜索模式
  const fullPattern = contextBefore + targetText + contextAfter
  
  // 1. 尝试精确匹配完整模式
  let index = docText.indexOf(fullPattern)
  if (index !== -1) {
    const from = index + contextBefore.length
    const to = from + targetText.length
    

    
    return { from, to }
  }
  
  // 2. 尝试只用前文定位
  if (contextBefore) {
    index = docText.indexOf(contextBefore)
    if (index !== -1) {
      const targetStart = index + contextBefore.length
      const targetEnd = targetStart + targetText.length
      const actualTarget = docText.substring(targetStart, targetEnd)
      
      // 验证目标文本是否匹配
      if (actualTarget === targetText || actualTarget.trim() === targetText.trim()) {
    
        return { from: targetStart, to: targetEnd }
      }
    }
  }
  
  // 3. 尝试只用后文定位
  if (contextAfter) {
    index = docText.indexOf(contextAfter)
    if (index !== -1) {
      const targetEnd = index
      const targetStart = targetEnd - targetText.length
      
      if (targetStart >= 0) {
        const actualTarget = docText.substring(targetStart, targetEnd)
        
        if (actualTarget === targetText || actualTarget.trim() === targetText.trim()) {
          return { from: targetStart, to: targetEnd }
        }
      }
    }
  }
  
  // 4. 尝试直接查找目标文本（最简单的方式）
  index = docText.indexOf(targetText)
  if (index !== -1) {
    return { from: index, to: index + targetText.length }
  }
  
  // 5. 尝试规范化匹配
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
  const normalizedDoc = normalize(docText)
  const normalizedPattern = normalize(fullPattern)
  
  index = normalizedDoc.indexOf(normalizedPattern)
  if (index !== -1) {
    // 简化处理：使用原始查找
    const result = findTextPosition(docText, targetText)
    console.groupEnd()
    return result
  }
  
  console.error('❌ 所有定位策略均失败')
  console.groupEnd()
  return null
}
