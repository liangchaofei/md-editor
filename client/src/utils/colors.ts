/**
 * 用户颜色生成工具
 */

// 预定义的颜色列表（柔和且易区分）
const COLORS = [
  '#FF6B6B', // 红色
  '#4ECDC4', // 青色
  '#45B7D1', // 蓝色
  '#FFA07A', // 橙色
  '#98D8C8', // 薄荷绿
  '#F7DC6F', // 黄色
  '#BB8FCE', // 紫色
  '#85C1E2', // 天蓝
  '#F8B739', // 金色
  '#52B788', // 绿色
]

/**
 * 根据用户名生成一致的颜色
 * 同一个用户名总是返回相同的颜色
 */
export function getUserColor(name: string): string {
  // 使用简单的哈希算法
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // 转换为 32 位整数
  }
  
  // 取绝对值并映射到颜色数组
  const index = Math.abs(hash) % COLORS.length
  return COLORS[index]
}

/**
 * 获取随机用户名（用于演示）
 */
export function getRandomUserName(): string {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '友善的', '活泼的', '可爱的', '机智的', '温柔的']
  const nouns = ['小猫', '小狗', '小鸟', '小兔', '小熊', '小鹿', '小狐', '小猴']
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  
  return `${adj}${noun}`
}

/**
 * 从 localStorage 获取或生成用户名
 */
export function getUserName(): string {
  let name = localStorage.getItem('userName')
  
  if (!name) {
    name = getRandomUserName()
    localStorage.setItem('userName', name)
  }
  
  return name
}
