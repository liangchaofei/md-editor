#!/usr/bin/env node

/**
 * 环境检查脚本
 * 检查 Node.js、pnpm 版本是否满足要求
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkVersion(command, minVersion, name) {
  try {
    const version = execSync(command, { encoding: 'utf-8' }).trim()
    const current = version.match(/\d+\.\d+\.\d+/)?.[0]

    if (!current) {
      log(`❌ 无法获取 ${name} 版本`, 'red')
      return false
    }

    const [currentMajor, currentMinor] = current.split('.').map(Number)
    const [minMajor, minMinor] = minVersion.split('.').map(Number)

    if (
      currentMajor > minMajor ||
      (currentMajor === minMajor && currentMinor >= minMinor)
    ) {
      log(`✅ ${name}: ${current} (>= ${minVersion})`, 'green')
      return true
    } else {
      log(
        `❌ ${name}: ${current} (需要 >= ${minVersion})`,
        'red'
      )
      return false
    }
  } catch (error) {
    log(`❌ ${name} 未安装`, 'red')
    return false
  }
}

function main() {
  log('\n🔍 检查开发环境...\n', 'blue')

  const checks = [
    checkVersion('node --version', '18.0', 'Node.js'),
    checkVersion('pnpm --version', '8.0', 'pnpm'),
  ]

  log('\n' + '='.repeat(50) + '\n')

  if (checks.every(Boolean)) {
    log('✅ 环境检查通过！可以开始开发了。\n', 'green')
    log('运行以下命令启动项目：', 'blue')
    log('  pnpm install', 'yellow')
    log('  pnpm dev\n', 'yellow')
  } else {
    log('❌ 环境检查失败，请先安装缺失的工具。\n', 'red')

    if (!checks[1]) {
      log('安装 pnpm：', 'blue')
      log('  npm install -g pnpm\n', 'yellow')
    }
  }
}

main()
