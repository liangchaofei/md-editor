/**
 * 斜杠命令列表组件
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { CommandItem } from '../../types/commands'

interface CommandsListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

const CommandsList = forwardRef((props: CommandsListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div className="slash-commands-list">
        <div className="slash-commands-empty">没有找到匹配的命令</div>
      </div>
    )
  }

  return (
    <div className="slash-commands-list">
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`slash-commands-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => selectItem(index)}
        >
          <div className="slash-commands-icon">{item.icon}</div>
          <div className="slash-commands-content">
            <div className="slash-commands-title">{item.title}</div>
            <div className="slash-commands-description">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
})

CommandsList.displayName = 'CommandsList'

export default CommandsList
