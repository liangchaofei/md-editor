/**
 * Y.js 工具函数
 */

import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { HocuspocusProvider } from '@hocuspocus/provider'

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
  const provider = new HocuspocusProvider({
    url: 'ws://localhost:1234',
    name: documentId,
    document: ydoc,
    
    onConnect: () => {
      console.log('🔌 已连接到 Hocuspocus 服务器')
    },
    
    onDisconnect: ({ event }) => {
      console.log('🔌 已断开与 Hocuspocus 服务器的连接', event)
    },
    
    onStatus: ({ status }) => {
      console.log('📡 连接状态:', status)
    },
    
    onSynced: ({ state }) => {
      console.log('🔄 同步状态:', state ? '已同步' : '未同步')
    },
  })
  
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
