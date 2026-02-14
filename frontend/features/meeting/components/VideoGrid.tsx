'use client'

import React, { memo, useMemo, useRef } from 'react'
import { VideoTile } from './VideoTile'
import { LocalVideoTile } from './LocalVideoTile'
import { useMeetingSessionStore, useMediaControlsStore, useReactionsStore } from '../stores'
import { cn } from '@/lib/utils/cn'

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>
  localStream: MediaStream | null
  meetingId: string
}

/**
 * Dynamic video grid that automatically adjusts layout
 * Supports 1, 2, 4, 9, 16+ participants with optimized layouts
 */
export const VideoGrid = memo(function VideoGrid({
  localVideoRef,
  localStream,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  meetingId: _meetingId,
}: VideoGridProps) {
  const participants = useMeetingSessionStore(state => state.participants)
  const localParticipant = useMeetingSessionStore(state => state.localParticipant)
  const isVideoEnabled = useMediaControlsStore(state => state.isVideoEnabled)
  const hasVideoTrack = useMediaControlsStore(state => state.hasVideoTrack)
  const isAudioEnabled = useMediaControlsStore(state => state.isAudioEnabled)
  const participantHandsRaised = useReactionsStore(state => state.participantHandsRaised)
  const isHandRaised = useReactionsStore(state => state.isHandRaised)
  
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Calculate total participant count (including local)
  const totalParticipants = participants.length + 1
  
  // Determine optimal grid layout based on participant count
  const gridLayout = useMemo(() => {
    if (totalParticipants === 1) {
      return { cols: 1, rows: 1, className: 'grid-cols-1' }
    }
    if (totalParticipants === 2) {
      return { cols: 2, rows: 1, className: 'grid-cols-2' }
    }
    if (totalParticipants <= 4) {
      return { cols: 2, rows: 2, className: 'grid-cols-2' }
    }
    if (totalParticipants <= 6) {
      return { cols: 3, rows: 2, className: 'grid-cols-3' }
    }
    if (totalParticipants <= 9) {
      return { cols: 3, rows: 3, className: 'grid-cols-3' }
    }
    if (totalParticipants <= 12) {
      return { cols: 4, rows: 3, className: 'grid-cols-4' }
    }
    if (totalParticipants <= 16) {
      return { cols: 4, rows: 4, className: 'grid-cols-4' }
    }
    // 16+ participants: 5 columns
    return { cols: 5, rows: Math.ceil(totalParticipants / 5), className: 'grid-cols-5' }
  }, [totalParticipants])
  
  // Calculate tile aspect ratio based on layout
  const tileStyle = useMemo(() => {
    if (totalParticipants === 1) {
      return 'aspect-video max-w-4xl mx-auto'
    }
    if (totalParticipants <= 4) {
      return 'aspect-video'
    }
    return 'aspect-video'
  }, [totalParticipants])
  
  // Memoize participant tiles to prevent re-renders
  const participantTiles = useMemo(() => {
    return participants.map((participant) => (
      <VideoTile
        key={participant.id}
        participantId={participant.id}
        name={participant.name}
        isAudioEnabled={participant.audio ?? true}
        isVideoEnabled={participant.video ?? true}
        isHandRaised={participantHandsRaised.get(participant.id) ?? false}
        isScreenSharing={participant.screenSharing ?? false}
        className={tileStyle}
      />
    ))
  }, [participants, participantHandsRaised, tileStyle])
  
  return (
    <div 
      ref={containerRef}
      className="h-full w-full p-4 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a3a4a 0%, #1e4d5a 25%, #2a5f6e 50%, #1a4a5a 75%, #1a3a4a 100%)'
      }}
    >
      <div 
        className={cn(
          "h-full w-full grid gap-2 auto-rows-fr",
          gridLayout.className,
          // Center content when few participants
          totalParticipants <= 2 && "place-content-center",
          totalParticipants === 1 && "place-items-center"
        )}
      >
        {/* Local Video Tile */}
        <LocalVideoTile
          videoRef={localVideoRef}
          stream={localStream}
          name={localParticipant?.name || 'You'}
          isVideoEnabled={isVideoEnabled && hasVideoTrack}
          isAudioEnabled={isAudioEnabled}
          isHandRaised={isHandRaised}
          className={cn(
            tileStyle,
            totalParticipants === 1 && "w-full max-w-4xl"
          )}
        />
        
        {/* Remote Participant Tiles */}
        {participantTiles}
      </div>
    </div>
  )
})

VideoGrid.displayName = 'VideoGrid'

/**
 * Calculates optimal grid dimensions for video tiles
 */
export function calculateGridDimensions(
  participantCount: number,
  containerWidth: number,
  containerHeight: number
) {
  const aspectRatio = 16 / 9
  
  // Find optimal columns/rows that maximizes tile size
  let bestCols = 1
  let bestRows = 1
  let bestTileWidth = 0
  
  for (let cols = 1; cols <= Math.ceil(Math.sqrt(participantCount * 2)); cols++) {
    const rows = Math.ceil(participantCount / cols)
    const tileWidth = Math.floor(containerWidth / cols)
    const tileHeight = Math.floor(containerHeight / rows)
    
    // Check which dimension is limiting
    const widthLimited = tileWidth / aspectRatio <= tileHeight
    const effectiveTileWidth = widthLimited 
      ? tileWidth 
      : tileHeight * aspectRatio
    
    if (effectiveTileWidth > bestTileWidth) {
      bestTileWidth = effectiveTileWidth
      bestCols = cols
      bestRows = rows
    }
  }
  
  return { cols: bestCols, rows: bestRows, tileWidth: bestTileWidth }
}
