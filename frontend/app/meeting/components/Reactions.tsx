'use client'

import React, { useState, useEffect } from 'react'
import { Hand, ThumbsUp, Heart, PartyPopper, Laugh, Frown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'

interface Reaction {
  id: string
  emoji: string
  participantId: string
  participantName: string
  timestamp: number
}

interface ReactionsProps {
  participantId: string
  participantName: string
  isHandRaised?: boolean
  onReaction: (emoji: string) => void
  onToggleHandRaise: () => void
  reactions?: Reaction[]
}

const reactionEmojis = [
  { emoji: '👍', label: 'Thumbs up', icon: ThumbsUp },
  { emoji: '❤️', label: 'Heart', icon: Heart },
  { emoji: '😂', label: 'Laugh', icon: Laugh },
  { emoji: '🎉', label: 'Celebrate', icon: PartyPopper },
  { emoji: '😢', label: 'Sad', icon: Frown },
  { emoji: '👏', label: 'Clap' },
]

export function Reactions({
  participantId: _participantId,
  participantName: _participantName,
  isHandRaised = false,
  onReaction,
  onToggleHandRaise,
  reactions = [],
}: ReactionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([])

  // Handle incoming reactions
  useEffect(() => {
    if (reactions.length > activeReactions.length) {
      const newReactions = reactions.slice(activeReactions.length)
      setActiveReactions((prev) => [...prev, ...newReactions])

      // Auto-remove reactions after 3 seconds
      newReactions.forEach((reaction) => {
        setTimeout(() => {
          setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id))
        }, 3000)
      })
    }
  }, [reactions])

  const handleReaction = (emoji: string) => {
    onReaction(emoji)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Floating Reactions Display */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none">
        {activeReactions.map((reaction, index) => (
          <div
            key={reaction.id}
            className="absolute animate-bounce text-3xl"
            style={{
              left: `${(index % 3 - 1) * 40}px`,
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Hand Raise Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isHandRaised ? 'default' : 'secondary'}
              size="icon"
              onClick={onToggleHandRaise}
              className={cn(
                'relative',
                isHandRaised && 'bg-amber-500 hover:bg-amber-600'
              )}
            >
              <Hand className={cn('h-5 w-5', isHandRaised && 'animate-pulse')} />
              {isHandRaised && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isHandRaised ? 'Lower hand' : 'Raise hand'}
          </TooltipContent>
        </Tooltip>

        {/* Reactions Popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="icon">
              <span className="text-lg">😀</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="center" side="top">
            <div className="flex gap-1">
              {reactionEmojis.map(({ emoji, label }) => (
                <Tooltip key={emoji}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleReaction(emoji)}
                      className="p-2 text-2xl rounded-lg hover:bg-accent transition-colors"
                    >
                      {emoji}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

// Hand Raised Indicator - Shows on video tile
export function HandRaisedIndicator({ isRaised }: { isRaised: boolean }) {
  if (!isRaised) return null

  return (
    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
      <Hand className="h-3 w-3" />
      Hand raised
    </div>
  )
}

// Reaction Notification - Shows when someone reacts
export function ReactionNotification({ reaction }: { reaction: Reaction }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card rounded-lg border shadow-sm animate-in slide-in-from-bottom-2">
      <span className="text-2xl">{reaction.emoji}</span>
      <span className="text-sm text-muted-foreground">{reaction.participantName}</span>
    </div>
  )
}
