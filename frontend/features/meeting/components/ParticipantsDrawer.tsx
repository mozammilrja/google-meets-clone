'use client'

import React, { memo } from 'react'
import { X, MicOff, VideoOff, Hand, MoreVertical, Crown } from 'lucide-react'
import { useMeetingSessionStore, useReactionsStore } from '../stores'
import { useUIPanelsStore } from '../stores'
import { cn } from '@/lib/utils/cn'

/**
 * Participants drawer/panel (right side)
 * Shows all participants with their status
 */
export const ParticipantsDrawer = memo(function ParticipantsDrawer() {
  const participants = useMeetingSessionStore(state => state.participants)
  const localParticipant = useMeetingSessionStore(state => state.localParticipant)
  const setParticipantsPanelVisible = useUIPanelsStore(state => state.setParticipantsPanelVisible)
  const participantHandsRaised = useReactionsStore(state => state.participantHandsRaised)
  const isHandRaised = useReactionsStore(state => state.isHandRaised)
  
  const totalCount = participants.length + 1
  
  const handleClose = () => {
    setParticipantsPanelVisible(false)
  }
  
  return (
    <aside 
      className={cn(
        "fixed right-4 top-4 bottom-24 w-[360px] z-40",
        "bg-[#202124] rounded-xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-right-5 fade-in duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-medium text-white">
          People ({totalCount})
        </h2>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-full hover:bg-[#3c4043] 
                     transition-colors duration-150"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Local Participant */}
        <ParticipantItem
          name={localParticipant?.name || 'You'}
          isLocal
          isHost
          isHandRaised={isHandRaised}
        />
        
        {/* Remote Participants */}
        {participants.map((participant) => (
          <ParticipantItem
            key={participant.id}
            name={participant.name}
            isAudioEnabled={participant.audio}
            isVideoEnabled={participant.video}
            isHandRaised={participantHandsRaised.get(participant.id)}
            isScreenSharing={participant.screenSharing}
          />
        ))}
      </div>
      
      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-700">
        <button className="w-full py-2 text-sm text-[#8ab4f8] 
                           hover:bg-[#3c4043] rounded-lg
                           transition-colors duration-150">
          Invite others
        </button>
      </div>
    </aside>
  )
})

interface ParticipantItemProps {
  name: string
  isLocal?: boolean
  isHost?: boolean
  isAudioEnabled?: boolean
  isVideoEnabled?: boolean
  isHandRaised?: boolean
  isScreenSharing?: boolean
}

const ParticipantItem = memo(function ParticipantItem({
  name,
  isLocal = false,
  isHost = false,
  isAudioEnabled = true,
  isVideoEnabled = true,
  isHandRaised = false,
  isScreenSharing = false,
}: ParticipantItemProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg",
        "hover:bg-[#3c4043]",
        "transition-colors duration-150 group"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 
                        flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
        {/* Hand raised badge */}
        {isHandRaised && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 
                          flex items-center justify-center">
            <Hand className="h-3 w-3 text-gray-900" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white truncate">
            {name}
          </span>
          {isLocal && (
            <span className="text-xs text-gray-400">(You)</span>
          )}
          {isHost && (
            <Crown className="h-3.5 w-3.5 text-yellow-500" />
          )}
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-2 mt-0.5">
          {isScreenSharing && (
            <span className="text-xs text-green-400">Presenting</span>
          )}
        </div>
      </div>
      
      {/* Media status */}
      <div className="flex items-center gap-1">
        {!isAudioEnabled && (
          <div className="w-7 h-7 rounded-full bg-[#3c4043] 
                          flex items-center justify-center">
            <MicOff className="h-3.5 w-3.5 text-gray-400" />
          </div>
        )}
        {!isVideoEnabled && (
          <div className="w-7 h-7 rounded-full bg-[#3c4043] 
                          flex items-center justify-center">
            <VideoOff className="h-3.5 w-3.5 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Actions (visible on hover) */}
      {!isLocal && (
        <button 
          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 
                     hover:bg-[#5f6368] 
                     transition-all duration-150"
        >
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  )
})

ParticipantsDrawer.displayName = 'ParticipantsDrawer'
