'use client'

import React, { memo, useCallback, useState, useEffect } from 'react'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, MoreVertical, MessageSquare, Users, Hand, Smile,
  Settings, Moon, Sun, Volume2
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useMediaControlsStore, useUIPanelsStore, useReactionsStore, useCaptionsStore, useMeetingSessionStore } from '../stores'
import { cn } from '@/lib/utils/cn'

// Reaction emojis
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🤔']

interface ControlBarProps {
  meetingId: string
  meetingCode: string
  onToggleAudio: () => Promise<void>
  onToggleVideo: () => Promise<void>
  onToggleScreenShare: () => Promise<void>
  onSendReaction: (emoji: string) => void
  onToggleHand: () => void
  onLeaveMeeting: () => Promise<void>
  onCopyMeetingLink: () => Promise<string>
}

/**
 * Bottom control bar with memoized buttons
 * Each button group is memoized separately to prevent cascading re-renders
 */
export const ControlBar = memo(function ControlBar({
  meetingId: _meetingId,
  meetingCode,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSendReaction,
  onToggleHand,
  onLeaveMeeting,
  onCopyMeetingLink,
}: ControlBarProps) {
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
  
  return (
    <div className="h-20 bg-[#202124] px-4 flex items-center justify-between flex-shrink-0">
      {/* Left - Meeting Info */}
      <MeetingInfo meetingCode={meetingCode} currentTime={currentTime} />
      
      {/* Center - Main Controls */}
      <div className="flex items-center gap-2">
        <MediaControls
          onToggleAudio={onToggleAudio}
          onToggleVideo={onToggleVideo}
          onToggleScreenShare={onToggleScreenShare}
        />
        
        <Divider />
        
        <ReactionControls
          onSendReaction={onSendReaction}
          onToggleHand={onToggleHand}
        />
        
        <Divider />
        
        <PanelControls />
        
        <Divider />
        
        <LeaveButton onLeaveMeeting={onLeaveMeeting} />
      </div>
      
      {/* Right - Additional Controls */}
      <RightControls onCopyMeetingLink={onCopyMeetingLink} />
    </div>
  )
})

// Divider component
const Divider = memo(function Divider() {
  return <div className="h-8 w-px bg-gray-700 mx-1" />
})

// Meeting Info (left side)
const MeetingInfo = memo(function MeetingInfo({ 
  meetingCode, 
  currentTime 
}: { 
  meetingCode: string
  currentTime: string 
}) {
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <span className="text-sm text-gray-300">{currentTime}</span>
      <span className="text-gray-600">|</span>
      <span className="text-sm text-gray-300">{meetingCode?.toLowerCase() || ''}</span>
    </div>
  )
})

