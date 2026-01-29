/**
 * 重新连接提示横幅
 */

interface ReconnectingBannerProps {
  isReconnecting: boolean
}

function ReconnectingBanner({ isReconnecting }: ReconnectingBannerProps) {
  if (!isReconnecting) return null

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-8 py-3">
      <div className="flex items-center gap-2">
        <div className="animate-spin">
          <span className="text-blue-600">🔄</span>
        </div>
        <p className="text-sm text-blue-800">
          <span className="font-medium">正在重新连接</span>
          {' - '}
          请稍候...
        </p>
      </div>
    </div>
  )
}

export default ReconnectingBanner
