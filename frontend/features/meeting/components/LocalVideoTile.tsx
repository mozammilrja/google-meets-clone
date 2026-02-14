'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { MicOff, Hand, Pin } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LocalVideoTileProps {
  videoRef: React.RefObject<HTMLVideoElement>
  stream: MediaStream | null
  name: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isHandRaised?: boolean
  isPinned?: boolean
  className?: string
}

/**
 * Local video tile with optimized video element handling
 * Prevents blinking by only updating srcObject when necessary
 */
export const LocalVideoTile = memo(function LocalVideoTile({
  videoRef,
  stream,
  name,
  isVideoEnabled,
  isAudioEnabled,
  isHandRaised = false,
  isPinned = false,
  className,
}: LocalVideoTileProps) {
  const [isHovered, setIsHovered] = useState(false)
  const lastStreamRef = useRef<MediaStream | null>(null)
  
  // Only update srcObject when stream actually changes
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    
    // Compare stream references to avoid unnecessary updates
    if (stream !== lastStreamRef.current) {
      videoElement.srcObject = stream
      lastStreamRef.current = stream
    }
  }, [stream, videoRef])
  
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  return (
    <div 
      className={cn(
        "relative rounded-xl overflow-hidden bg-gray-800",
        "group transition-shadow duration-200",
        "hover:ring-2 hover:ring-blue-500/50",
        isPinned && "ring-2 ring-blue-500",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover",
          !isVideoEnabled && "hidden"
        )}
      />
      
      {/* Avatar Fallback - Google Meet style centered avatar */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-2xl ring-4 ring-white/10">
            <span className="text-3xl md:text-4xl font-semibold text-white drop-shadow-lg">{initials}</span>
          </div>
        </div>
      )}
      
      {/* Top-right indicators */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        {/* Profile badge */}
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white border-2 border-white/20">
          {initials}
        </div>
        
        {/* Muted indicator */}
        {!isAudioEnabled && (
          <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center">
            <MicOff className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      
      {/* Hand raised indicator */}
      {isHandRaised && (
        <div className="absolute top-3 left-3">
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse">
            <Hand className="h-4 w-4 text-gray-900" />
          </div>
        </div>
      )}
      
      {/* Bottom gradient with name */}
      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent",
          "p-3 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-70"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">
            {name} (You)
          </span>
          <span className="text-xs px-2 py-0.5 bg-blue-600/80 rounded-full text-white">
            Local
          </span>
        </div>
      </div>
      
      {/* Pin button on hover */}
      {isHovered && (
        <button 
          className="absolute bottom-14 right-3 p-2 rounded-full bg-black/50 
                     hover:bg-black/70 text-white transition-colors duration-150"
          onClick={() => {/* Handle pin */}}
        >
          <Pin className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})

LocalVideoTile.displayName = 'LocalVideoTile'
