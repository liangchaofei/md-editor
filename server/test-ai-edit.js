/**
 * 测试 AI 编辑功能
 * 用于验证 AI 是否能正确返回 JSON 格式的修改建议
 */

import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const systemPrompt = `你是一个专业的文档编辑助手。用户会告诉你要修改文档的哪些部分。

【重要】文档格式是 Markdown，包含标题（# ## ###）、列表、粗体等标记。

你需要：
1. 理解用户的修改需求
2. 在 Markdown 文档中找到需要修改的位置
3. 返回 JSON 格式的修改建议

返回格式要求：
- 必须返回纯 JSON，不要添加任何其他文字
- 不要使用 markdown 代码块（\`\`\`json）
- 确保 JSON 可以被 JSON.parse() 解析

JSON 格式：
{
  "reasoning": "你的思考过程",
  "changes": [
    {
      "target": "要替换的原文",
      "replacement": "替换后的文本",
      "description": "修改说明"
    }
  ]
}

【关键规则】：
1. target 必须从文档中**逐字复制**，包括所有 Markdown 标记
2. 如果是标题，必须包含 # 符号，例如 "## 四、技术方案响应"
3. 如果是列表，必须包含 - 或 * 符号
4. 保留所有空格、换行、标点符号
5. target 应该是完整的段落或标题
6. replacement 也要使用相同的 Markdown 格式

示例：
用户："把第四章节标题改为'涵盖技术领域内容'"
文档中："## 四、技术方案响应"

正确返回：
{"reasoning":"修改第四章节标题","changes":[{"target":"## 四、技术方案响应","replacement":"## 四、涵盖技术领域内容","description":"修改标题"}]}

错误返回：
- "四、技术方案响应" ❌ (缺少 ##)
- "## 四、 技术方案响应" ❌ (多了空格)
- \`\`\`json {...} \`\`\` ❌ (不要代码块)`

const documentContent = `## 一、项目概述

本项目旨在构建一个现代化的企业级应用系统。

## 二、技术架构

采用微服务架构设计。

## 三、实施方案

分三个阶段实施。

## 四、技术方案响应

详细的技术方案说明。`

const userRequest = '把第四章节标题改为"涵盖技术领域内容"'

async function testAIEdit() {
  console.log('📄 文档内容:')
  console.log(documentContent)
  console.log('\n👤 用户请求:', userRequest)
  console.log('\n🤖 AI 处理中...\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `文档内容：\n${documentContent}\n\n用户需求：${userRequest}\n\n请返回 JSON 格式的修改建议。`,
        },
      ],
      stream: false,
    })

    const response = completion.choices[0].message.content
    console.log('📥 AI 原始返回:')
    console.log(response)
    console.log('\n')

    // 尝试解析 JSON
    try {
      let jsonStr = response.trim()

      // 移除可能的 markdown 代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        console.log('✂️ 移除了 ```json 标记')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
        console.log('✂️ 移除了 ``` 标记')
      }

      // 尝试查找 JSON 对象
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
        console.log('✂️ 提取了 JSON 对象')
      }

      const result = JSON.parse(jsonStr)
      console.log('✅ JSON 解析成功!')
      console.log('\n📊 解析结果:')
      console.log(JSON.stringify(result, null, 2))

      // 验证 target 是否在文档中
      if (result.changes && result.changes.length > 0) {
        console.log('\n🔍 验证 target 是否在文档中:')
        result.changes.forEach((change, index) => {
          const found = documentContent.includes(change.target)
          console.log(
            `  ${index + 1}. "${change.target}" - ${found ? '✅ 找到' : '❌ 未找到'}`
          )
          if (!found) {
            console.log(`     提示: 文档中可能是 "## 四、技术方案响应"`)
          }
        })
      }
    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError.message)
      console.log('\n💡 这意味着 AI 没有返回有效的 JSON 格式')
      console.log('   需要调整 Prompt 或使用备用解析方案')
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

testAIEdit()
