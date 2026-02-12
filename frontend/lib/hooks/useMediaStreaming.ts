'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { mediaService } from '@/lib/services/media'
import { useVideoStore } from '@/lib/context/video'

export interface MediaStreamingState {
  isConnected: boolean
  isJoined: boolean
  isDeviceReady: boolean
  isProducingAudio: boolean
  isProducingVideo: boolean
  isScreenSharing: boolean
  error: string | null
}

export function useMediaStreaming() {
  const [state, setState] = useState<MediaStreamingState>({
    isConnected: false,
    isJoined: false,
    isDeviceReady: false,
    isProducingAudio: false,
    isProducingVideo: false,
    isScreenSharing: false,
    error: null,
  })

  const videoStore = useVideoStore()
  const initializingRef = useRef(false)
  const audioProducerRef = useRef<any>(null)
  const videoProducerRef = useRef<any>(null)
  const screenProducerRef = useRef<any>(null)

  /**
   * Connect to media server
   */
  const connect = useCallback(async (mediaUrl: string, token: string) => {
    try {
      await mediaService.connect(mediaUrl, token)
      setState(prev => ({ ...prev, isConnected: true, error: null }))
      console.log('[useMediaStreaming] Connected to media server')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Connection failed'
      setState(prev => ({ ...prev, error: msg }))
      throw error
    }
  }, [])

  /**
   * STRICT initialization flow (DO NOT CHANGE ORDER):
   * 1. Join room -> server returns routerRtpCapabilities (stored in mediaService)
   * 2. Initialize device (uses stored routerRtpCapabilities)
   * 3. Create send transport
   * 4. Create recv transport
   * 
   * MUST call connect() before this method
   */
  const joinAndInitialize = useCallback(async (roomId: string, participantId: string) => {
    if (initializingRef.current) {
      console.log('[useMediaStreaming] Already initializing')
      return
    }

    if (!mediaService.isConnected()) {
      throw new Error('Not connected to media server. Call connect() first.')
    }

    initializingRef.current = true
    setState(prev => ({ ...prev, error: null }))

    try {
      // Step 1: Join room - server returns routerRtpCapabilities (stored internally)
      console.log('[useMediaStreaming] Step 1: Joining room:', roomId)
      const joinResponse = await mediaService.joinRoom(roomId, participantId)
      setState(prev => ({ ...prev, isJoined: true }))
      console.log('[useMediaStreaming] Joined room, routerRtpCapabilities received')

      // Step 2: Initialize device (uses stored routerRtpCapabilities from joinRoom)
      console.log('[useMediaStreaming] Step 2: device.load({ routerRtpCapabilities })...')
      await mediaService.initializeDevice()
      setState(prev => ({ ...prev, isDeviceReady: true }))
      console.log('[useMediaStreaming] Device initialized')

      // Step 3: Create send transport
      console.log('[useMediaStreaming] Step 3: Creating send transport...')
      await mediaService.createSendTransport()

      // Step 4: Create recv transport
      console.log('[useMediaStreaming] Step 4: Creating recv transport...')
      await mediaService.createRecvTransport()

      console.log('[useMediaStreaming] Initialization complete - ready to produce/consume')

      // Handle existing producers in the room
      if (joinResponse.existingProducers?.length) {
        console.log('[useMediaStreaming] Consuming existing producers:', joinResponse.existingProducers.length)
        for (const prod of joinResponse.existingProducers) {
          try {
            await consumeRemoteProducer(prod.producerId, prod.peerId)
          } catch (e) {
            console.error('[useMediaStreaming] Failed to consume:', e)
          }
        }
      }
      
      return joinResponse
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Initialization failed'
      console.error('[useMediaStreaming] Error:', error)
      setState(prev => ({ ...prev, error: msg }))
      throw error
    } finally {
      initializingRef.current = false
    }
  }, [])

  /**
   * Start producing audio
   */
  const startAudio = useCallback(async (stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) throw new Error('No audio track in stream')

      const producer = await mediaService.produce(audioTrack, { source: 'mic' })
      audioProducerRef.current = producer
      setState(prev => ({ ...prev, isProducingAudio: true }))
      
      console.log('[useMediaStreaming] Audio producer started:', producer.id)
      return producer
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start audio'
      setState(prev => ({ ...prev, error: msg }))
      throw error
    }
  }, [])

  /**
   * Start producing video
   */
  const startVideo = useCallback(async (stream: MediaStream) => {
    try {
      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) throw new Error('No video track in stream')

      const producer = await mediaService.produce(videoTrack, { source: 'camera' })
      videoProducerRef.current = producer
      setState(prev => ({ ...prev, isProducingVideo: true }))
      
      console.log('[useMediaStreaming] Video producer started:', producer.id)
      return producer
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start video'
      setState(prev => ({ ...prev, error: msg }))
      throw error
    }
  }, [])

  /**
   * Stop audio producer
   */
  const stopAudio = useCallback(async () => {
    if (audioProducerRef.current) {
      await mediaService.closeProducer(audioProducerRef.current.id)
      audioProducerRef.current = null
      setState(prev => ({ ...prev, isProducingAudio: false }))
      console.log('[useMediaStreaming] Audio stopped')
    }
  }, [])

  /**
   * Stop video producer
   */
  const stopVideo = useCallback(async () => {
    if (videoProducerRef.current) {
      await mediaService.closeProducer(videoProducerRef.current.id)
      videoProducerRef.current = null
      setState(prev => ({ ...prev, isProducingVideo: false }))
      console.log('[useMediaStreaming] Video stopped')
    }
  }, [])

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(async (enabled: boolean, stream: MediaStream) => {
    if (enabled && !audioProducerRef.current) {
      await startAudio(stream)
    } else if (!enabled && audioProducerRef.current) {
      audioProducerRef.current.pause()
    } else if (enabled && audioProducerRef.current) {
      audioProducerRef.current.resume()
    }
  }, [startAudio])

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async (enabled: boolean, stream: MediaStream) => {
    if (enabled && !videoProducerRef.current) {
      await startVideo(stream)
    } else if (!enabled && videoProducerRef.current) {
      videoProducerRef.current.pause()
    } else if (enabled && videoProducerRef.current) {
      videoProducerRef.current.resume()
    }
  }, [startVideo])

  /**
   * Replace video track
   */
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    if (videoProducerRef.current) {
      await videoProducerRef.current.replaceTrack({ track: newTrack })
      console.log('[useMediaStreaming] Video track replaced')
    }
  }, [])

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      })

      const screenTrack = stream.getVideoTracks()[0]
      const producer = await mediaService.produce(screenTrack, { source: 'screen' })
      screenProducerRef.current = producer
      setState(prev => ({ ...prev, isScreenSharing: true }))

      // Handle user stopping screen share via browser UI
      screenTrack.onended = () => {
        stopScreenShare()
      }

      console.log('[useMediaStreaming] Screen sharing started:', producer.id)
      return producer
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start screen share'
      setState(prev => ({ ...prev, error: msg }))
      throw error
    }
  }, [])

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    if (screenProducerRef.current) {
      await mediaService.closeProducer(screenProducerRef.current.id)
      screenProducerRef.current = null
      setState(prev => ({ ...prev, isScreenSharing: false }))
      console.log('[useMediaStreaming] Screen sharing stopped')
    }
  }, [])

  /**
   * Consume a remote producer
   */
  const consumeRemoteProducer = useCallback(async (producerId: string, peerId: string) => {
    try {
      const { consumer, stream } = await mediaService.consume(producerId, peerId)
      
      // Add track to remote stream (merges with existing tracks for same peer)
      const track = stream.getTracks()[0]
      if (track) {
        videoStore.addTrackToRemoteStream(peerId, track)
      }
      
      console.log('[useMediaStreaming] Consuming remote producer:', producerId, 'kind:', consumer.kind)
      return { consumer, stream }
    } catch (error) {
      console.error('[useMediaStreaming] Failed to consume:', error)
      throw error
    }
  }, [videoStore])

  /**
   * Cleanup everything
   */
  const cleanup = useCallback(() => {
    console.log('[useMediaStreaming] Cleaning up...')
    
    audioProducerRef.current = null
    videoProducerRef.current = null
    screenProducerRef.current = null
    
    mediaService.disconnect()
    videoStore.clear()
    
    setState({
      isConnected: false,
      isJoined: false,
      isDeviceReady: false,
      isProducingAudio: false,
      isProducingVideo: false,
      isScreenSharing: false,
      error: null,
    })
  }, [videoStore])

  // Setup event listeners
  useEffect(() => {
    const handleNewProducer = async (data: { participantId: string; producerId: string; kind: string }) => {
      console.log('[useMediaStreaming] New remote producer:', data)
      try {
        await consumeRemoteProducer(data.producerId, data.participantId)
      } catch (e) {
        console.error('[useMediaStreaming] Failed to consume new producer:', e)
      }
    }

    const handleProducerClosed = (data: { participantId: string; producerId: string; kind?: string }) => {
      console.log('[useMediaStreaming] Producer closed:', data)
      // Only remove the stream entirely if there are no more producers for this participant
      // For now, we let the tracks remain - they'll be cleaned up when participant leaves
    }

    const handleDisconnected = () => {
      setState(prev => ({ ...prev, isConnected: false, isJoined: false }))
    }

    mediaService.on('newProducer', handleNewProducer)
    mediaService.on('producerClosed', handleProducerClosed)
    mediaService.on('disconnected', handleDisconnected)

    return () => {
      mediaService.off('newProducer', handleNewProducer)
      mediaService.off('producerClosed', handleProducerClosed)
      mediaService.off('disconnected', handleDisconnected)
    }
  }, [consumeRemoteProducer, videoStore])

  return {
    state,
    connect,
    joinAndInitialize,
    startAudio,
    startVideo,
    stopAudio,
    stopVideo,
    toggleAudio,
    toggleVideo,
    replaceVideoTrack,
    startScreenShare,
    stopScreenShare,
    consumeRemoteProducer,
    cleanup,
    // Direct access to service for advanced usage
    mediaService,
  }
}
