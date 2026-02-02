/**
 * 测试 Kimi API 连接
 * 运行: node server/test-kimi.js
 */

import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY

if (!MOONSHOT_API_KEY) {
  console.error('❌ 错误: 未找到 MOONSHOT_API_KEY')
  console.error('请在 server/.env 文件中配置 MOONSHOT_API_KEY')
  process.exit(1)
}

console.log('🌙 开始测试 Kimi API...')
console.log('API Key:', MOONSHOT_API_KEY.substring(0, 10) + '...')

const client = new OpenAI({
  apiKey: MOONSHOT_API_KEY,
  baseURL: 'https://api.moonshot.cn/v1',
})

async function testKimi() {
  try {
    console.log('\n📋 测试 1: 获取模型列表')
    const models = await client.models.list()
    console.log('✅ 成功获取模型列表:')
    models.data.forEach(model => {
      console.log(`  - ${model.id}`)
    })

    console.log('\n💬 测试 2: 简单对话')
    const response = await client.chat.completions.create({
      model: 'moonshot-v1-8k',
      messages: [
        { role: 'user', content: '你好，请用一句话介绍你自己' }
      ],
    })
    console.log('✅ Kimi 回复:', response.choices[0].message.content)

    console.log('\n🧠 测试 3: 复杂推理（测试理解能力）')
    const reasoningResponse = await client.chat.completions.create({
      model: 'moonshot-v1-32k',
      messages: [
        { 
          role: 'user', 
          content: `文档内容：
# 前端开发学习计划

## 第一阶段：基础入门（1-2个月）
目标：掌握Web三件套

## 第二阶段：核心技能深化（2-3个月）
目标：掌握现代前端框架

用户需求：把基础入门改为零基础入门学习

请分析：用户想修改哪个位置？为什么？` 
        }
      ],
    })
    console.log('✅ Kimi 分析:', reasoningResponse.choices[0].message.content)

    console.log('\n🎉 所有测试通过！Kimi API 工作正常')
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    if (error.status === 401) {
      console.error('💡 提示: API Key 无效，请检查 MOONSHOT_API_KEY 是否正确')
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 提示: 无法连接到 api.moonshot.cn，请检查网络')
    }
    process.exit(1)
  }
}

testKimi()
