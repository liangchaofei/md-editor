/**
 * Hocuspocus WebSocket 服务器
 * 用于实时协同编辑
 */

import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { getDatabase } from './database/index.js'

/**
 * 创建 Hocuspocus 服务器实例
 */
export function createHocuspocusServer() {
  const db = getDatabase()
  const port = Number(process.env.HOCUSPOCUS_PORT) || 1234

  const server = new Server({
    port,
    address: '0.0.0.0', // 监听所有网络接口
    
    extensions: [
      new Database({
        // 从数据库加载文档
        fetch: async ({ documentName }) => {
          
          try {
            const doc = db.prepare('SELECT yjs_state FROM documents WHERE id = ?').get(documentName)
            
            if (doc && (doc as any).yjs_state) {
              return (doc as any).yjs_state
            }
            
            return null
          } catch (error) {
            console.error(`❌ 加载文档失败:`, error)
            return null
          }
        },

        // 保存文档到数据库
        store: async ({ documentName, state }) => {
          
          try {
            // 更新 yjs_state 字段
            db.prepare(`
              UPDATE documents 
              SET yjs_state = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(state, documentName)
            
          } catch (error) {
            console.error(`❌ 保存文档失败:`, error)
            throw error
          }
        },
      }),
    ],

    // 连接建立时的回调
    onConnect: async () => {
      console.log('🔌 客户端已连接')
    },

    // 连接断开时的回调
    onDisconnect: async () => {
      console.log('🔌 客户端已断开')
    },

    // 文档加载时的回调
    onLoadDocument: async ({ documentName }) => {
      console.log(`📖 文档 ${documentName} 已加载`)
    },

    // 文档变更时的回调
    onChange: async ({ documentName }) => {
      console.log(`✏️ 文档 ${documentName} 已变更`)
    },
  })

  return server
}

/**
 * 启动 Hocuspocus 服务器
 */
export async function startHocuspocusServer() {
  const server = createHocuspocusServer()
  const port = Number(process.env.HOCUSPOCUS_PORT) || 1234
  
  await server.listen()
  
  console.log(`🚀 Hocuspocus 服务器已启动在端口 ${port}`)
  
  return server
}
