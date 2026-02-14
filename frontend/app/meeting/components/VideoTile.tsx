import { useState, useEffect } from 'react'
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
  const [hasVideoStream, setHasVideoStream] = useState(false)
  
  const { videoRef, connectionState } = useVideoElement({
    participantId,
    kind,
    autoplay: true,
    muted: isLocal,
  })

  // Check if video element has a stream - optimized to prevent unnecessary re-renders
  useEffect(() => {
    let currentHasStream = false
    
    const checkStream = () => {
      let newHasStream = false
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        const videoTracks = stream.getVideoTracks()
        newHasStream = videoTracks.length > 0 && videoTracks[0].readyState === 'live'
      }
      
      // Only update state if value changed (prevents blinking re-renders)
      if (newHasStream !== currentHasStream) {
        currentHasStream = newHasStream
        setHasVideoStream(newHasStream)
      }
    }
    
    // Check initially and on interval
    checkStream()
    const interval = setInterval(checkStream, 500)
    return () => clearInterval(interval)
  }, [videoRef])

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
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video group transition-all duration-300 hover:ring-2 hover:ring-gray-600">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {/* Avatar Fallback when no video */}
      {!hasVideoStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-semibold text-white">
            {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
          </div>
        </div>
      )}

      {/* Overlay - Visible on Hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* Bottom Info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate max-w-[120px]">
            {name} {isLocal && '(You)'}
          </span>
          {isLocal && (
            <span className="text-xs px-2 py-1 bg-blue-600/80 rounded-full">Local</span>
          )}
        </div>
      </div>

      {/* Quality Indicator */}
      {!isLocal && peerConnection && (
        <div className="absolute top-3 right-3 flex gap-2">
          {/* Connection Quality */}
          <div
            className={`w-3 h-3 rounded-full ${getQualityColor(qualityLevel)} shadow-lg`}
            title={`Quality: ${qualityLevel} - Bitrate: ${(stats.bitrate / 1000).toFixed(0)}kbps`}
          />

          {/* Stats on Hover */}
          <div className="hidden group-hover:block absolute top-6 right-0 bg-gray-900/95 rounded-lg p-3 text-xs whitespace-nowrap z-10 border border-gray-700">
            <div className="text-gray-300">Bitrate: <span className="text-white font-medium">{(stats.bitrate / 1000).toFixed(0)}kbps</span></div>
            <div className="text-gray-300">FPS: <span className="text-white font-medium">{stats.framerate.toFixed(0)}</span></div>
            <div className="text-gray-300">
              Res: <span className="text-white font-medium">{stats.resolution.width}x{stats.resolution.height}</span>
            </div>
            <div className="text-gray-300">RTT: <span className="text-white font-medium">{stats.latency.toFixed(0)}ms</span></div>
          </div>
        </div>
      )}

      {/* Connection Error */}
      {connectionState?.state === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <p className="text-red-400 font-semibold">Connection Failed</p>
            <p className="text-xs text-gray-400 mt-1">Attempting to reconnect...</p>
          </div>
        </div>
      )}
    </div>
  )
}
