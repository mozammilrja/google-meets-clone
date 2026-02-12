'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { VideoTile } from '../components/VideoTile'
import { Chat } from '../components/Chat'
import { useAuth } from '@/lib/hooks/useAuth'
import { useMeetingStore } from '@/lib/context/meeting'
import { useSignaling } from '@/lib/hooks/useSignaling'
import { useMedia } from '@/lib/hooks/useMedia'
import { useMediaStreaming } from '@/lib/hooks/useMediaStreaming'
import { apiClient } from '@/lib/services/api'
import { signalingService } from '@/lib/services/signaling'
import { Participant } from '@/lib/types'

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string

  // Defensive check: Redirect if meeting ID is invalid
  useEffect(() => {
    if (!meetingId || meetingId === 'undefined' || meetingId === 'null') {
      console.error('[Meeting] Invalid meeting ID detected:', meetingId)
      router.replace('/meeting/lobby')
    }
  }, [meetingId, router])

  // Auth & state
  const { isAuthenticated, user } = useAuth()
  const { participants, setLocalParticipant, addParticipant, removeParticipant, localParticipant } = useMeetingStore()

  // Services
  const { isConnected: signalingConnected } = useSignaling()
  const { isConnected: mediaConnected } = useMedia()

  // Media streaming
  const mediaStreaming = useMediaStreaming()

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(true)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Initialize device and join meeting
  // STRICT ORDER: connect -> joinRoom -> initializeDevice -> createTransports -> produce
  useEffect(() => {
    if (!isAuthenticated || !signalingConnected || !mediaConnected) return

    const initializeMeeting = async () => {
      try {
        setIsLoading(true)

        // Get local media stream first (before mediasoup setup)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: isAudioEnabled,
          video: isVideoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        })
        localStreamRef.current = stream

        // Join meeting via backend to get participant ID
        const participantData = await apiClient.joinMeeting(meetingId, user?.name || 'Guest')

        // STRICT ORDER:
        // 1. joinAndInitialize() does: joinRoom -> initializeDevice -> createTransports
        console.log('[Meeting] Joining SFU room and initializing device...')
        const joinResponse = await mediaStreaming.joinAndInitialize(meetingId, participantData.participantId)

        // Note: We don't add participants here from existingProducers
        // The signaling server will send participant-joined events with proper names
        // This avoids duplicates with generic "Participant" names
        if (joinResponse?.existingProducers?.length) {
          console.log('[Meeting] Found existing producers, will consume them:', joinResponse.existingProducers.length)
        }

        // 2. Now start producing audio/video
        if (isAudioEnabled && stream.getAudioTracks().length > 0) {
          console.log('[Meeting] Starting audio producer...')
          await mediaStreaming.startAudio(stream)
        }
        if (isVideoEnabled && stream.getVideoTracks().length > 0) {
          console.log('[Meeting] Starting video producer...')
          await mediaStreaming.startVideo(stream)
        }

        setLocalParticipant({
          id: participantData.participantId,
          name: user?.name || 'Guest',
          audio: isAudioEnabled,
          video: isVideoEnabled,
          screenSharing: false,
        })

        // Join meeting via signaling
        signalingService.joinMeeting(meetingId, user?.id || '', participantData.participantId)

        setIsLoading(false)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize meeting'
        console.error('[Meeting] Initialization failed:', err)
        setError(errorMsg)
        setIsLoading(false)
      }
    }

    initializeMeeting()

    return () => {
      mediaStreaming.cleanup()
    }
  }, [isAuthenticated, signalingConnected, mediaConnected])

  // Listen for participant events
  useEffect(() => {
    const handleParticipantJoined = async (data: any) => {
      console.log('[Meeting] Participant joined:', data)
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

      // Create consumers for remote participant's producers
      if (data.producers) {
        for (const producer of data.producers) {
          if (producer.kind === 'audio' || producer.kind === 'video') {
            try {
              await mediaStreaming.consumeRemoteProducer(
                producer.id,
                data.participantId
              )
            } catch (err) {
              console.error(`Failed to consume ${producer.kind} from ${data.participantId}:`, err)
            }
          }
        }
      }
    }

    const handleParticipantLeft = async (data: any) => {
      console.log('[Meeting] Participant left:', data)
      removeParticipant(data.participantId)
      // Consumers are automatically cleaned up by the media service
    }

    signalingService.on('participant-joined', handleParticipantJoined)
    signalingService.on('participant-left', handleParticipantLeft)

    return () => {
      signalingService.off('participant-joined', handleParticipantJoined)
      signalingService.off('participant-left', handleParticipantLeft)
    }
  }, [meetingId, localParticipant])

  // Track participants in a ref to avoid infinite loops
  const participantsRef = useRef<Participant[]>([])
  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  // Listen for media server participant events
  useEffect(() => {
    const { mediaService } = mediaStreaming

    const handleMediaParticipantJoined = (data: { participantId: string; userId: string }) => {
      console.log('[Meeting] Media server: Participant joined:', data)
      // Check if participant already exists using ref
      const exists = participantsRef.current.some(p => p.id === data.participantId)
      if (!exists && data.participantId !== localParticipant?.id) {
        const participant: Participant = {
          id: data.participantId,
          meetingId,
          userId: data.userId,
          name: 'Participant',
          role: 'participant',
          status: 'joined',
          audio: true,
          video: true,
          screenSharing: false,
          joinedAt: new Date().toISOString(),
        }
        addParticipant(participant)
      }
    }

    const handleMediaParticipantLeft = (data: { participantId: string }) => {
      console.log('[Meeting] Media server: Participant left:', data)
      removeParticipant(data.participantId)
    }

    const handleNewProducer = (data: { participantId: string; producerId: string; kind: string }) => {
      console.log('[Meeting] Media server: New producer from:', data.participantId)
      // Ensure participant exists when we receive their producer using ref
      const exists = participantsRef.current.some(p => p.id === data.participantId)
      if (!exists && data.participantId !== localParticipant?.id) {
        console.log('[Meeting] Adding participant from newProducer event:', data.participantId)
        addParticipant({
          id: data.participantId,
          meetingId,
          userId: data.participantId,
          name: 'Participant',
          role: 'participant',
          status: 'joined',
          audio: data.kind === 'audio' || true,
          video: data.kind === 'video' || true,
          screenSharing: false,
          joinedAt: new Date().toISOString(),
        })
      }
    }

    mediaService.on('participantJoined', handleMediaParticipantJoined)
    mediaService.on('participantLeft', handleMediaParticipantLeft)
    mediaService.on('newProducer', handleNewProducer)

    return () => {
      mediaService.off('participantJoined', handleMediaParticipantJoined)
      mediaService.off('participantLeft', handleMediaParticipantLeft)
      mediaService.off('newProducer', handleNewProducer)
    }
  }, [meetingId, localParticipant, addParticipant, removeParticipant, mediaStreaming])

  const handleToggleAudio = async () => {
    try {
      if (!localStreamRef.current) throw new Error('No local stream available')
      await mediaStreaming.toggleAudio(!isAudioEnabled, localStreamRef.current)
      setIsAudioEnabled(!isAudioEnabled)

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
  }

  const handleToggleVideo = async () => {
    try {
      if (!localStreamRef.current) throw new Error('No local stream available')
      await mediaStreaming.toggleVideo(!isVideoEnabled, localStreamRef.current)
      setIsVideoEnabled(!isVideoEnabled)

      if (localParticipant) {
        signalingService.updateMediaState({
          meetingId,
          participantId: localParticipant.id,
          audio: isAudioEnabled,
          video: !isVideoEnabled,
          screenSharing: isScreenSharing,
        })
      }
    } catch (err) {
      console.error('Failed to toggle video:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle video')
    }
  }

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await mediaStreaming.startScreenShare()
        setIsScreenSharing(true)
      } else {
        await mediaStreaming.stopScreenShare()
        setIsScreenSharing(false)
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
  }

  const handleLeaveMeeting = async () => {
    try {
      mediaStreaming.cleanup()
      if (localParticipant) {
        await apiClient.leaveMeeting(meetingId, localParticipant.id)
        signalingService.leaveMeeting(meetingId, localParticipant.id)
      }
      router.push('/meeting/lobby')
    } catch (err) {
      console.error('Failed to leave meeting:', err)
      router.push('/meeting/lobby')
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Status Bar */}
      {mediaStreaming.state.error && (
        <div className="h-8 bg-red-600/20 border-b border-red-600 px-4 flex items-center text-xs text-red-200">
          {mediaStreaming.state.error}
        </div>
      )}

      {/* Header */}
      <div className="h-16 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{localParticipant?.name || 'Meeting'}</h2>
          <p className="text-xs text-slate-400">
            {participants.length + 1} participant(s)
            {!mediaStreaming.state.isConnected && ' • Connecting...'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="text-xs text-slate-400 space-y-1 text-right">
            <div>
              Audio: {mediaStreaming.state.isProducingAudio ? '✓' : '✗'}
            </div>
            <div>
              Video: {mediaStreaming.state.isProducingVideo ? '✓' : '✗'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4 bg-slate-900/30">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <p className="text-slate-300">Initializing meeting...</p>
              <p className="text-xs text-slate-400 mt-1">
                Setting up video, audio, and media server...
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
              {/* Local Video */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">You</p>
                      <p className="text-xs text-slate-300">
                        {isAudioEnabled ? '🎤' : '🔇'}
                        {' '}
                        {isVideoEnabled ? '📹' : '📴'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-600 rounded">Local</span>
                  </div>
                </div>

                {/* Loading State */}
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50">
                    <p className="text-slate-300">Camera Off</p>
                  </div>
                )}
              </div>

              {/* Remote Videos */}
              {participants.map((participant) => (
                <div key={participant.id}>
                  <VideoTile
                    participantId={participant.id}
                    name={participant.name}
                    kind="video"
                    isLocal={false}
                    peerConnection={peerConnectionRef.current}
                  />
                </div>
              ))}

              {/* Screen Share (if sharing) */}
              {isScreenSharing && (
                <div className="col-span-full">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <div className="w-full h-full flex items-center justify-center bg-slate-700">
                      <p className="text-slate-300">Screen Sharing - Your screen will appear here</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Empty State */}
            {participants.length === 0 && (
              <div className="mt-8 text-center">
                <p className="text-slate-400">Waiting for other participants...</p>
                <p className="text-xs text-slate-500 mt-2">
                  Share the meeting code or link to invite others
                </p>
              </div>
            )}
          </div>
        )}

        {/* Chat Panel */}
        {isChatVisible && localParticipant && (
          <div className="w-80 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
            <Chat
              meetingId={meetingId}
              participantId={localParticipant.id}
              participantName={localParticipant.name}
              isVisible={true}
            />
          </div>
        )}
      </div>

      {/* Controls Bottom Bar */}
      <div className="h-24 border-t border-slate-700 bg-slate-800/80 backdrop-blur-sm px-6 py-4 flex flex-col items-center justify-between">
        {/* Action Buttons */}
        <div className="flex gap-3 items-center">
          {/* Mute/Unmute */}
          <button
            onClick={handleToggleAudio}
            disabled={isLoading}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${
              isAudioEnabled
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            <span className="text-xl">{isAudioEnabled ? '🎤' : '🔇'}</span>
          </button>

          {/* Stop/Start Video */}
          <button
            onClick={handleToggleVideo}
            disabled={isLoading}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${
              isVideoEnabled
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            <span className="text-xl">{isVideoEnabled ? '📹' : '📴'}</span>
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            disabled={isLoading}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${
              isChatVisible
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-700 hover:bg-slate-600'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isChatVisible ? 'Hide Chat' : 'Show Chat'}
          >
            <span className="text-xl">💬</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            disabled={isLoading}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition transform hover:scale-110 ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-700 hover:bg-slate-600'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <span className="text-xl">{isScreenSharing ? '⏹️' : '🖥️'}</span>
          </button>

          {/* Leave */}
          <button
            onClick={handleLeaveMeeting}
            disabled={isLoading}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Leave Meeting"
          >
            <span className="text-xl">📞</span>
          </button>
        </div>

        {/* Connection Status */}
        {!mediaStreaming.state.isConnected && (
          <p className="text-xs text-yellow-400 mt-2">
            Connecting to media server...
          </p>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-32 right-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm max-w-sm animate-pulse">
          {error}
        </div>
      )}
    </div>
  )
}
