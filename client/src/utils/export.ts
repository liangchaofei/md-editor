/**
 * 文档导出工具函数
 */

import type { Editor } from '@tiptap/core'
import { MarkdownSerializer } from 'prosemirror-markdown'

/**
 * 自定义 Markdown 序列化器
 * 支持 Tiptap 的所有节点类型
 */
const customMarkdownSerializer = new MarkdownSerializer(
  {
    // 节点序列化规则
    blockquote(state, node) {
      state.wrapBlock('> ', null, node, () => state.renderContent(node))
    },
    codeBlock(state, node) {
      state.write('```' + (node.attrs.language || '') + '\n')
      state.text(node.textContent, false)
      state.ensureNewLine()
      state.write('```')
      state.closeBlock(node)
    },
    heading(state, node) {
      state.write(state.repeat('#', node.attrs.level) + ' ')
      state.renderInline(node)
      state.closeBlock(node)
    },
    horizontalRule(state, node) {
      state.write(node.attrs.markup || '---')
      state.closeBlock(node)
    },
    bulletList(state, node) {
      state.renderList(node, '  ', () => (node.attrs.bullet || '*') + ' ')
    },
    orderedList(state, node) {
      const start = node.attrs.start || 1
      const maxW = String(start + node.childCount - 1).length
      const space = state.repeat(' ', maxW + 2)
      state.renderList(node, space, (i) => {
        const nStr = String(start + i)
        return state.repeat(' ', maxW - nStr.length) + nStr + '. '
      })
    },
    listItem(state, node) {
      state.renderContent(node)
    },
    paragraph(state, node) {
      state.renderInline(node)
      state.closeBlock(node)
    },
    image(state, node) {
      state.write(
        '![' +
          state.esc(node.attrs.alt || '') +
          '](' +
          state.esc(node.attrs.src) +
          (node.attrs.title ? ' "' + state.esc(node.attrs.title) + '"' : '') +
          ')'
      )
    },
    hardBreak(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++) {
        if (parent.child(i).type !== node.type) {
          state.write('\\\n')
          return
        }
      }
    },
    text(state, node) {
      state.text(node.text || '')
    },
  },
  {
    // 标记序列化规则
    em: { open: '*', close: '*', mixable: true, expelEnclosingWhitespace: true },
    strong: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
    link: {
      open(_state, _mark, _parent, _index) {
        return '['
      },
      close(state, mark, _parent, _index) {
        return '](' + state.esc(mark.attrs.href) + (mark.attrs.title ? ' "' + state.esc(mark.attrs.title) + '"' : '') + ')'
      },
    },
    code: { open: '`', close: '`', escape: false },
    strike: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
  }
)

/**
 * 导出为 Markdown
 */
export function exportAsMarkdown(editor: Editor, filename: string = 'document.md') {
  // 获取 ProseMirror 文档
  const doc = editor.state.doc
  
  // 序列化为 Markdown
  const markdown = customMarkdownSerializer.serialize(doc)
  
  // 下载文件
  downloadFile(markdown, filename, 'text/markdown')
}

/**
 * 导出为 HTML
 */
export function exportAsHTML(editor: Editor, filename: string = 'document.html') {
  // 获取 HTML 内容
  const content = editor.getHTML()
  
  // 创建完整的 HTML 文档
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename.replace('.html', '')}</title>
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    code {
      background-color: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: monospace;
    }
    pre {
      background-color: #f5f5f5;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`
  
  // 下载文件
  downloadFile(html, filename, 'text/html')
}

/**
 * 导出为纯文本
 */
export function exportAsText(editor: Editor, filename: string = 'document.txt') {
  // 获取纯文本内容
  const text = editor.getText()
  
  // 下载文件
  downloadFile(text, filename, 'text/plain')
}

/**
 * 复制为富文本
 */
export async function copyAsRichText(editor: Editor): Promise<boolean> {
  try {
    const html = editor.getHTML()
    const text = editor.getText()
    
    // 尝试使用 Clipboard API
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })
      await navigator.clipboard.write([clipboardItem])
      return true
    }
    
    // 降级方案：只复制纯文本
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

/**
 * 复制为纯文本
 */
export async function copyAsText(editor: Editor): Promise<boolean> {
  const text = editor.getText()
  
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    
    // 降级方案：使用 execCommand
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch (e) {
      return false
    }
  }
}

/**
 * 打印文档
 */
export function printDocument(editor: Editor) {
  // 创建打印窗口
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器设置')
    return
  }
  
  const content = editor.getHTML()
  
  // 写入打印内容
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>打印文档</title>
      <style>
        body {
          max-width: 800px;
          margin: 0 auto;
          padding: 2cm;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          page-break-after: avoid;
        }
        code {
          background-color: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
        }
        pre {
          background-color: #f5f5f5;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          page-break-inside: avoid;
        }
        blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          color: #666;
          page-break-inside: avoid;
        }
        @media print {
          body {
            padding: 0;
          }
          @page {
            margin: 2cm;
          }
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `)
  
  printWindow.document.close()
  
  // 等待内容加载后打印
  printWindow.onload = () => {
    printWindow.print()
    printWindow.onafterprint = () => {
      printWindow.close()
    }
  }
}

/**
 * 下载文件的通用函数
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  // 创建 Blob
  const blob = new Blob([content], { type: mimeType })
  
  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  
  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
