/**
 * 音频组件
 * 支持本地音频文件播放
 */

import { NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'

interface AudioComponentProps {
  node: {
    attrs: {
      src: string
      title?: string
    }
  }
  updateAttributes: (attrs: Record<string, any>) => void
  deleteNode: () => void
  selected: boolean
}

function AudioComponent({ node, updateAttributes, deleteNode, selected }: AudioComponentProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.src)
  const [url, setUrl] = useState(node.attrs.src || '')
  const [title, setTitle] = useState(node.attrs.title || '')

  const handleSave = () => {
    if (url) {
      updateAttributes({ src: url, title })
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    if (node.attrs.src) {
      setUrl(node.attrs.src)
      setTitle(node.attrs.title || '')
      setIsEditing(false)
    } else {
      deleteNode()
    }
  }

  return (
    <NodeViewWrapper className="audio-wrapper">
      <div
        className={`audio-container ${selected ? 'selected' : ''}`}
        style={{
          border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          margin: '16px 0',
          backgroundColor: '#ffffff',
        }}
      >
        {isEditing ? (
          // 编辑模式
          <div className="audio-editor">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">插入音频</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!url}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  插入
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  音频 URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3 或本地音频路径"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题（可选）
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="音频标题"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                支持：MP3、WAV、Ogg 等音频格式
              </div>
            </div>
          </div>
        ) : (
          // 预览模式
          <div className="audio-preview">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {node.attrs.title || '音频文件'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  title="编辑"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={deleteNode}
                  className="px-3 py-1 text-sm text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <audio
              src={node.attrs.src}
              controls
              className="w-full"
              style={{ height: '40px' }}
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default AudioComponent
