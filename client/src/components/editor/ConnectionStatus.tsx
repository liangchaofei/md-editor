/**
 * 连接状态指示器组件
 */

import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface ConnectionStatusProps {
  provider: HocuspocusProvider | null
}

function ConnectionStatus({ provider }: ConnectionStatusProps) {
  const { status, synced, userCount } = useCollaborationStatus(provider)

  // 根据状态显示不同的图标和文字
  const getStatusInfo = () => {
    if (status === 'connected' && synced) {
      return {
        icon: '🟢',
        text: '已连接',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      }
    }

    if (status === 'connected' && !synced) {
      return {
        icon: '🟡',
        text: '同步中',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      }
    }

    if (status === 'connecting') {
      return {
        icon: '🟡',
        text: '连接中',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      }
    }

    return {
      icon: '🔴',
      text: '已断开',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex items-center gap-3">
      {/* 连接状态 */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${statusInfo.bgColor}`}>
        <span className="text-sm">{statusInfo.icon}</span>
        <span className={`text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* 在线用户数 */}
      {status === 'connected' && userCount > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50">
          <span className="text-sm">👥</span>
          <span className="text-xs font-medium text-blue-600">
            {userCount} 人在线
          </span>
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus
