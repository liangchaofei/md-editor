/**
 * 数学公式扩展
 * 支持 LaTeX 语法的行内公式和块级公式
 */

import { Mathematics as TiptapMathematics } from '@tiptap/extension-mathematics'

export const Mathematics = TiptapMathematics.configure({
  katexOptions: {
    throwOnError: false,
    errorColor: '#cc0000',
    strict: 'warn',
    trust: false,
    macros: {
      '\\RR': '\\mathbb{R}',
      '\\NN': '\\mathbb{N}',
      '\\ZZ': '\\mathbb{Z}',
      '\\QQ': '\\mathbb{Q}',
    },
  },
  HTMLAttributes: {
    class: 'math-node',
  },
})
