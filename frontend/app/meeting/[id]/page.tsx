'use client'

/**
 * Meeting Page - Refactored Version
 * 
 * This page uses the new feature-based architecture.
 * The original implementation is preserved in page.legacy.tsx
 * 
 * To use this instead of the legacy version, rename:
 * - page.tsx -> page.legacy.tsx
 * - page.refactored.tsx -> page.tsx
 */

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { MeetingLayout } from '@/features/meeting/components'
import { useMeeting } from '@/features/meeting/hooks'

// Import meeting feature styles
import '@/features/meeting/styles/animations.css'

export default function MeetingPageRefactored() {
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
  
  // Handle leave meeting with navigation
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
