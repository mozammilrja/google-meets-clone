'use client'

import React from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
  MoreVertical,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { DeviceSettings } from './DeviceSettings'
import { Reactions } from './Reactions'

interface ControlBarProps {
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  isChatVisible: boolean
  isParticipantsPanelVisible: boolean
  isHandRaised: boolean
  isLoading?: boolean
  participantId: string
  participantName: string
  meetingCode?: string
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onToggleHandRaise: () => void
  onReaction: (emoji: string) => void
  onLeaveMeeting: () => void
  onCopyMeetingLink?: () => void
}

export function ControlBar({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isChatVisible,
  isParticipantsPanelVisible,
  isHandRaised,
  isLoading = false,
  participantId,
  participantName,
  meetingCode,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleHandRaise,
  onReaction,
  onLeaveMeeting,
  onCopyMeetingLink,
}: ControlBarProps) {
  return (
    <div className="h-20 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between">
      {/* Left: Meeting Info */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {meetingCode?.toUpperCase()}
        </span>
        {onCopyMeetingLink && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopyMeetingLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy meeting link</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Center: Main Controls */}
      <div className="flex items-center gap-2">
        {/* Audio Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAudioEnabled ? 'outline' : 'destructive'}
              size="icon"
              onClick={onToggleAudio}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              {isAudioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isAudioEnabled ? 'Mute' : 'Unmute'}</TooltipContent>
        </Tooltip>

        {/* Video Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVideoEnabled ? 'outline' : 'destructive'}
              size="icon"
              onClick={onToggleVideo}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              {isVideoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isVideoEnabled ? 'Stop video' : 'Start video'}</TooltipContent>
        </Tooltip>

        {/* Screen Share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenSharing ? 'default' : 'outline'}
              size="icon"
              onClick={onToggleScreenShare}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              {isScreenSharing ? (
                <MonitorOff className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isScreenSharing ? 'Stop sharing' : 'Share screen'}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-2 bg-gray-200 dark:bg-gray-700" />

        {/* Reactions */}
        <Reactions
          participantId={participantId}
          participantName={participantName}
          isHandRaised={isHandRaised}
          onReaction={onReaction}
          onToggleHandRaise={onToggleHandRaise}
        />

        <Separator orientation="vertical" className="h-8 mx-2 bg-gray-200 dark:bg-gray-700" />

        {/* Chat Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isChatVisible ? 'default' : 'outline'}
              size="icon"
              onClick={onToggleChat}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isChatVisible ? 'Hide chat' : 'Show chat'}</TooltipContent>
        </Tooltip>

        {/* Participants Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isParticipantsPanelVisible ? 'default' : 'outline'}
              size="icon"
              onClick={onToggleParticipants}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              <Users className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isParticipantsPanelVisible ? 'Hide participants' : 'Show participants'}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-2 bg-gray-200 dark:bg-gray-700" />

        {/* Leave Meeting */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={onLeaveMeeting}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave meeting</TooltipContent>
        </Tooltip>
      </div>

      {/* Right: Settings */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DeviceSettings />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCopyMeetingLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy meeting link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLeaveMeeting} className="text-destructive focus:text-destructive">
              <PhoneOff className="mr-2 h-4 w-4" />
              Leave meeting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
