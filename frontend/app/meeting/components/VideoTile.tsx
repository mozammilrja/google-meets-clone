import { useVideoElement } from '@/lib/hooks/useVideoElement'
import { useConnectionStats } from '@/lib/hooks/useConnectionStats'

interface VideoTileProps {
  participantId: string
  name: string
  kind: 'audio' | 'video' | 'screen'
  isLocal?: boolean
  peerConnection?: RTCPeerConnection | null
}

export function VideoTile({
  participantId,
  name,
  kind,
  isLocal = false,
  peerConnection,
}: VideoTileProps) {
  const { videoRef, connectionState } = useVideoElement({
    participantId,
    kind,
    autoplay: true,
    muted: isLocal,
  })

  const { stats, qualityLevel } = useConnectionStats({
    peerConnection,
    participantId,
    kind,
    interval: 1000,
  })

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'poor':
        return 'bg-red-500'
      case 'fair':
        return 'bg-yellow-500'
      case 'good':
        return 'bg-green-500'
      case 'excellent':
        return 'bg-emerald-500'
      default:
        return 'bg-slate-500'
    }
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {/* Overlay - Visible on Hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs text-white">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{name}</span>
          {isLocal && <span className="text-xs px-2 py-1 bg-blue-600 rounded">Local</span>}
        </div>
      </div>

      {/* Quality Indicator */}
      {!isLocal && peerConnection && (
        <div className="absolute top-2 right-2 flex gap-2">
          {/* Connection Quality */}
          <div
            className={`w-3 h-3 rounded-full ${getQualityColor(qualityLevel)} opacity-80`}
            title={`Quality: ${qualityLevel} - Bitrate: ${(stats.bitrate / 1000).toFixed(0)}kbps`}
          />

          {/* Stats on Hover */}
          <div className="hidden group-hover:block absolute top-8 right-0 bg-black/90 rounded p-2 text-xs whitespace-nowrap z-10">
            <div>Bitrate: {(stats.bitrate / 1000).toFixed(0)}kbps</div>
            <div>FPS: {stats.framerate.toFixed(0)}</div>
            <div>
              Res: {stats.resolution.width}x{stats.resolution.height}
            </div>
            <div>RTT: {stats.latency.toFixed(0)}ms</div>
          </div>
        </div>
      )}

      {/* Connection Error */}
      {connectionState?.state === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-red-400 font-semibold">Connection Failed</p>
            <p className="text-xs text-slate-300 mt-1">Attempting to reconnect...</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {!videoRef.current?.srcObject && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50">
          <div className="text-center">
            <p className="text-slate-300">Connecting {name}...</p>
            <div className="mt-2 flex gap-1 justify-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
