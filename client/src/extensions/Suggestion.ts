/**
 * Suggestion Mark 扩展
 * 用于标记 AI 建议的修改内容
 */

import { Mark, mergeAttributes } from '@tiptap/core'

export interface SuggestionOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    suggestion: {
      /**
       * 设置建议标记
       */
      setSuggestion: (attributes: {
        id: string
        replacement: string
        description?: string
      }) => ReturnType
      /**
       * 取消建议标记
       */
      unsetSuggestion: () => ReturnType
      /**
       * 移除指定 ID 的建议
       */
      removeSuggestion: (id: string) => ReturnType
    }
  }
}

export const Suggestion = Mark.create<SuggestionOptions>({
  name: 'suggestion',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-suggestion-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return {
            'data-suggestion-id': attributes.id,
          }
        },
      },
      replacement: {
        default: null,
        parseHTML: element => element.getAttribute('data-replacement'),
        renderHTML: attributes => {
          if (!attributes.replacement) {
            return {}
          }
          return {
            'data-replacement': attributes.replacement,
          }
        },
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => {
          if (!attributes.description) {
            return {}
          }
          return {
            'data-description': attributes.description,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-suggestion-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'suggestion-mark',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setSuggestion:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetSuggestion:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      removeSuggestion:
        id =>
        ({ tr, state }) => {
          const { doc } = state
          let found = false

          doc.descendants((node, pos) => {
            if (found) return false

            node.marks.forEach(mark => {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                const from = pos
                const to = pos + node.nodeSize
                tr.removeMark(from, to, mark.type)
                found = true
              }
            })
          })

          return found
        },
    }
  },
})
