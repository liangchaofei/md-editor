/**
 * 数据库配置和连接管理
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../../data/documents.db')

let db: Database.Database | null = null

/**
 * 初始化数据库连接
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db
  }

  try {
    // 确保 data 目录存在
    const dataDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // 打开数据库连接
    db = new Database(DB_PATH)

    console.log('📦 数据库连接成功:', DB_PATH)

    // 启用外键约束
    db.pragma('foreign_keys = ON')

    // 初始化表结构
    initTables()

    return db
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    throw error
  }
}

/**
 * 初始化数据库表
 */
function initTables() {
  if (!db) {
    throw new Error('数据库未初始化')
  }

  // 创建 documents 表
  db.exec(`
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

  // 创建文档版本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `)

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_created_at 
    ON documents(created_at)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_is_deleted 
    ON documents(is_deleted)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_document_versions_document_id 
    ON document_versions(document_id)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_document_versions_created_at 
    ON document_versions(created_at DESC)
  `)

  console.log('✅ 数据库表初始化完成')
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
    console.log('📦 数据库连接已关闭')
  }
}
