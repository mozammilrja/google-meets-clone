import { useEffect, useState, useCallback } from 'react'
import { useVideoStore } from '@/lib/context/video'

export interface StatsMonitor {
  bitrate: number
  framerate: number
  resolution: { width: number; height: number }
  packetLoss: number
  latency: number
}

export interface UseStatsOptions {
  peerConnection?: RTCPeerConnection | null
  participantId?: string
  kind?: 'audio' | 'video' | 'screen'
  interval?: number // milliseconds between stats checks
}

export function useConnectionStats(options: UseStatsOptions) {
  const {
    peerConnection,
    participantId,
    kind,
    interval = 1000, // 1 second default
  } = options

  const [stats, setStats] = useState<StatsMonitor>({
    bitrate: 0,
    framerate: 0,
    resolution: { width: 0, height: 0 },
    packetLoss: 0,
    latency: 0,
  })

  const videoStore = useVideoStore()
  const logger = console

  const updateStats = useCallback(async () => {
    if (!peerConnection) return

    try {
      const report = await peerConnection.getStats()

      let inboundStats: any = null
      let outboundStats: any = null
      let candidatePair: any = null

      report.forEach((stat) => {
        if (stat.type === 'inbound-rtp' && (stat as any).kind === 'video') {
          inboundStats = stat
        }
        if (stat.type === 'outbound-rtp' && (stat as any).kind === 'video') {
          outboundStats = stat
        }
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          candidatePair = stat
        }
      })

      const newStats: StatsMonitor = {
        bitrate: 0,
        framerate: 0,
        resolution: { width: 0, height: 0 },
        packetLoss: 0,
        latency: 0,
      }

      // Calculate bitrate and framerate from inbound stats
      if (inboundStats) {
        newStats.bitrate = Math.round(
          ((inboundStats.bytesReceived || 0) * 8) / (interval / 1000)
        )
        newStats.framerate = inboundStats.framesPerSecond || 0
        newStats.resolution = {
          width: inboundStats.frameWidth || 0,
          height: inboundStats.frameHeight || 0,
        }
        newStats.packetLoss = inboundStats.packetsLost || 0
      }

      // Calculate bitrate from outbound stats
      if (outboundStats) {
        newStats.bitrate = Math.round(
          ((outboundStats.bytesSent || 0) * 8) / (interval / 1000)
        )
        newStats.framerate = outboundStats.framesPerSecond || 0
        newStats.resolution = {
          width: outboundStats.frameWidth || 0,
          height: outboundStats.frameHeight || 0,
        }
      }

      // Get latency from candidate pair
      if (candidatePair) {
        newStats.latency = candidatePair.currentRoundTripTime
          ? Math.round(candidatePair.currentRoundTripTime * 1000)
          : 0
      }

      setStats(newStats)

      // Update video store if participant and kind specified
      if (participantId && kind) {
        videoStore.setConnectionState(`${participantId}-${kind}`, {
          state: 'connected',
          ...newStats,
        })
      }

      logger.debug('[useConnectionStats] Stats updated:', newStats)
    } catch (error) {
      logger.error('[useConnectionStats] Failed to get stats:', error)
    }
  }, [peerConnection, participantId, kind, interval, videoStore])

  // Poll stats periodically
  useEffect(() => {
    if (!peerConnection) return

    const intervalId = setInterval(updateStats, interval)

    // Initial update
    updateStats()

    return () => clearInterval(intervalId)
  }, [peerConnection, interval, updateStats])

  const getQualityLevel = useCallback((): 'poor' | 'fair' | 'good' | 'excellent' => {
    // Determine quality based on metrics
    if (stats.bitrate < 500000) return 'poor'
    if (stats.bitrate < 1000000) return 'fair'
    if (stats.bitrate < 2500000) return 'good'
    return 'excellent'
  }, [stats])

  return {
    stats,
    qualityLevel: getQualityLevel(),
    isMonitoring: !!peerConnection,
  }
}
