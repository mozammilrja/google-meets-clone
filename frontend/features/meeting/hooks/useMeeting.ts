'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSignaling } from '@/lib/hooks/useSignaling'
import { useMedia } from '@/lib/hooks/useMedia'
import { useMediaStreaming } from '@/lib/hooks/useMediaStreaming'
import { apiClient } from '@/lib/services/api'
import { signalingService } from '@/lib/services/signaling'
import { Participant } from '@/lib/types'
import {
  useMediaControlsStore,
  useUIPanelsStore,
  useReactionsStore,
  useCaptionsStore,
  useMeetingSessionStore,
} from '../stores'

interface UseMeetingOptions {
  meetingId: string
  onError?: (error: string) => void
}

/**
 * Main meeting hook that orchestrates all meeting functionality
 * Handles initialization, media controls, and cleanup
 */
export function useMeeting({ meetingId, onError }: UseMeetingOptions) {
  const { isAuthenticated, user } = useAuth()
  const { isConnected: signalingConnected } = useSignaling()
  const { isConnected: mediaConnected } = useMedia()
  const mediaStreaming = useMediaStreaming()
  
  // Store actions
  const setLoading = useMeetingSessionStore(state => state.setLoading)
  const setError = useMeetingSessionStore(state => state.setError)
  const setConnected = useMeetingSessionStore(state => state.setConnected)
  const setLocalParticipant = useMeetingSessionStore(state => state.setLocalParticipant)
  const addParticipant = useMeetingSessionStore(state => state.addParticipant)
  const removeParticipant = useMeetingSessionStore(state => state.removeParticipant)
  const localParticipant = useMeetingSessionStore(state => state.localParticipant)
  
  const setAudioEnabled = useMediaControlsStore(state => state.setAudioEnabled)
  const setVideoEnabled = useMediaControlsStore(state => state.setVideoEnabled)
  const setHasVideoTrack = useMediaControlsStore(state => state.setHasVideoTrack)
  const setScreenSharing = useMediaControlsStore(state => state.setScreenSharing)
  const setAudioDevices = useMediaControlsStore(state => state.setAudioDevices)
  const setVideoDevices = useMediaControlsStore(state => state.setVideoDevices)
  const isAudioEnabled = useMediaControlsStore(state => state.isAudioEnabled)
  const isVideoEnabled = useMediaControlsStore(state => state.isVideoEnabled)
  const isScreenSharing = useMediaControlsStore(state => state.isScreenSharing)
  
  const setHandRaised = useReactionsStore(state => state.setHandRaised)
  const addReaction = useReactionsStore(state => state.addReaction)
  const setParticipantHandRaised = useReactionsStore(state => state.setParticipantHandRaised)
  const isHandRaised = useReactionsStore(state => state.isHandRaised)
  
  const setCaptionsEnabled = useCaptionsStore(state => state.setEnabled)
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const initializingRef = useRef(false)
  const cleanupRef = useRef<(() => void)[]>([])
  
  // Initialize meeting
  useEffect(() => {
    if (!isAuthenticated || !signalingConnected || !mediaConnected || initializingRef.current) {
      return
    }
    
    initializingRef.current = true
    
    const initialize = async () => {
      try {
        setLoading(true)
        
        // Get local media stream
        let stream: MediaStream | null = null
        let hasAudio = false
        let hasVideo = false
        
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          hasAudio = stream.getAudioTracks().length > 0
          hasVideo = stream.getVideoTracks().length > 0
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            hasAudio = stream.getAudioTracks().length > 0
          } catch {
            console.warn('No media devices available')
          }
        }
        
        if (stream) {
          localStreamRef.current = stream
          setAudioEnabled(hasAudio)
          setVideoEnabled(hasVideo)
          setHasVideoTrack(hasVideo)
        } else {
          setAudioEnabled(false)
          setVideoEnabled(false)
          setHasVideoTrack(false)
        }
        
        // Join meeting via API
        const participantData = await apiClient.joinMeeting(meetingId, user?.name || 'Guest')
        
        // Initialize media streaming
        await mediaStreaming.joinAndInitialize(meetingId, participantData.participantId)
        
        // Start producing
        if (stream && hasAudio) {
          await mediaStreaming.startAudio(stream)
        }
        if (stream && hasVideo) {
          await mediaStreaming.startVideo(stream)
        }
        
        // Set local participant
        setLocalParticipant({
          id: participantData.participantId,
          name: user?.name || 'Guest',
          email: user?.email,
        })
        
        // Join signaling
        signalingService.joinMeeting(meetingId, user?.id || '', participantData.participantId, user?.name || 'Guest')
        
        setConnected(true)
        setLoading(false)
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize meeting'
        setError(errorMsg)
        setLoading(false)
        onError?.(errorMsg)
      }
    }
    
    initialize()
  }, [isAuthenticated, signalingConnected, mediaConnected])
  
  // Enumerate devices
  useEffect(() => {
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
      } catch (err) {
        console.error('Failed to enumerate devices:', err)
      }
    }
    enumerate()
    
    navigator.mediaDevices.addEventListener('devicechange', enumerate)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate)
  }, [setAudioDevices, setVideoDevices])
  
  // Listen for participant events
  useEffect(() => {
    const handleParticipantJoined = async (data: any) => {
      const participant: Participant = {
        id: data.participantId,
        meetingId,
        userId: data.userId,
        name: data.name,
        role: 'participant',
        status: 'joined',
        audio: data.audio ?? true,
        video: data.video ?? true,
        screenSharing: data.screenSharing ?? false,
        joinedAt: new Date().toISOString(),
      }
      addParticipant(participant)
      
      // Consume remote producers
      if (data.producers) {
        for (const producer of data.producers) {
          try {
            await mediaStreaming.consumeRemoteProducer(producer.id, data.participantId)
          } catch (err) {
            console.error(`Failed to consume ${producer.kind}:`, err)
          }
        }
      }
    }
    
    const handleParticipantLeft = (data: any) => {
      removeParticipant(data.participantId)
    }
    
    const handleReactionReceived = (data: any) => {
      if (data.participantId !== localParticipant?.id) {
        addReaction({
          emoji: data.emoji,
          participantId: data.participantId,
          participantName: data.participantName,
          x: Math.random() * 60 + 20,
        })
      }
    }
    
    const handleHandRaiseChanged = (data: any) => {
      setParticipantHandRaised(data.participantId, data.raised)
    }
    
    signalingService.on('participant-joined', handleParticipantJoined)
    signalingService.on('participant-left', handleParticipantLeft)
    signalingService.on('reaction-received', handleReactionReceived)
    signalingService.on('hand-raise-changed', handleHandRaiseChanged)
    
    cleanupRef.current.push(() => {
      signalingService.off('participant-joined', handleParticipantJoined)
      signalingService.off('participant-left', handleParticipantLeft)
      signalingService.off('reaction-received', handleReactionReceived)
      signalingService.off('hand-raise-changed', handleHandRaiseChanged)
    })
    
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
    }
  }, [meetingId, localParticipant?.id])
  
  // Media control handlers
  const handleToggleAudio = useCallback(async () => {
    try {
      if (!localStreamRef.current) throw new Error('No local stream')
      await mediaStreaming.toggleAudio(!isAudioEnabled, localStreamRef.current)
      setAudioEnabled(!isAudioEnabled)
      
      if (localParticipant) {
        signalingService.updateMediaState({
          meetingId,
          participantId: localParticipant.id,
          audio: !isAudioEnabled,
          video: isVideoEnabled,
          screenSharing: isScreenSharing,
        })
      }
    } catch (err) {
      console.error('Failed to toggle audio:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle audio')
    }
  }, [isAudioEnabled, isVideoEnabled, isScreenSharing, localParticipant, meetingId])
  
  const handleToggleVideo = useCallback(async () => {
    try {
      const newState = !isVideoEnabled
      
      if (newState && !localStreamRef.current?.getVideoTracks().length) {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        const videoTrack = videoStream.getVideoTracks()[0]
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack)
        } else {
          localStreamRef.current = videoStream
        }
        
        setHasVideoTrack(true)
        await mediaStreaming.startVideo(localStreamRef.current!)
      } else if (localStreamRef.current) {
        await mediaStreaming.toggleVideo(newState, localStreamRef.current)
      }
      
      setVideoEnabled(newState)
      
      if (localParticipant) {
        signalingService.updateMediaState({
          meetingId,
          participantId: localParticipant.id,
          audio: isAudioEnabled,
          video: newState,
          screenSharing: isScreenSharing,
        })
      }
    } catch (err) {
      console.error('Failed to toggle video:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle video')
    }
  }, [isVideoEnabled, isAudioEnabled, isScreenSharing, localParticipant, meetingId])
  
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        await mediaStreaming.startScreenShare()
        setScreenSharing(true)
      } else {
        await mediaStreaming.stopScreenShare()
        setScreenSharing(false)
      }
      
      if (localParticipant) {
        signalingService.updateMediaState({
          meetingId,
          participantId: localParticipant.id,
          audio: isAudioEnabled,
          video: isVideoEnabled,
          screenSharing: !isScreenSharing,
        })
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle screen share')
    }
  }, [isScreenSharing, isAudioEnabled, isVideoEnabled, localParticipant, meetingId])
  
  const handleSendReaction = useCallback((emoji: string) => {
    if (!localParticipant) return
    
    signalingService.sendReaction({
      meetingId,
      participantId: localParticipant.id,
      emoji,
    })
    
    addReaction({
      emoji,
      participantId: localParticipant.id,
      participantName: 'You',
      x: Math.random() * 60 + 20,
    })
  }, [localParticipant, meetingId, addReaction])
  
  const handleToggleHand = useCallback(() => {
    if (!localParticipant) return
    
    const newState = !isHandRaised
    setHandRaised(newState)
    signalingService.raiseHand(meetingId, localParticipant.id, newState)
  }, [localParticipant, meetingId, isHandRaised, setHandRaised])
  
  const handleLeaveMeeting = useCallback(async () => {
    try {
      // Stop captions
      setCaptionsEnabled(false)
      
      // Lower hand
      if (isHandRaised && localParticipant) {
        signalingService.raiseHand(meetingId, localParticipant.id, false)
      }
      
      // Stop local media
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }
      
      // Cleanup media streaming
      mediaStreaming.cleanup()
      
      // Notify backend
      if (localParticipant) {
        await apiClient.leaveMeeting(meetingId, localParticipant.id)
        signalingService.leaveMeeting(meetingId, localParticipant.id)
      }
      
      // Disconnect signaling
      signalingService.disconnect()
      
      // Reset stores
      useMeetingSessionStore.getState().reset()
      useMediaControlsStore.getState().reset()
      useReactionsStore.getState().reset()
      useCaptionsStore.getState().reset()
      useUIPanelsStore.getState().reset()
      
    } catch (err) {
      console.error('Failed to leave meeting:', err)
    }
  }, [localParticipant, meetingId, isHandRaised, mediaStreaming])
  
  return {
    localVideoRef,
    localStream: localStreamRef.current,
    onToggleAudio: handleToggleAudio,
    onToggleVideo: handleToggleVideo,
    onToggleScreenShare: handleToggleScreenShare,
    onSendReaction: handleSendReaction,
    onToggleHand: handleToggleHand,
    onLeaveMeeting: handleLeaveMeeting,
  }
}
