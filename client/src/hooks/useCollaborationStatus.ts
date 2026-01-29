/**
 * 协同编辑状态 Hook
 */

import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export interface CollaborationStatus {
  // 连接状态
  status: 'connecting' | 'connected' | 'disconnected'
  // 是否已同步
  synced: boolean
  // 在线用户数（包括自己）
  userCount: number
}

export function useCollaborationStatus(provider: HocuspocusProvider | null): CollaborationStatus {
  const [status, setStatus] = useState<CollaborationStatus>({
    status: 'connecting',
    synced: false,
    userCount: 0,
  })

  useEffect(() => {
    if (!provider) return

    // 监听连接状态
    const handleStatus = ({ status }: { status: string }) => {
      setStatus(prev => ({ ...prev, status: status as any }))
      // 连接成功后立即更新用户数
      if (status === 'connected') {
        updateUserCount()
      }
    }

    // 监听同步状态
    const handleSynced = ({ state }: { state: boolean }) => {
      setStatus(prev => ({ ...prev, synced: state }))
      // 同步完成后更新用户数
      if (state) {
        updateUserCount()
      }
    }

    // 更新用户数量
    const updateUserCount = () => {
      const userCount = provider.awareness?.getStates().size || 0
      setStatus(prev => ({ ...prev, userCount }))
      console.log('👥 在线用户数:', userCount)
    }

    // 监听 Awareness 变化（用户上线/下线）
    const handleAwarenessChange = () => {
      updateUserCount()
    }

    // 绑定事件
    provider.on('status', handleStatus)
    provider.on('synced', handleSynced)
    provider.awareness?.on('change', handleAwarenessChange)
    provider.awareness?.on('update', handleAwarenessChange)

    // 初始化用户数量
    updateUserCount()

    // 定期更新用户数（作为备用方案）
    const interval = setInterval(updateUserCount, 2000)

    // 清理
    return () => {
      provider.off('status', handleStatus)
      provider.off('synced', handleSynced)
      provider.awareness?.off('change', handleAwarenessChange)
      provider.awareness?.off('update', handleAwarenessChange)
      clearInterval(interval)
    }
  }, [provider])

  return status
}
