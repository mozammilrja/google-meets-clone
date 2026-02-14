'use client'

import React, { memo } from 'react'
import { type FloatingReaction } from '../stores'

interface FloatingReactionsProps {
  reactions: FloatingReaction[]
}

/**
 * Floating reactions overlay
 * Shows emoji reactions floating up the screen
 */
export const FloatingReactions = memo(function FloatingReactions({
  reactions,
}: FloatingReactionsProps) {
  if (reactions.length === 0) return null
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {reactions.map((reaction) => (
        <ReactionBubble key={reaction.id} reaction={reaction} />
      ))}
    </div>
  )
})

const ReactionBubble = memo(function ReactionBubble({
  reaction,
}: {
  reaction: FloatingReaction
}) {
  return (
    <div
      className="absolute bottom-0 animate-float-up"
      style={{ 
        left: `${reaction.x}%`,
        // Stagger animation start time based on reaction id
        animationDelay: `${parseInt(reaction.id.slice(-2), 16) % 5 * 100}ms`
      }}
    >
      <div className="flex flex-col items-center">
        <span className="text-5xl drop-shadow-lg">{reaction.emoji}</span>
        <span className="text-xs text-white bg-black/60 rounded-full px-2 py-0.5 mt-1 
                         whitespace-nowrap backdrop-blur-sm">
          {reaction.participantName}
        </span>
      </div>
    </div>
  )
})

FloatingReactions.displayName = 'FloatingReactions'
