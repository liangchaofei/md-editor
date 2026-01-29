/**
 * 斜杠命令扩展
 */

import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import type { CommandItem } from '../types/commands'
import CommandsList from '../components/editor/CommandsList'

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

// 命令列表配置
export const slashCommandItems: CommandItem[] = [
  {
    title: '标题 1',
    description: '大标题',
    icon: 'H1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
    aliases: ['h1', 'heading1', '一级标题'],
  },
  {
    title: '标题 2',
    description: '中标题',
    icon: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
    aliases: ['h2', 'heading2', '二级标题'],
  },
  {
    title: '标题 3',
    description: '小标题',
    icon: 'H3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
    aliases: ['h3', 'heading3', '三级标题'],
  },
  {
    title: '无序列表',
    description: '创建无序列表',
    icon: '•',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    aliases: ['ul', 'bullet', '列表'],
  },
  {
    title: '有序列表',
    description: '创建有序列表',
    icon: '1.',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    aliases: ['ol', 'ordered', '编号列表'],
  },
  {
    title: '代码块',
    description: '插入代码块',
    icon: '</>',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run()
    },
    aliases: ['code', 'codeblock', '代码'],
  },
  {
    title: '引用',
    description: '插入引用块',
    icon: '"',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run()
    },
    aliases: ['quote', 'blockquote', '引用块'],
  },
  {
    title: '分割线',
    description: '插入水平分割线',
    icon: '—',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    aliases: ['hr', 'divider', '分隔线'],
  },
  {
    title: '表格',
    description: '插入表格',
    icon: '📊',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    aliases: ['table', 'biaoge', '表'],
  },
  {
    title: '图片',
    description: '插入图片',
    icon: '🖼️',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      const url = window.prompt('请输入图片 URL:')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
    aliases: ['image', 'tupian', '图'],
  },
  {
    title: '任务列表',
    description: '创建待办事项',
    icon: '☑️',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
    aliases: ['task', 'todo', 'checkbox', '待办', '任务'],
  },
]

// Suggestion 配置
export const slashCommandSuggestion = {
  items: ({ query }: { query: string }) => {
    return slashCommandItems.filter((item) => {
      const searchText = query.toLowerCase()
      return (
        item.title.toLowerCase().includes(searchText) ||
        item.description.toLowerCase().includes(searchText) ||
        item.aliases?.some((alias) => alias.toLowerCase().includes(searchText))
      )
    })
  },

  render: () => {
    let component: ReactRenderer
    let popup: TippyInstance[]

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        // @ts-ignore - ref 可能不存在
        return component.ref?.onKeyDown?.(props) || false
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
