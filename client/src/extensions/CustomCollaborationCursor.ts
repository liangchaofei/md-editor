/**
 * 自定义协作光标扩展
 * 基于 Y.js Awareness 实现，兼容 Tiptap v3
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export interface CustomCollaborationCursorOptions {
  provider: HocuspocusProvider | null
  user: {
    name: string
    color: string
  }
}

export const CustomCollaborationCursor = Extension.create<CustomCollaborationCursorOptions>({
  name: 'customCollaborationCursor',

  addOptions() {
    return {
      provider: null,
      user: {
        name: 'Anonymous',
        color: '#000000',
      },
    }
  },

  addProseMirrorPlugins() {
    const { provider } = this.options

    if (!provider) {
      return []
    }

    return [
      new Plugin({
        key: new PluginKey('customCollaborationCursor'),
        
        state: {
          init() {
            return DecorationSet.empty
          },
          
          apply(tr, oldState) {
            // 如果文档没有变化，保持旧状态
            if (!tr.docChanged && !tr.selectionSet) {
              return oldState
            }

            // 更新本地用户的光标位置到 Awareness
            if (tr.selectionSet && provider.awareness) {
              const { from, to } = tr.selection
              provider.awareness.setLocalStateField('cursor', {
                anchor: from,
                head: to,
              })
            }

            // 创建装饰集
            return createDecorations(tr.doc, provider)
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

/**
 * 创建光标装饰
 */
function createDecorations(doc: any, provider: HocuspocusProvider) {
  const decorations: Decoration[] = []
  const awareness = provider.awareness

  if (!awareness) {
    return DecorationSet.empty
  }

  const localClientId = awareness.clientID
  const states = awareness.getStates()

  states.forEach((state, clientId) => {
    // 跳过本地用户
    if (clientId === localClientId) {
      return
    }

    // 获取用户信息和光标位置
    const user = state.user
    const cursor = state.cursor

    if (!user || !cursor) {
      return
    }

    const { anchor, head } = cursor
    const { name, color } = user

    try {
      // 创建光标装饰
      if (anchor === head) {
        // 单点光标
        const decoration = Decoration.widget(anchor, () => {
          const cursor = document.createElement('span')
          cursor.className = 'collaboration-cursor__caret'
          cursor.style.borderColor = color

          const label = document.createElement('span')
          label.className = 'collaboration-cursor__label'
          label.style.backgroundColor = color
          label.textContent = name

          cursor.appendChild(label)
          return cursor
        }, {
          side: -1,
        })

        decorations.push(decoration)
      } else {
        // 选区高亮
        const from = Math.min(anchor, head)
        const to = Math.max(anchor, head)

        // 确保位置在文档范围内
        if (from >= 0 && to <= doc.content.size) {
          const decoration = Decoration.inline(from, to, {
            class: 'collaboration-cursor__selection',
            style: `background-color: ${color}`,
          })

          decorations.push(decoration)

          // 在选区末尾添加光标
          const cursorDecoration = Decoration.widget(to, () => {
            const cursor = document.createElement('span')
            cursor.className = 'collaboration-cursor__caret'
            cursor.style.borderColor = color

            const label = document.createElement('span')
            label.className = 'collaboration-cursor__label'
            label.style.backgroundColor = color
            label.textContent = name

            cursor.appendChild(label)
            return cursor
          }, {
            side: -1,
          })

          decorations.push(cursorDecoration)
        }
      }
    } catch (error) {
      console.warn('创建光标装饰失败:', error)
    }
  })

  return DecorationSet.create(doc, decorations)
}
