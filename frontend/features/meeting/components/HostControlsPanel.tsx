'use client'

import React, { memo, useCallback } from 'react'
import { X, Check, Shield, Mic, Video, Monitor, Smile, MessageSquare, Lock, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { usePermissionsStore, selectGlobalSettings, selectIsHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'

interface HostControlsPanelProps {
  meetingId: string
  onClose: () => void
}

interface ToggleProps {
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
  label?: string
}

const Toggle = memo(function Toggle({ enabled, onToggle, disabled = false, label }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={enabled}
      className={cn(
        "relative w-12 h-7 rounded-full transition-colors",
        enabled ? "bg-[#8ab4f8]" : "bg-[#5f6368]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div 
        className={cn(
          "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-md",
          "flex items-center justify-center",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      >
        {enabled && <Check className="h-3 w-3 text-[#8ab4f8]" />}
      </div>
    </button>
  )
})

interface ControlRowProps {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
}

const ControlRow = memo(function ControlRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
}: ControlRowProps) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex items-start gap-3 flex-1 pr-4">
        <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{title}</div>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} disabled={disabled} label={title} />
    </div>
  )
})

/**
 * Host Controls Panel with full permission management
 * Integrates with usePermissionsStore for real-time permission updates
 */
export const HostControlsPanel = memo(function HostControlsPanel({
  meetingId,
  onClose,
}: HostControlsPanelProps) {
  const isHost = usePermissionsStore(selectIsHost)
  const globalSettings = usePermissionsStore(selectGlobalSettings)
  const updateGlobalSetting = usePermissionsStore(state => state.updateGlobalSetting)
  
  // Handler to update setting and broadcast to other participants
  const handleToggle = useCallback(<K extends keyof typeof globalSettings>(
    key: K,
    currentValue: boolean
  ) => {
    const newValue = !currentValue
    updateGlobalSetting(key, newValue as (typeof globalSettings)[K])
    
    // Broadcast permission change to all participants
    signalingService.emit('permission-update', {
      meetingId,
      setting: key,
      value: newValue,
    })
  }, [meetingId, updateGlobalSetting])
  
  // Don't render for non-hosts
  if (!isHost) {
    return (
      <aside 
        className={cn(
          "fixed right-4 top-4 bottom-24 w-[360px] z-40",
          "bg-[#202124] rounded-xl shadow-2xl",
          "flex flex-col items-center justify-center",
          "animate-in slide-in-from-right-5 fade-in duration-200"
        )}
      >
        <Shield className="h-12 w-12 text-gray-500 mb-4" />
        <p className="text-gray-400 text-center px-6">
          Only the host can access these controls
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-[#3c4043] hover:bg-[#5f6368] 
                     text-white rounded-full text-sm transition-colors"
        >
          Close
        </button>
      </aside>
    )
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#8ab4f8]" />
          <h2 className="text-lg font-medium text-white">Host controls</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
          aria-label="Close host controls"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {/* Description */}
      <div className="px-6 py-4 border-b border-gray-700">
        <p className="text-sm text-gray-400">
          Control what participants can do in this meeting. Changes apply immediately to all participants.
        </p>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Meeting Security Section */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Meeting Security
          </h3>
          
          <ControlRow
            icon={<Lock className="h-4 w-4 text-gray-400" />}
            title="Lock meeting"
            description="Prevent new participants from joining"
            enabled={globalSettings.isMeetingLocked}
            onToggle={() => handleToggle('isMeetingLocked', globalSettings.isMeetingLocked)}
          />
          
          <ControlRow
            icon={<Users className="h-4 w-4 text-gray-400" />}
            title="Waiting room"
            description="Admit participants before they can join"
            enabled={globalSettings.waitingRoomEnabled}
            onToggle={() => handleToggle('waitingRoomEnabled', globalSettings.waitingRoomEnabled)}
          />
        </div>
        
        {/* Media Controls Section */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Video className="h-3.5 w-3.5" />
            Media Controls
          </h3>
          
          <ControlRow
            icon={<Mic className="h-4 w-4 text-gray-400" />}
            title="Allow participants to unmute"
            description="Participants can turn on their microphone"
            enabled={globalSettings.allowUnmute}
            onToggle={() => handleToggle('allowUnmute', globalSettings.allowUnmute)}
          />
          
          <ControlRow
            icon={<Video className="h-4 w-4 text-gray-400" />}
            title="Allow participants to start video"
            description="Participants can turn on their camera"
            enabled={globalSettings.allowVideo}
            onToggle={() => handleToggle('allowVideo', globalSettings.allowVideo)}
          />
          
          <ControlRow
            icon={<Monitor className="h-4 w-4 text-gray-400" />}
            title="Allow screen sharing"
            description="Participants can share their screen"
            enabled={globalSettings.allowScreenShare}
            onToggle={() => handleToggle('allowScreenShare', globalSettings.allowScreenShare)}
          />
        </div>
        
        {/* Engagement Section */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Smile className="h-3.5 w-3.5" />
            Engagement
          </h3>
          
          <ControlRow
            icon={<Smile className="h-4 w-4 text-gray-400" />}
            title="Allow reactions"
            description="Participants can send emoji reactions"
            enabled={globalSettings.allowReactions}
            onToggle={() => handleToggle('allowReactions', globalSettings.allowReactions)}
          />
          
          <ControlRow
            icon={<span className="text-sm">✋</span>}
            title="Allow raise hand"
            description="Participants can raise their hand"
            enabled={globalSettings.allowRaiseHand}
            onToggle={() => handleToggle('allowRaiseHand', globalSettings.allowRaiseHand)}
          />
        </div>
        
        {/* Chat Section */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat Moderation
          </h3>
          
          <ControlRow
            icon={<MessageSquare className="h-4 w-4 text-gray-400" />}
            title="Allow chat messages"
            description="Participants can send messages in chat"
            enabled={globalSettings.allowChat}
            onToggle={() => handleToggle('allowChat', globalSettings.allowChat)}
          />
          
          <ControlRow
            icon={<MessageSquare className="h-4 w-4 text-gray-400" />}
            title="Allow private messages"
            description="Participants can send direct messages"
            enabled={globalSettings.allowPrivateMessages}
            onToggle={() => handleToggle('allowPrivateMessages', globalSettings.allowPrivateMessages)}
          />
        </div>
      </div>
      
      {/* Footer - Quick actions */}
      <div className="px-6 py-4 border-t border-gray-700 bg-[#292a2d]">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Changes apply to all participants</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </aside>
  )
})

HostControlsPanel.displayName = 'HostControlsPanel'
