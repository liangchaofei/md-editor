export type AICommandType = 'rewrite' | 'continue' | 'expand' | 'summarize' | 'translate'

export interface AICommandContext {
  selectedText: string
  beforeText: string
  afterText: string
  cursorPosition: number
}

export interface AICommandRequest {
  type: AICommandType
  context: AICommandContext
  userInput?: string
}

export interface AICommandResult {
  content: string
  reasoning?: string
}