// Media Controls (mic with dropdown, video with dropdown, screen share)
const MediaControls = memo(function MediaControls({
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
}: {
  onToggleAudio: () => Promise<void>
  onToggleVideo: () => Promise<void>
  onToggleScreenShare: () => Promise<void>
}) {
  const isAudioEnabled = useMediaControlsStore(state => state.isAudioEnabled)
  const isVideoEnabled = useMediaControlsStore(state => state.isVideoEnabled)
  const isScreenSharing = useMediaControlsStore(state => state.isScreenSharing)
  const isLoading = useMeetingSessionStore(state => state.isLoading)
  
  return (
    <>
      {/* Mic Button with dropdown arrow */}
      <div className="flex items-center">
        <ControlButton
          isActive={isAudioEnabled}
          isDestructive={!isAudioEnabled}
          onClick={onToggleAudio}
          disabled={isLoading}
          title={isAudioEnabled ? 'Turn off microphone' : 'Turn on microphone'}
          hasDropdown
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ControlButton>
      </div>
      
      {/* Video Button with dropdown arrow */}
      <div className="flex items-center">
        <ControlButton
          isActive={isVideoEnabled}
          isDestructive={!isVideoEnabled}
          onClick={onToggleVideo}
          disabled={isLoading}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          hasDropdown
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ControlButton>
      </div>
      
      {/* Screen Share Button */}
      <ControlButton
        isActive={isScreenSharing}
        isHighlighted={isScreenSharing}
        onClick={onToggleScreenShare}
        disabled={isLoading}
        title={isScreenSharing ? 'Stop presenting' : 'Present now'}
      >
        {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
      </ControlButton>
    </>
  )
})

// Reaction Controls (emoji picker, hand raise, captions)
const ReactionControls = memo(function ReactionControls({
  onSendReaction,
  onToggleHand,
}: {
  onSendReaction: (emoji: string) => void
  onToggleHand: () => void
}) {
  const isHandRaised = useReactionsStore(state => state.isHandRaised)
  const isCaptionsEnabled = useCaptionsStore(state => state.isEnabled)
  const toggleCaptions = useCaptionsStore(state => state.toggleEnabled)
  const isReactionPickerVisible = useUIPanelsStore(state => state.isReactionPickerVisible)
  const setReactionPickerVisible = useUIPanelsStore(state => state.setReactionPickerVisible)
  
  const handleReactionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setReactionPickerVisible(!isReactionPickerVisible)
  }, [isReactionPickerVisible, setReactionPickerVisible])
  
  const handleSelectReaction = useCallback((emoji: string) => {
    onSendReaction(emoji)
    setReactionPickerVisible(false)
  }, [onSendReaction, setReactionPickerVisible])
  
  // Close picker on outside click
  useEffect(() => {
    if (!isReactionPickerVisible) return
    
    const handleClick = () => setReactionPickerVisible(false)
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 100)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [isReactionPickerVisible, setReactionPickerVisible])
  
  return (
    <>
      {/* Emoji Reactions */}
      <div className="relative">
        <ControlButton
          onClick={handleReactionClick}
          title="Send a reaction"
        >
          <Smile className="h-5 w-5" />
        </ControlButton>
        
        {/* Reaction Picker */}
        {isReactionPickerVisible && (
          <div 
            className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#3c4043] 
                       rounded-full px-2 py-1.5 flex gap-1 shadow-xl z-50
                       animate-in fade-in slide-in-from-bottom-2 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleSelectReaction(emoji)}
                className="w-10 h-10 rounded-full hover:bg-[#4a4d51] 
                           flex items-center justify-center text-xl 
                           transition-transform duration-150 hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Captions (CC) */}
      <ControlButton
        isHighlighted={isCaptionsEnabled}
        onClick={toggleCaptions}
        title={isCaptionsEnabled ? 'Turn off captions' : 'Turn on captions'}
      >
        <span className="text-xs font-bold border-2 border-current px-1.5 py-0.5 rounded">
          CC
        </span>
      </ControlButton>
      
      {/* Raise Hand */}
      <ControlButton
        isHighlighted={isHandRaised}
        onClick={onToggleHand}
        title={isHandRaised ? 'Lower hand' : 'Raise hand'}
      >
        <Hand className="h-5 w-5" />
      </ControlButton>
    </>
  )
})

// Panel Controls (chat, participants, more options)
const PanelControls = memo(function PanelControls() {
  const isChatVisible = useUIPanelsStore(state => state.isChatVisible)
  const isParticipantsPanelVisible = useUIPanelsStore(state => state.isParticipantsPanelVisible)
  const toggleChat = useUIPanelsStore(state => state.toggleChat)
  const toggleParticipantsPanel = useUIPanelsStore(state => state.toggleParticipantsPanel)
  const isMoreOptionsVisible = useUIPanelsStore(state => state.isMoreOptionsVisible)
  const setMoreOptionsVisible = useUIPanelsStore(state => state.setMoreOptionsVisible)
  
  const participantCount = useMeetingSessionStore(state => state.participants.length + 1)
  
  return (
    <>
      {/* Chat */}
      <ControlButton
        isHighlighted={isChatVisible}
        onClick={toggleChat}
        title={isChatVisible ? 'Hide chat' : 'Show chat'}
      >
        <MessageSquare className="h-5 w-5" />
      </ControlButton>
      
      {/* Participants */}
      <div className="relative">
        <ControlButton
          isHighlighted={isParticipantsPanelVisible}
          onClick={toggleParticipantsPanel}
          title={isParticipantsPanelVisible ? 'Hide participants' : 'Show participants'}
        >
          <Users className="h-5 w-5" />
        </ControlButton>
        
        {/* Participant count badge */}
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 
                         text-xs bg-blue-600 text-white rounded-full 
                         flex items-center justify-center">
          {participantCount}
        </span>
      </div>
      
      {/* More Options */}
      <MoreOptionsButton 
        isVisible={isMoreOptionsVisible}
        setVisible={setMoreOptionsVisible}
      />
    </>
  )
})

