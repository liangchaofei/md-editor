/**
 * DragAndDrop 扩展
 * 处理块级拖拽排序
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const DragAndDrop = Extension.create({
  name: 'dragAndDrop',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragAndDrop'),
        props: {
          handleDOMEvents: {
            // 拖拽进入
            dragover: (_view, event) => {
              event.preventDefault()
              return false
            },

            // 拖拽放置
            drop: (view, event) => {
              event.preventDefault()

              // 获取拖拽的节点位置
              const draggedPosStr = event.dataTransfer?.getData('text/plain')
              if (!draggedPosStr) return false

              const draggedPos = parseInt(draggedPosStr, 10)
              if (isNaN(draggedPos)) return false

              // 获取放置位置
              const dropPos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })

              if (!dropPos) return false

              // 获取拖拽的节点
              const draggedNode = view.state.doc.nodeAt(draggedPos)
              if (!draggedNode) return false

              // 计算实际的放置位置
              let targetPos = dropPos.pos

              // 如果放置位置在拖拽节点之后，需要调整位置
              if (targetPos > draggedPos) {
                targetPos -= draggedNode.nodeSize
              }

              // 执行移动操作
              const tr = view.state.tr

              // 1. 删除原位置的节点
              tr.delete(draggedPos, draggedPos + draggedNode.nodeSize)

              // 2. 在新位置插入节点
              tr.insert(targetPos, draggedNode)

              // 3. 应用事务
              view.dispatch(tr)

              return true
            },
          },
        },
      }),
    ]
  },
})
