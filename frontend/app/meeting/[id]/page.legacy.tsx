'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Smile, Hand, MoreVertical, MessageSquare, X, Copy, Check, UserPlus, Shield, Settings, Monitor, Moon, Sun, Link, Volume2 } from 'lucide-react'
import { useTheme } from 'next-themes'

// Reaction emojis available in the picker
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🤔']

// Floating reaction type
interface FloatingReaction {
  id: string
  emoji: string
  participantName: string
  x: number
}

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string
  const { theme, setTheme } = useTheme()

  // Defensive check: Redirect if meeting ID is invalid
  useEffect(() => {
    if (!meetingId || meetingId === 'undefined' || meetingId === 'null') {
      console.error('[Meeting] Invalid meeting ID detected:', meetingId)
      router.replace('/meeting/lobby')
    }
  }, [meetingId, router])

  // Auth & state
  const { isAuthenticated, user } = useAuth()
  const { participants, setLocalParticipant, addParticipant, removeParticipant, localParticipant, meetingCode } = useMeetingStore()

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
  const [hasVideoTrack, setHasVideoTrack] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [showMeetingReadyModal, setShowMeetingReadyModal] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Reactions state
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])

  // Raise hand state
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [participantHandsRaised, setParticipantHandsRaised] = useState<Map<string, boolean>>(new Map())

  // Captions state
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false)
  const [captionText, setCaptionText] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // More options menu state
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const moreOptionsRef = useRef<HTMLDivElement>(null)

  // Device selection state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
  const [showDeviceSettings, setShowDeviceSettings] = useState(false)

  // Stable time display (prevents blinking on re-renders)
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )

  // Update time once per minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Get meeting link
  const getMeetingLink = () => {
    if (typeof window === 'undefined') return ''
    const code = meetingCode || meetingId
    return `${window.location.origin}/join/${code}`
  }

  const copyMeetingLink = async () => {
    const link = getMeetingLink()
    await navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // Initialize device and join meeting
  // STRICT ORDER: connect -> joinRoom -> initializeDevice -> createTransports -> produce
  useEffect(() => {
    if (!isAuthenticated || !signalingConnected || !mediaConnected) return

    const initializeMeeting = async () => {
      try {
        setIsLoading(true)

        // Get local media stream first (before mediasoup setup)
        let stream: MediaStream | null = null
        let hasAudio = false
        let hasVideo = false

        try {
          // Try to get both audio and video
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          hasAudio = stream.getAudioTracks().length > 0
          hasVideo = stream.getVideoTracks().length > 0
          console.log('[Meeting] Got media stream - audio:', hasAudio, 'video:', hasVideo)
        } catch (mediaErr) {
          console.warn('[Meeting] Failed to get media, trying audio only:', mediaErr)
          try {
            // Try audio only
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            hasAudio = stream.getAudioTracks().length > 0
            console.log('[Meeting] Got audio-only stream')
          } catch (audioErr) {
            console.warn('[Meeting] Failed to get audio, continuing without media:', audioErr)
            // Continue without any media - still allow joining meeting
          }
        }

        if (stream) {
          localStreamRef.current = stream
          setIsAudioEnabled(hasAudio)
          setIsVideoEnabled(hasVideo)
          setHasVideoTrack(hasVideo)
        } else {
          setIsAudioEnabled(false)
          setIsVideoEnabled(false)
          setHasVideoTrack(false)
        }

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

        // 2. Now start producing audio/video (only if we have a stream)
        if (stream && hasAudio) {
          console.log('[Meeting] Starting audio producer...')
          await mediaStreaming.startAudio(stream)
        }
        if (stream && hasVideo) {
          console.log('[Meeting] Starting video producer...')
          await mediaStreaming.startVideo(stream)
        }

        setLocalParticipant({
          id: participantData.participantId,
          name: user?.name || 'Guest',
          audio: hasAudio,
          video: hasVideo,
          screenSharing: false,
        })

        // Join meeting via signaling
        signalingService.joinMeeting(meetingId, user?.id || '', participantData.participantId, user?.name || 'Guest')

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

  // Attach local stream to video element - only when stream changes
  useEffect(() => {
    const videoElement = localVideoRef.current
    const stream = localStreamRef.current
    
    if (videoElement && stream) {
      // Only reassign if srcObject is different (prevents blinking)
      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream
      }
    }
  }, [isVideoEnabled, hasVideoTrack])

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
      const newVideoState = !isVideoEnabled

      if (newVideoState) {
        // Enabling video - check if we have a video track, if not request one
        const existingStream = localStreamRef.current
        const existingVideoTracks = existingStream?.getVideoTracks().length ?? 0

        if (existingVideoTracks === 0) {
          try {
            // Request new video stream
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            const videoTrack = videoStream.getVideoTracks()[0]
            
            if (existingStream) {
              // Add video track to existing stream
              existingStream.addTrack(videoTrack)
            } else {
              // Create new stream with just video
              localStreamRef.current = videoStream
            }
            
            // Update state to reflect we now have video
            setHasVideoTrack(true)
            
            // Start producing video
            await mediaStreaming.startVideo(localStreamRef.current!)
          } catch (mediaErr) {
            console.error('Failed to get video:', mediaErr)
            setError('Camera access denied or not available')
            return
          }
        } else {
          // Resume existing video track
          await mediaStreaming.toggleVideo(true, existingStream!)
        }
      } else {
        // Disabling video - pause the producer
        if (localStreamRef.current) {
          await mediaStreaming.toggleVideo(false, localStreamRef.current)
        }
      }

      setIsVideoEnabled(newVideoState)

      if (localParticipant) {
        signalingService.updateMediaState({
          meetingId,
          participantId: localParticipant.id,
          audio: isAudioEnabled,
          video: newVideoState,
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
      // Stop captions if running
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      // Lower hand if raised
      if (isHandRaised && localParticipant) {
        signalingService.raiseHand(meetingId, localParticipant.id, false)
      }

      // Stop all local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        localStreamRef.current = null
      }

      // Cleanup media streaming (closes transports, producers, consumers)
      mediaStreaming.cleanup()

      // Notify backend and signaling server
      if (localParticipant) {
        await apiClient.leaveMeeting(meetingId, localParticipant.id)
        signalingService.leaveMeeting(meetingId, localParticipant.id)
      }

      // Disconnect signaling service
      signalingService.disconnect()

      router.push('/meeting/lobby')
    } catch (err) {
      console.error('Failed to leave meeting:', err)
      // Always navigate away even on error
      router.push('/meeting/lobby')
    }
  }

  // --- Reactions ---
  const handleSendReaction = useCallback((emoji: string) => {
    if (!localParticipant) return

    signalingService.sendReaction({
      meetingId,
      participantId: localParticipant.id,
      emoji,
    })

    // Show the reaction locally immediately (optimistic update)
    const reaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      participantName: 'You',
      x: Math.random() * 60 + 20, // Random x position between 20-80%
    }
    setFloatingReactions(prev => [...prev, reaction])
    setShowReactionPicker(false)
  }, [localParticipant, meetingId])

  // Listen for incoming reactions
  useEffect(() => {
    const handleReactionReceived = (data: { participantId: string; participantName: string; emoji: string }) => {
      // Skip own reactions since we show them immediately
      if (data.participantId === localParticipant?.id) return

      const reaction: FloatingReaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji: data.emoji,
        participantName: data.participantName,
        x: Math.random() * 60 + 20,
      }
      setFloatingReactions(prev => [...prev, reaction])
    }

    signalingService.on('reaction-received', handleReactionReceived)
    return () => {
      signalingService.off('reaction-received', handleReactionReceived)
    }
  }, [localParticipant?.id])

  // Auto-remove floating reactions after animation
  useEffect(() => {
    if (floatingReactions.length === 0) return

    const timer = setTimeout(() => {
      setFloatingReactions(prev => prev.slice(1))
    }, 3000)

    return () => clearTimeout(timer)
  }, [floatingReactions])

  // --- Raise Hand ---
  const handleToggleHand = useCallback(() => {
    if (!localParticipant) return

    const newState = !isHandRaised
    setIsHandRaised(newState)
    signalingService.raiseHand(meetingId, localParticipant.id, newState)
  }, [localParticipant, meetingId, isHandRaised])

  // Listen for hand raise changes
  useEffect(() => {
    const handleHandRaiseChanged = (data: { participantId: string; participantName: string; raised: boolean }) => {
      setParticipantHandsRaised(prev => {
        const newMap = new Map(prev)
        if (data.raised) {
          newMap.set(data.participantId, true)
        } else {
          newMap.delete(data.participantId)
        }
        return newMap
      })
    }

    signalingService.on('hand-raise-changed', handleHandRaiseChanged)
    return () => {
      signalingService.off('hand-raise-changed', handleHandRaiseChanged)
    }
  }, [])

  // --- Captions (Web Speech API) ---
  const handleToggleCaptions = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser')
      return
    }

    if (isCaptionsEnabled) {
      // Stop captions
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setIsCaptionsEnabled(false)
      setCaptionText('')
    } else {
      // Start captions
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        setCaptionText(finalTranscript || interimTranscript)

        // Clear caption after 5 seconds of no speech
        if (finalTranscript) {
          setTimeout(() => {
            setCaptionText('')
          }, 5000)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setError('Microphone access denied for captions')
        }
      }

      recognition.onend = () => {
        // Restart if still enabled (handle browser auto-stop)
        if (isCaptionsEnabled && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Ignore errors on restart
          }
        }
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsCaptionsEnabled(true)
    }
  }, [isCaptionsEnabled])

  // --- Device Enumeration ---
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
      } catch (err) {
        console.error('Failed to enumerate devices:', err)
      }
    }
    enumerateDevices()

    // Re-enumerate when devices change
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
    }
  }, [])

  // --- Device Change Handler ---
  const handleDeviceChange = async (deviceId: string, kind: 'audio' | 'video') => {
    try {
      const constraints = kind === 'audio'
        ? { audio: { deviceId: { exact: deviceId } } }
        : { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newTrack = newStream.getTracks()[0]

      if (localStreamRef.current) {
        const oldTrack = kind === 'audio'
          ? localStreamRef.current.getAudioTracks()[0]
          : localStreamRef.current.getVideoTracks()[0]

        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack)
          oldTrack.stop()
        }
        localStreamRef.current.addTrack(newTrack)

        // Update the producer with the new track
        if (kind === 'audio') {
          await mediaStreaming.replaceAudioTrack(newTrack)
          setSelectedAudioDevice(deviceId)
        } else {
          await mediaStreaming.replaceVideoTrack(newTrack)
          setSelectedVideoDevice(deviceId)
        }
      }
    } catch (err) {
      console.error(`Failed to change ${kind} device:`, err)
      setError(`Failed to switch ${kind} device`)
    }
  }

  // --- Close More Options on Click Outside ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
        setShowMoreOptions(false)
      }
    }

    if (showMoreOptions) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreOptions])

  // Close reaction picker on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showReactionPicker) {
        setShowReactionPicker(false)
      }
    }

    if (showReactionPicker) {
      // Delay to avoid immediate close
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [showReactionPicker])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-[#202124]">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative p-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-300">Initializing meeting...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Setting up video, audio, and media server...
                </p>
              </div>
            </div>
          ) : (
            /* Main Video Container - Google Meet teal gradient background */
            <div 
              className="h-full rounded-lg overflow-hidden relative"
              style={{ background: 'linear-gradient(160deg, #1a3a4a 0%, #2d5a6a 30%, #1a4a5a 60%, #2a5a6a 100%)' }}
            >
              {/* Profile icon top-right */}
              <div className="absolute top-3 right-3 z-10">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white border-2 border-white/20">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Muted indicator - below profile icon */}
              {!isAudioEnabled && (
                <div className="absolute top-14 right-3 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center">
                    <MicOff className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Video element - only show when video enabled AND we have video track */}
              {isVideoEnabled && hasVideoTrack ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Avatar - shown when video disabled or no video track */
                <div className="h-full flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                    <span className="text-4xl font-normal text-white">
                      {(localParticipant?.name || user?.name || 'You').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Remote Videos Grid - small thumbnails when multiple participants */}
              {participants.length > 0 && (
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {participants.slice(0, 4).map((participant) => (
                    <div key={participant.id} className="relative w-32 h-24 rounded-lg overflow-hidden bg-gray-800 border border-gray-600">
                      <VideoTile
                        participantId={participant.id}
                        name={participant.name}
                        kind="video"
                        isLocal={false}
                        peerConnection={peerConnectionRef.current}
                      />
                      {/* Hand raised indicator on participant tile */}
                      {participantHandsRaised.get(participant.id) && (
                        <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Hand className="h-3.5 w-3.5 text-gray-900" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Floating Reactions Overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {floatingReactions.map((reaction) => (
                  <div
                    key={reaction.id}
                    className="absolute bottom-0 animate-float-up"
                    style={{ left: `${reaction.x}%` }}
                  >
                    <div className="text-5xl">{reaction.emoji}</div>
                    <div className="text-xs text-white bg-black/50 rounded px-1 mt-1 text-center whitespace-nowrap">
                      {reaction.participantName}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hand Raised Indicator (self) */}
              {isHandRaised && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500 text-gray-900 px-4 py-2 rounded-full shadow-lg">
                  <Hand className="h-5 w-5" />
                  <span className="text-sm font-medium">Hand raised</span>
                </div>
              )}

              {/* Captions Overlay */}
              {isCaptionsEnabled && captionText && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[80%]">
                  <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-lg text-center">
                    {captionText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Panel - Right side */}
        {isChatVisible && (
          <Chat
            meetingId={meetingId}
            participantId={localParticipant?.id || user?.id || 'local'}
            participantName={localParticipant?.name || user?.name || 'You'}
            isVisible={true}
            onClose={() => setIsChatVisible(false)}
          />
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-[#202124] px-4 flex items-center justify-between">
        {/* Left - Meeting Info */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-sm text-gray-300">{currentTime}</span>
          <span className="text-sm text-gray-600">|</span>
          <span className="text-sm text-gray-300">{meetingCode?.toLowerCase() || meetingId.slice(0, 11)}</span>
        </div>

        {/* Center - Controls */}
        <div className="flex items-center gap-2">
          {/* Mic button - red when off */}
          <div className="relative">
            <button
              onClick={handleToggleAudio}
              disabled={isLoading}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isAudioEnabled
                  ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]'
                  : 'bg-[#ea4335] text-white'
              } disabled:opacity-50`}
              title={isAudioEnabled ? 'Turn off microphone' : 'Turn on microphone'}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          </div>

          {/* Video button - red when off */}
          <div className="relative">
            <button
              onClick={handleToggleVideo}
              disabled={isLoading}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isVideoEnabled
                  ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]'
                  : 'bg-[#ea4335] text-white'
              } disabled:opacity-50`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
          </div>

          {/* Emoji/Reactions */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowReactionPicker(!showReactionPicker)
              }}
              className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#4a4d51] text-white flex items-center justify-center transition-all"
              title="Send a reaction"
            >
              <Smile className="h-5 w-5" />
            </button>
            {/* Reaction Picker Popup */}
            {showReactionPicker && (
              <div 
                className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#3c4043] rounded-full px-2 py-1.5 flex gap-1 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-10 h-10 rounded-full hover:bg-[#4a4d51] flex items-center justify-center text-xl transition-all hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Screen Share / Present */}
          <button
            onClick={handleToggleScreenShare}
            disabled={isLoading}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-[#8ab4f8] hover:bg-[#7aa8f0] text-[#202124]'
                : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
            } disabled:opacity-50`}
            title={isScreenSharing ? 'Stop presenting' : 'Present now'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M12 16v4M8 20h8" strokeLinecap="round" />
              <path d="M12 8v4M10 10h4" strokeLinecap="round" />
            </svg>
          </button>

          {/* Captions (CC) */}
          <button
            onClick={handleToggleCaptions}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isCaptionsEnabled
                ? 'bg-[#8ab4f8] text-[#202124] hover:bg-[#7aa8f0]'
                : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
            }`}
            title={isCaptionsEnabled ? 'Turn off captions' : 'Turn on captions'}
          >
            <span className="text-xs font-bold border-2 border-current px-1.5 py-0.5 rounded">CC</span>
          </button>

          {/* Raise Hand */}
          <button
            onClick={handleToggleHand}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isHandRaised
                ? 'bg-[#8ab4f8] text-[#202124] hover:bg-[#7aa8f0]'
                : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className="h-5 w-5" />
          </button>

          {/* More Options */}
          <div className="relative" ref={moreOptionsRef}>
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                showMoreOptions
                  ? 'bg-[#8ab4f8] text-[#202124] hover:bg-[#7aa8f0]'
                  : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
              }`}
              title="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* More Options Menu */}
            {showMoreOptions && (
              <div className="absolute bottom-16 right-0 w-72 bg-[#2d2e30] rounded-xl shadow-2xl overflow-hidden z-50">
                {/* Settings Section */}
                <div className="p-2">
                  {/* Theme Toggle */}
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#3c4043] transition-colors text-white"
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span className="text-sm">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  </button>

                  {/* Device Settings */}
                  <button
                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#3c4043] transition-colors text-white"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="text-sm">Audio & video settings</span>
                  </button>

                  {/* Copy Meeting Link */}
                  <button
                    onClick={() => {
                      copyMeetingLink()
                      setShowMoreOptions(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#3c4043] transition-colors text-white"
                  >
                    <Link className="h-5 w-5" />
                    <span className="text-sm">{linkCopied ? 'Link copied!' : 'Copy meeting link'}</span>
                  </button>
                </div>

                {/* Device Settings Panel */}
                {showDeviceSettings && (
                  <div className="border-t border-gray-600 p-3">
                    {/* Audio Device Selection */}
                    <div className="mb-3">
                      <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5" />
                        Microphone
                      </label>
                      <select
                        value={selectedAudioDevice}
                        onChange={(e) => handleDeviceChange(e.target.value, 'audio')}
                        className="w-full bg-[#3c4043] text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-[#8ab4f8]"
                      >
                        {audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Video Device Selection */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5" />
                        Camera
                      </label>
                      <select
                        value={selectedVideoDevice}
                        onChange={(e) => handleDeviceChange(e.target.value, 'video')}
                        className="w-full bg-[#3c4043] text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-[#8ab4f8]"
                      >
                        {videoDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Leave Call */}
          <button
            onClick={handleLeaveMeeting}
            disabled={isLoading}
            className="w-14 h-12 rounded-full bg-[#ea4335] hover:bg-[#d33828] text-white flex items-center justify-center transition-all disabled:opacity-50"
            title="Leave call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>

        {/* Right - Additional icons */}
        <div className="flex items-center gap-3 min-w-[160px] justify-end">
          {/* Info icon */}
          <button className="p-2.5 text-gray-400 hover:text-white hover:bg-[#3c4043] rounded-full transition-all" title="Meeting details">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
            </svg>
          </button>
          {/* Chat icon */}
          <button 
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`p-2.5 rounded-full transition-all ${isChatVisible ? 'bg-[#8ab4f8] text-[#202124]' : 'text-gray-400 hover:text-white hover:bg-[#3c4043]'}`} 
            title="Chat with everyone"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          {/* Apps/Grid icon */}
          <button className="p-2.5 text-gray-400 hover:text-white hover:bg-[#3c4043] rounded-full transition-all" title="Activities">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          {/* Host controls */}
          <button className="p-2.5 text-gray-400 hover:text-white hover:bg-[#3c4043] rounded-full transition-all" title="Host controls">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-20 right-6 p-4 bg-red-900/80 border border-red-700 rounded-xl text-red-200 text-sm max-w-sm shadow-lg">
          {error}
        </div>
      )}

      {/* Connection Status */}
      {!mediaConnected && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-900/80 border border-yellow-700 rounded-full text-yellow-200 text-xs">
          Connecting to media server...
        </div>
      )}

      {/* Your Meeting's Ready Modal */}
      {showMeetingReadyModal && !isLoading && (
        <div className="fixed bottom-28 left-6 z-50 w-72 bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="text-base font-medium text-gray-900">Your meeting's ready</h3>
            <button
              onClick={() => setShowMeetingReadyModal(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            {/* Add Others Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors mb-4">
              <UserPlus className="h-4 w-4" />
              Add others
            </button>

            {/* Share Link Text */}
            <p className="text-sm text-gray-600 mb-3">
              Or share this meeting link with others you want in the meeting
            </p>

            {/* Meeting Link */}
            <div className="flex items-center gap-2 p-2.5 bg-gray-100 rounded-lg mb-3">
              <span className="flex-1 text-sm text-gray-700 truncate">
                {getMeetingLink().replace(/^https?:\/\//, '')}
              </span>
              <button
                onClick={copyMeetingLink}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Copy link"
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>

            {/* Permission Notice */}
            <div className="flex items-start gap-2 text-xs text-gray-500 mb-3">
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
              <span>People who use this meeting link must get your permission before they can join.</span>
            </div>

            {/* Joined As */}
            <p className="text-xs text-gray-500">
              Joined as {user?.email || user?.name || 'Guest'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
