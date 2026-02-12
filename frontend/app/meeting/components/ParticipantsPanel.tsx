'use client'

import React from 'react'
import { X, Mic, MicOff, Video, VideoOff, Crown, MoreVertical, UserMinus, VolumeX } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Participant } from '@/lib/types'

interface ParticipantsPanelProps {
  participants: Participant[]
  localParticipant: { id: string; name: string } | null
  isHost?: boolean
  onClose: () => void
  onMuteParticipant?: (participantId: string) => void
  onRemoveParticipant?: (participantId: string) => void
}

export function ParticipantsPanel({
  participants,
  localParticipant,
  isHost = false,
  onClose,
  onMuteParticipant,
  onRemoveParticipant,
}: ParticipantsPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'host':
        return <Badge variant="default" className="ml-2"><Crown className="w-3 h-3 mr-1" />Host</Badge>
      case 'co-host':
        return <Badge variant="secondary" className="ml-2">Co-host</Badge>
      case 'guest':
        return <Badge variant="outline" className="ml-2">Guest</Badge>
      default:
        return null
    }
  }

  const allParticipants = [
    ...(localParticipant ? [{
      id: localParticipant.id,
      name: localParticipant.name,
      role: isHost ? 'host' : 'participant',
      audio: true,
      video: true,
      isLocal: true,
    }] : []),
    ...participants.map(p => ({ ...p, isLocal: false })),
  ]

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Participants</h2>
          <p className="text-sm text-muted-foreground">
            {allParticipants.length} in this meeting
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Participants List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {allParticipants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>

              {/* Name and Role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-foreground truncate">
                    {participant.name}
                    {participant.isLocal && ' (You)'}
                  </span>
                  {getRoleBadge(participant.role)}
                </div>
              </div>

              {/* Media Status */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`p-1 rounded ${participant.audio ? 'text-foreground' : 'text-destructive'}`}>
                      {participant.audio ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <MicOff className="h-4 w-4" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {participant.audio ? 'Mic on' : 'Mic off'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`p-1 rounded ${participant.video ? 'text-foreground' : 'text-destructive'}`}>
                      {participant.video ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <VideoOff className="h-4 w-4" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {participant.video ? 'Camera on' : 'Camera off'}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Host Actions */}
              {isHost && !participant.isLocal && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onMuteParticipant?.(participant.id)}
                      disabled={!participant.audio}
                    >
                      <VolumeX className="mr-2 h-4 w-4" />
                      Mute
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onRemoveParticipant?.(participant.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove from meeting
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer - Invite */}
      <div className="p-4">
        <Button variant="outline" className="w-full">
          Invite people
        </Button>
      </div>
    </div>
  )
}
