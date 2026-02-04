/**
 * DragAndDrop 扩展
 * 使用 ProseMirror 原生拖拽能力，更稳定可靠
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
          // 启用拖拽
          handleDOMEvents: {
            drop: (view, event) => {
              const { clientX, clientY } = event
              const pos = view.posAtCoords({ left: clientX, top: clientY })
              
              if (!pos) return false

              // 获取拖拽的数据
              const data = event.dataTransfer?.getData('text/plain')
              if (!data) return false

              try {
                const draggedPos = parseInt(data, 10)
                if (isNaN(draggedPos)) return false

                // 使用 ProseMirror 的命令来移动节点
                const { state, dispatch } = view
                const $pos = state.doc.resolve(draggedPos)
                const node = $pos.nodeAfter

                if (!node) return false

                // 计算目标位置
                const $target = state.doc.resolve(pos.pos)
                let targetPos = pos.pos

                // 如果在文本块内，找到块的边界
                if ($target.parent.isTextblock) {
                  const start = $target.start($target.depth)
                  const end = $target.end($target.depth)
                  const offset = pos.pos - start
                  const length = end - start

                  // 如果点击在前半部分，插入到块之前；否则插入到块之后
                  targetPos = offset < length / 2 ? start : end
                }

                // 如果拖拽到同一位置，不做任何操作
                if (Math.abs(targetPos - draggedPos) < node.nodeSize) {
                  return true
                }

                // 创建事务
                const tr = state.tr

                // 删除原位置的节点
                tr.delete(draggedPos, draggedPos + node.nodeSize)

                // 调整目标位置（如果目标在删除位置之后）
                const adjustedTargetPos = targetPos > draggedPos 
                  ? targetPos - node.nodeSize 
                  : targetPos

                // 在新位置插入节点
                tr.insert(adjustedTargetPos, node)

                // 应用事务
                if (dispatch) {
                  dispatch(tr)
                }

                event.preventDefault()
                return true
              } catch (error) {
                console.error('拖拽失败:', error)
                return false
              }
            },

            dragover: (_view, event) => {
              event.preventDefault()
              return false
            },
          },
        },
      }),
    ]
  },
})