// More Options Button & Menu
const MoreOptionsButton = memo(function MoreOptionsButton({
  isVisible,
  setVisible,
}: {
  isVisible: boolean
  setVisible: (v: boolean) => void
}) {
  const { theme, setTheme } = useTheme()
  const isDeviceSettingsVisible = useUIPanelsStore(state => state.isDeviceSettingsVisible)
  const setDeviceSettingsVisible = useUIPanelsStore(state => state.setDeviceSettingsVisible)
  const audioDevices = useMediaControlsStore(state => state.audioDevices)
  const videoDevices = useMediaControlsStore(state => state.videoDevices)
  
  // Close on outside click
  useEffect(() => {
    if (!isVisible) return
    
    const handleClick = () => setVisible(false)
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 100)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [isVisible, setVisible])
  
  return (
    <div className="relative">
      <ControlButton
        isHighlighted={isVisible}
        onClick={(e) => {
          e.stopPropagation()
          setVisible(!isVisible)
        }}
        title="More options"
      >
        <MoreVertical className="h-5 w-5" />
      </ControlButton>
      
      {/* Menu */}
      {isVisible && (
        <div 
          className="absolute bottom-16 right-0 w-72 bg-[#2d2e30] rounded-xl 
                     shadow-2xl overflow-hidden z-50
                     animate-in fade-in slide-in-from-bottom-2 duration-150"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-2 space-y-1">
            {/* Theme Toggle */}
            <MenuButton
              icon={theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </MenuButton>
            
            {/* Device Settings */}
            <MenuButton
              icon={<Settings className="h-5 w-5" />}
              onClick={() => setDeviceSettingsVisible(!isDeviceSettingsVisible)}
            >
              Audio & video settings
            </MenuButton>
          </div>
          
          {/* Device Settings Panel */}
          {isDeviceSettingsVisible && (
            <div className="border-t border-gray-600 p-3 space-y-3
                            animate-in fade-in slide-in-from-top-1 duration-150">
              <DeviceSelect
                icon={<Volume2 className="h-3.5 w-3.5" />}
                label="Microphone"
                devices={audioDevices}
                onSelect={(_id) => {/* Handle selection */}}
              />
              <DeviceSelect
                icon={<Monitor className="h-3.5 w-3.5" />}
                label="Camera"
                devices={videoDevices}
                onSelect={(_id) => {/* Handle selection */}}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// Leave Button
const LeaveButton = memo(function LeaveButton({
  onLeaveMeeting,
}: {
  onLeaveMeeting: () => Promise<void>
}) {
  const isLoading = useMeetingSessionStore(state => state.isLoading)
  
  return (
    <button
      onClick={onLeaveMeeting}
      disabled={isLoading}
      className="w-14 h-12 rounded-full bg-[#ea4335] hover:bg-[#d33828] 
                 text-white flex items-center justify-center 
                 transition-all duration-150 disabled:opacity-50"
      title="Leave call"
    >
      <PhoneOff className="h-5 w-5" />
    </button>
  )
})

// Right side controls
const RightControls = memo(function RightControls({
  onCopyMeetingLink: _onCopyMeetingLink,
}: {
  onCopyMeetingLink: () => Promise<string>
}) {
  const isChatVisible = useUIPanelsStore(state => state.isChatVisible)
  const isInfoPanelVisible = useUIPanelsStore(state => state.isInfoPanelVisible)
  const isActivitiesPanelVisible = useUIPanelsStore(state => state.isActivitiesPanelVisible)
  const isHostControlsVisible = useUIPanelsStore(state => state.isHostControlsVisible)
  const toggleChat = useUIPanelsStore(state => state.toggleChat)
  const toggleInfoPanel = useUIPanelsStore(state => state.toggleInfoPanel)
  const toggleActivitiesPanel = useUIPanelsStore(state => state.toggleActivitiesPanel)
  const toggleHostControls = useUIPanelsStore(state => state.toggleHostControls)
  
  return (
    <div className="flex items-center gap-2 min-w-[200px] justify-end">
      {/* Info/Meeting Details */}
      <button 
        onClick={toggleInfoPanel}
        className={cn(
          "p-2.5 rounded-full transition-all duration-150",
          isInfoPanelVisible 
            ? "bg-[#8ab4f8] text-[#202124]" 
            : "text-gray-400 hover:text-white hover:bg-[#3c4043]"
        )} 
        title="Meeting details"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>

      {/* Chat icon */}
      <button 
        onClick={toggleChat}
        className={cn(
          "p-2.5 rounded-full transition-all duration-150",
          isChatVisible 
            ? "bg-[#8ab4f8] text-[#202124]" 
            : "text-gray-400 hover:text-white hover:bg-[#3c4043]"
        )} 
        title="Chat with everyone"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
      
      {/* Activities */}
      <button 
        onClick={toggleActivitiesPanel}
        className={cn(
          "p-2.5 rounded-full transition-all duration-150",
          isActivitiesPanelVisible 
            ? "bg-[#8ab4f8] text-[#202124]" 
            : "text-gray-400 hover:text-white hover:bg-[#3c4043]"
        )}
        title="Activities"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </button>
      
      {/* Host controls */}
      <button 
        onClick={toggleHostControls}
        className={cn(
          "p-2.5 rounded-full transition-all duration-150",
          isHostControlsVisible 
            ? "bg-[#8ab4f8] text-[#202124]" 
            : "text-gray-400 hover:text-white hover:bg-[#3c4043]"
        )}
        title="Host controls"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
    </div>
  )
})

// Reusable Control Button with optional dropdown arrow
const ControlButton = memo(function ControlButton({
  children,
  onClick,
  disabled = false,
  isActive: _isActive = true,
  isDestructive = false,
  isHighlighted = false,
  hasDropdown = false,
  title,
}: {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  isActive?: boolean
  isDestructive?: boolean
  isHighlighted?: boolean
  hasDropdown?: boolean
  title?: string
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          "transition-all duration-150 disabled:opacity-50",
          isDestructive 
            ? "bg-[#ea4335] text-white" 
            : isHighlighted
              ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#7aa8f0]"
              : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"
        )}
        title={title}
      >
        {children}
      </button>
      {/* Small dropdown arrow indicator */}
      {hasDropdown && (
        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#3c4043] rounded-full flex items-center justify-center border border-[#202124]">
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 6" fill="none">
            <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  )
})

// Menu Button
const MenuButton = memo(function MenuButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                 hover:bg-[#3c4043] transition-colors duration-150 text-white"
    >
      {icon}
      <span className="text-sm">{children}</span>
    </button>
  )
})

// Device Select
const DeviceSelect = memo(function DeviceSelect({
  icon,
  label,
  devices,
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  devices: MediaDeviceInfo[]
  onSelect: (deviceId: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <select
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-[#3c4043] text-white text-sm rounded-lg px-3 py-2 
                   border border-gray-600 focus:outline-none focus:border-[#8ab4f8]
                   transition-colors duration-150"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  )
})

ControlBar.displayName = 'ControlBar'
