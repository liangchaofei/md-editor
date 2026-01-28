/**
 * 数据库配置和连接管理
 */

import { open, Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../../data/documents.db')

let db: Database | null = null

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db
  }

  try {
    // 打开数据库连接
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    })

    console.log('📦 数据库连接成功:', DB_PATH)

    // 启用外键约束
    await db.exec('PRAGMA foreign_keys = ON')

    // 初始化表结构
    await initTables()

    return db
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    throw error
  }
}

/**
 * 初始化数据库表
 */
async function initTables() {
  if (!db) {
    throw new Error('数据库未初始化')
  }

  // 创建 documents 表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '无标题文档',
      content TEXT DEFAULT '',
      yjs_state BLOB,
      metadata TEXT DEFAULT '{}',
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_created_at 
    ON documents(created_at)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_is_deleted 
    ON documents(is_deleted)
  `)

  console.log('✅ 数据库表初始化完成')
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  if (db) {
    await db.close()
    db = null
    console.log('📦 数据库连接已关闭')
  }
}
