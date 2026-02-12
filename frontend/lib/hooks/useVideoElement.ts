import { useEffect, useRef, useCallback } from 'react'
import { useVideoStore } from '@/lib/context/video'

export interface UseVideoElementOptions {
  participantId: string
  kind: 'audio' | 'video' | 'screen'
  autoplay?: boolean
  muted?: boolean
}

export function useVideoElement(options: UseVideoElementOptions) {
  const { participantId, kind } = options
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Get stable action references from store
  const addVideoElement = useVideoStore((state) => state.addVideoElement)
  const removeVideoElement = useVideoStore((state) => state.removeVideoElement)
  const setConnectionState = useVideoStore((state) => state.setConnectionState)
  const videoTracks = useVideoStore((state) => state.videoTracks)
  const remoteStreams = useVideoStore((state) => state.remoteStreams)
  const connectionStates = useVideoStore((state) => state.connectionStates)
  
  const logger = console

  // Register video element in store
  useEffect(() => {
    if (videoRef.current) {
      const elementId = `${participantId}-${kind}`
      addVideoElement(
        elementId,
        {
          id: elementId,
          participantId,
          kind,
          element: videoRef.current,
        }
      )

      logger.log(`[useVideoElement] Registered video element for ${participantId}/${kind}`)

      return () => {
        removeVideoElement(elementId)
        logger.log(`[useVideoElement] Unregistered video element for ${participantId}/${kind}`)
      }
    }
  }, [participantId, kind, addVideoElement, removeVideoElement])

  // Attach track when available
  useEffect(() => {
    const elementId = `${participantId}-${kind}`
    const videoTrack = videoTracks.get(elementId)

    if (videoRef.current && videoTrack && videoTrack.track) {
      const stream = new MediaStream([videoTrack.track])
      videoRef.current.srcObject = stream
      logger.log(`[useVideoElement] Attached track to ${elementId}`)

      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }
    }
  }, [participantId, kind, videoTracks])

  // Attach remote stream when available (from mediasoup consumers)
  useEffect(() => {
    const remoteStream = remoteStreams.get(participantId)

    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
      logger.log(`[useVideoElement] Attached remote stream to ${participantId}`)

      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }
    }
  }, [participantId, remoteStreams])

  // Handle connection state changes
  useEffect(() => {
    const elementId = `${participantId}-${kind}`
    const connectionInfo = connectionStates.get(elementId)

    if (connectionInfo) {
      logger.log(`[useVideoElement] Connection state for ${elementId}:`, connectionInfo.state)

      // Could emit event or update UI based on connection state
      if (connectionInfo.state === 'failed' || connectionInfo.state === 'closed') {
        logger.warn(`[useVideoElement] Connection failed for ${elementId}`)
      }
    }
  }, [participantId, kind, connectionStates])

  const updateConnectionState = useCallback(
    (state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed') => {
      setConnectionState(`${participantId}-${kind}`, {
        state,
        bitrate: 0,
        framerate: 0,
        resolution: { width: 0, height: 0 },
      })
    },
    [participantId, kind, setConnectionState]
  )

  return {
    videoRef,
    setConnectionState: updateConnectionState,
    connectionState: connectionStates.get(`${participantId}-${kind}`),
  }
}
