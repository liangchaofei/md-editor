/**
 * DeepSeek API 连接测试脚本
 * 用于诊断 API 连接问题
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') })

const API_KEY = process.env.DEEPSEEK_API_KEY
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

console.log('\n🔍 DeepSeek API 连接测试\n')
console.log('配置信息:')
console.log('  API Key:', API_KEY ? `${API_KEY.slice(0, 10)}...` : '未配置')
console.log('  Base URL:', BASE_URL)
console.log('  Model:', MODEL)
console.log('')

if (!API_KEY) {
  console.error('❌ 错误: DEEPSEEK_API_KEY 未配置')
  process.exit(1)
}

// 测试连接
async function testConnection() {
  console.log('📡 正在测试连接...\n')

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: '你好' }],
        stream: false,
        max_tokens: 50,
      }),
    })

    console.log('响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ API 错误:', error)
      process.exit(1)
    }

    const data = await response.json()
    console.log('\n✅ 连接成功！')
    console.log('\nAI 回复:', data.choices[0]?.message?.content)
    console.log('\n使用情况:')
    console.log('  Prompt tokens:', data.usage?.prompt_tokens)
    console.log('  Completion tokens:', data.usage?.completion_tokens)
    console.log('  Total tokens:', data.usage?.total_tokens)
  } catch (error) {
    console.error('\n❌ 连接失败:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n可能的原因:')
      console.error('  1. 无法连接到 DeepSeek API')
      console.error('  2. 网络问题或防火墙阻止')
      console.error('  3. 需要配置代理')
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n可能的原因:')
      console.error('  1. DNS 解析失败')
      console.error('  2. 网络连接问题')
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      console.error('\n可能的原因:')
      console.error('  1. 网络超时')
      console.error('  2. 需要配置代理')
      console.error('  3. DeepSeek 服务暂时不可用')
    }
    
    console.error('\n建议:')
    console.error('  1. 检查网络连接')
    console.error('  2. 确认 API Key 是否有效')
    console.error('  3. 访问 https://platform.deepseek.com/ 查看账户状态')
    console.error('  4. 如果在国内，可能需要配置代理')
    
    process.exit(1)
  }
}

testConnection()
