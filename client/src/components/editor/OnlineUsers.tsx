/**
 * 在线用户列表组件
 */

import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface User {
  clientId: number
  name: string
  color: string
}

interface OnlineUsersProps {
  provider: HocuspocusProvider | null
}

function OnlineUsers({ provider }: OnlineUsersProps) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (!provider) return

    const updateUsers = () => {
      const states = provider.awareness?.getStates()
      if (!states) return

      const userList: User[]= []
      states.forEach((state, clientId) => {
        if (state.user) {
          userList.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
          })
        }
      })

      setUsers(userList)
    }

    // 监听 Awareness 变化
    provider.awareness?.on('change', updateUsers)
    provider.awareness?.on('update', updateUsers)

    // 初始化
    updateUsers()

    return () => {
      provider.awareness?.off('change', updateUsers)
      provider.awareness?.off('update', updateUsers)
    }
  }, [provider])

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">在线用户:</span>
      <div className="flex -space-x-2">
        {users.map((user) => (
          <div
            key={user.clientId}
            className="relative group"
            title={user.name}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0)}
            </div>
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {user.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OnlineUsers
