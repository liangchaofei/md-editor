/**
 * Y.js 工具函数
 */

import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { getUserColor, getUserName } from './colors'

/**
 * 创建 Y.Doc 实例
 */
export function createYDoc(documentId: string): Y.Doc {
  const ydoc = new Y.Doc()
  
  // 使用 IndexedDB 持久化
  const persistence = new IndexeddbPersistence(`doc-${documentId}`, ydoc)
  
  persistence.on('synced', () => {
    console.log('📦 Y.js 文档已从 IndexedDB 加载')
  })
  
  return ydoc
}

/**
 * 创建 Hocuspocus Provider
 */
export function createHocuspocusProvider(documentId: string, ydoc: Y.Doc): HocuspocusProvider {
  // 生成用户信息
  const userName = getUserName()
  const userColor = getUserColor(userName)
  
  const provider = new HocuspocusProvider({
    url: 'ws://localhost:1234',
    name: documentId,
    document: ydoc,
    
    // 重连配置
    maxAttempts: 0, // 无限重连
    delay: 1000, // 初始延迟 1 秒
    factor: 2, // 指数退避因子
    maxDelay: 30000, // 最大延迟 30 秒
    minDelay: 1000, // 最小延迟 1 秒
    jitter: true, // 添加随机抖动
    
    onConnect: () => {
      console.log('🔌 已连接到 Hocuspocus 服务器')
    },
    
    onDisconnect: ({ event }) => {
      console.log('🔌 已断开连接', event)
    },
    
    onStatus: ({ status }) => {
      console.log('📡 连接状态:', status)
    },
    
    onSynced: ({ state }) => {
      console.log('🔄 同步状态:', state ? '已同步' : '未同步')
    },
  })
  
  // 设置用户信息到 Awareness
  provider.setAwarenessField('user', {
    name: userName,
    color: userColor,
  })
  
  console.log(`👤 当前用户: ${userName} (${userColor})`)
  
  return provider
}

/**
 * 获取文档的 XML Fragment
 * 注意：field 名称必须与 Collaboration 扩展的 field 配置一致
 */
export function getYFragment(ydoc: Y.Doc, fieldName: string = 'default'): Y.XmlFragment {
  return ydoc.getXmlFragment(fieldName)
}

/**
 * 清除文档的 IndexedDB 缓存
 */
export async function clearYDocCache(documentId: string): Promise<void> {
  const dbName = `doc-${documentId}`
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName)
    
    request.onsuccess = () => {
      console.log(`🗑️ 已清除文档 ${documentId} 的缓存`)
      resolve()
    }
    
    request.onerror = () => {
      console.error(`❌ 清除文档 ${documentId} 的缓存失败`)
      reject(request.error)
    }
  })
}
