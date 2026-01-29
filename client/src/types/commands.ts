/**
 * 命令相关类型定义
 */

export interface CommandItem {
  title: string
  description: string
  icon: string
  command: ({ editor, range }: any) => void
  aliases?: string[]
}
