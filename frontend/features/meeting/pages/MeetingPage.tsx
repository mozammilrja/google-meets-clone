'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { MeetingLayout } from '@/features/meeting/components'
import { useMeeting } from '@/features/meeting/hooks'

// Import animations
import '@/features/meeting/styles/animations.css'

/**
 * Meeting Page - Entry point for video meetings
 * Uses the refactored feature-based architecture
 */
export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string
  const { isAuthenticated } = useAuth()
  
  // Validate meeting ID
  useEffect(() => {
    if (!meetingId || meetingId === 'undefined' || meetingId === 'null') {
      console.error('[Meeting] Invalid meeting ID:', meetingId)
      router.replace('/meeting/lobby')
    }
  }, [meetingId, router])
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])
  
  // Initialize meeting with the custom hook
  const {
    localVideoRef,
    localStream,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onSendReaction,
    onToggleHand,
    onLeaveMeeting,
  } = useMeeting({
    meetingId,
    onError: (error) => {
      console.error('[Meeting] Error:', error)
    },
  })
  
  // Handle leave meeting navigation
  const handleLeaveMeeting = async () => {
    await onLeaveMeeting()
    router.push('/meeting/lobby')
  }
  
  if (!isAuthenticated) {
    return null
  }
  
  return (
    <MeetingLayout
      meetingId={meetingId}
      localVideoRef={localVideoRef}
      localStream={localStream}
      onToggleAudio={onToggleAudio}
      onToggleVideo={onToggleVideo}
      onToggleScreenShare={onToggleScreenShare}
       onSendReaction={onSendReaction}
      onToggleHand={onToggleHand}
      onLeaveMeeting={handleLeaveMeeting}
    />
  )
}
