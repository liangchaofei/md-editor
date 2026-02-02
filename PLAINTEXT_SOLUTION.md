# 纯文本定位方案

## 问题根源

之前的问题：
- **Markdown 位置** ≠ **ProseMirror 位置**
- 例如：`## 标题` 在 Markdown 是 7 个字符，但在纯文本只有 2 个字符（"标题"）
- 导致位置对不上，无法准确标记

## 解决方案

**统一使用纯文本**：
1. 传给 AI 的是纯文本（`editor.getText()`）
2. AI 返回的 target 也是纯文本
3. 在纯文本中定位（`editor.state.doc.textContent`）
4. 直接使用找到的位置标记

## 优势

1. **位置一致**：AI 看到的和编辑器的位置完全一致
2. **简单可靠**：不需要格式转换
3. **精确匹配**：字符位置一一对应

## 测试步骤

1. 生成一个文档（例如："帮我写一份技术方案"）
2. 等待生成完成
3. 输入："把第一章节标题改为'项目背景'"
4. 查看控制台日志：
   - `📄 发送给 AI 的纯文本内容` - 应该是纯文本，没有 `##`
   - `🎯 目标文本` - 应该是纯文本，例如 "一、项目概述"
   - `✅ 策略1: 精确匹配成功` - 应该成功

## 预期结果

- AI 返回：`{"target":"一、项目概述","replacement":"一、项目背景",...}`
- 在文档中精确找到 "一、项目概述"
- 蓝色高亮标记
- Hover 显示 tooltip
- 点击接受后替换为 "一、项目背景"

## 关键改动

1. `AIChatPanel.tsx`: 使用 `editor.getText()` 而不是 `editor.storage.markdown.getMarkdown()`
2. `useSuggestions.ts`: 直接在 `editor.state.doc.textContent` 中查找
3. `server/src/routes/ai.ts`: Prompt 不再提及 Markdown 格式
4. `textMatcher.ts`: 移除 Markdown 标记处理逻辑

## 注意事项

- 纯文本会丢失格式信息（标题级别、粗体等）
- 但对于定位来说，这反而更准确
- AI 仍然能理解文档结构（通过序号、缩进等）
