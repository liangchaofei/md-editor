/**
 * 离线模式提示横幅
 */

interface OfflineBannerProps {
  isOffline: boolean
}

function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-8 py-3">
      <div className="flex items-center gap-2">
        <span className="text-yellow-600">⚠️</span>
        <p className="text-sm text-yellow-800">
          <span className="font-medium">离线模式</span>
          {' - '}
          您的更改将在重新连接后自动同步
        </p>
      </div>
    </div>
  )
}

export default OfflineBanner
