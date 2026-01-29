/**
 * Y.js 工具函数
 */

import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

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
 * 获取文档的 XML Fragment
 */
export function getYFragment(ydoc: Y.Doc): Y.XmlFragment {
  return ydoc.getXmlFragment('prosemirror')
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
