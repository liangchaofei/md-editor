/**
 * 自定义快捷键扩展
 */

import { Extension } from '@tiptap/core'

export const CustomKeymap = Extension.create({
  name: 'customKeymap',

  addKeyboardShortcuts() {
    return {
      // 基础格式化快捷键
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      
      // 标题快捷键
      'Mod-Alt-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Alt-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-Alt-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-Alt-5': () => this.editor.commands.toggleHeading({ level: 5 }),
      'Mod-Alt-6': () => this.editor.commands.toggleHeading({ level: 6 }),
      
      // 列表快捷键
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
      
      // 清除格式
      'Mod-\\': () => this.editor.commands.clearNodes(),
      
      // 水平线
      'Mod-Shift--': () => this.editor.commands.setHorizontalRule(),
      
      // 代码块
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      
      // 引用
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
    }
  },
})
