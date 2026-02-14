'use client'

import React, { memo, useEffect, useCallback, useRef } from 'react'
import { VideoGrid } from './VideoGrid'
import { ControlBar } from './ControlBar'
import { InviteCard } from './InviteCard'
import { FloatingReactions } from './FloatingReactions'
import { CaptionsOverlay } from './CaptionsOverlay'
import { MeetingLoader } from './MeetingLoader'
import { PanelManager } from './PanelManager'
import { useUIPanelsStore, useReactionsStore, useMeetingSessionStore, selectAnyRightPanelOpen } from '../stores'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

interface MeetingLayoutProps {
  meetingId: string
  localVideoRef: React.RefObject<HTMLVideoElement>
  localStream: MediaStream | null
  onToggleAudio: () => Promise<void>
  onToggleVideo: () => Promise<void>
  onToggleScreenShare: () => Promise<void>
  onSendReaction: (emoji: string) => void
  onToggleHand: () => void
  onLeaveMeeting: () => Promise<void>
}

/**
 * Main meeting layout component
 * Orchestrates all meeting UI elements with optimized re-renders
 */
export const MeetingLayout = memo(function MeetingLayout({
  meetingId,
  localVideoRef,
  localStream,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSendReaction,
  onToggleHand,
  onLeaveMeeting,
}: MeetingLayoutProps) {
  // Store subscriptions with selectors to minimize re-renders
  const isLoading = useMeetingSessionStore(state => state.isLoading)
  const error = useMeetingSessionStore(state => state.error)
  const meetingCode = useMeetingSessionStore(state => state.meetingCode)
  const localParticipant = useMeetingSessionStore(state => state.localParticipant)
  
  // Panel visibility - use unified selector for margin adjustment
  const anyRightPanelOpen = useUIPanelsStore(selectAnyRightPanelOpen)
  const showMeetingReadyModal = useUIPanelsStore(state => state.showMeetingReadyModal)
  const setMeetingReadyModalVisible = useUIPanelsStore(state => state.setMeetingReadyModalVisible)
  
  const floatingReactions = useReactionsStore(state => state.floatingReactions)
  
  // Refs for cleanup
  const cleanupRef = useRef<(() => void)[]>([])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup())
    }
  }, [])
  
  // Access user info for profile avatar
  const { user } = useAuth()
  
  // Auto-clear old reactions
  useEffect(() => {
    const clearOldReactions = useReactionsStore.getState().clearOldReactions
    const interval = setInterval(clearOldReactions, 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Memoized handlers
  const handleCloseInviteCard = useCallback(() => {
    setMeetingReadyModalVisible(false)
  }, [setMeetingReadyModalVisible])
  
  const handleCopyMeetingLink = useCallback(async () => {
    const link = `${window.location.origin}/join/${meetingCode}`
    await navigator.clipboard.writeText(link)
    return link
  }, [meetingCode])
  
  // Get user initials for avatar
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'
  
  if (isLoading) {
    return <MeetingLoader />
  }
  
  return (
    <div className="flex flex-col h-screen bg-[#202124] overflow-hidden">
      {/* Top-right profile badge like Google Meet */}
      <div className="absolute top-4 right-4 z-50">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-lg cursor-pointer hover:ring-2 hover:ring-white/30 transition-all">
          {userInitials}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid Area */}
        <div 
          className={cn(
            "flex-1 relative transition-all duration-200 ease-out",
            anyRightPanelOpen && "mr-[364px]"
          )}
        >
          <VideoGrid 
            localVideoRef={localVideoRef}
            localStream={localStream}
            meetingId={meetingId}
          />
          
          {/* Floating Reactions Overlay */}
          <FloatingReactions reactions={floatingReactions} />
          
          {/* Captions Overlay */}
          <CaptionsOverlay />
        </div>
        
        {/* Panel Manager - Handles all right-side panels */}
        <PanelManager
          meetingId={meetingId}
          meetingCode={meetingCode || ''}
          participantId={localParticipant?.id || ''}
          participantName={localParticipant?.name || 'Guest'}
          onCopyLink={handleCopyMeetingLink}
        />
        
        {/* Invite Card (bottom-left) */}
        {showMeetingReadyModal && (
          <InviteCard 
            meetingCode={meetingCode || ''}
            onClose={handleCloseInviteCard}
            onCopyLink={handleCopyMeetingLink}
          />
        )}
      </div>
      
      {/* Bottom Control Bar */}
      <ControlBar
        meetingId={meetingId}
        meetingCode={meetingCode || ''}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onSendReaction={onSendReaction}
        onToggleHand={onToggleHand}
        onLeaveMeeting={onLeaveMeeting}
        onCopyMeetingLink={handleCopyMeetingLink}
      />
      
      {/* Error Toast */}
      {error && (
        <div 
          className="fixed bottom-24 right-6 p-4 bg-red-900/90 border border-red-700 
                     rounded-xl text-red-200 text-sm max-w-sm shadow-lg z-50
                     animate-in slide-in-from-right-5 fade-in duration-200"
        >
          {error}
        </div>
      )}
    </div>
  )
})

MeetingLayout.displayName = 'MeetingLayout'
