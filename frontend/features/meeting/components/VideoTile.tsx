'use client'

import React, { memo, useState, useEffect, useRef } from 'react'
import { MicOff, Hand, Pin, MonitorUp } from 'lucide-react'
import { useVideoStore } from '@/lib/context/video'
import { cn } from '@/lib/utils/cn'

interface VideoTileProps {
  participantId: string
  name: string
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isHandRaised?: boolean
  isScreenSharing?: boolean
  isPinned?: boolean
  className?: string
}

/**
 * Remote participant video tile
 * Subscribes to video store for stream updates
 */
export const VideoTile = memo(function VideoTile({
  participantId,
  name,
  isAudioEnabled,
  isVideoEnabled,
  isHandRaised = false,
  isScreenSharing = false,
  isPinned = false,
  className,
}: VideoTileProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hasVideoStream, setHasVideoStream] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastStreamRef = useRef<MediaStream | null>(null)
  
  // Get remote stream from video store
  const remoteStreams = useVideoStore(state => state.remoteStreams)
  const remoteStream = remoteStreams.get(participantId)
  
  // Attach stream to video element
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    
    // Only update if stream actually changed
    if (remoteStream !== lastStreamRef.current) {
      videoElement.srcObject = remoteStream || null
      lastStreamRef.current = remoteStream || null
      
      // Check for video tracks
      if (remoteStream) {
        const videoTracks = remoteStream.getVideoTracks()
        setHasVideoStream(videoTracks.length > 0 && videoTracks[0].readyState === 'live')
      } else {
        setHasVideoStream(false)
      }
    }
  }, [remoteStream])
  
  // Monitor track state changes
  useEffect(() => {
    if (!remoteStream) return
    
    let currentHasStream = hasVideoStream
    
    const checkTracks = () => {
      const videoTracks = remoteStream.getVideoTracks()
      const newHasStream = videoTracks.length > 0 && videoTracks[0].readyState === 'live'
      
      if (newHasStream !== currentHasStream) {
        currentHasStream = newHasStream
        setHasVideoStream(newHasStream)
      }
    }
    
    const interval = setInterval(checkTracks, 1000)
    return () => clearInterval(interval)
  }, [remoteStream, hasVideoStream])
  
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'
  
  const showVideo = isVideoEnabled && hasVideoStream
  
  return (
    <div 
      className={cn(
        "relative rounded-xl overflow-hidden bg-gray-800",
        "group transition-shadow duration-200",
        "hover:ring-2 hover:ring-gray-600/50",
        isPinned && "ring-2 ring-blue-500",
        isScreenSharing && "ring-2 ring-green-500",
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
        className={cn(
          "w-full h-full object-cover",
          !showVideo && "hidden"
        )}
      />
      
      {/* Avatar Fallback */}
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl">
            <span className="text-xl font-medium text-white">{initials}</span>
          </div>
        </div>
      )}
      
      {/* Top indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {/* Screen sharing indicator */}
        {isScreenSharing && (
          <div className="px-2 py-1 rounded bg-green-600/90 flex items-center gap-1">
            <MonitorUp className="h-3 w-3 text-white" />
            <span className="text-xs text-white">Presenting</span>
          </div>
        )}
        
        {/* Muted indicator */}
        {!isAudioEnabled && (
          <div className="w-7 h-7 rounded-full bg-[#3c4043]/90 flex items-center justify-center">
            <MicOff className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      
      {/* Hand raised indicator */}
      {isHandRaised && (
        <div className="absolute top-2 left-2">
          <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse">
            <Hand className="h-3.5 w-3.5 text-gray-900" />
          </div>
        </div>
      )}
      
      {/* Bottom gradient with name */}
      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent",
          "p-2.5 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-80"
        )}
      >
        <span className="text-sm font-medium text-white truncate block">
          {name}
        </span>
      </div>
      
      {/* Pin button on hover */}
      {isHovered && (
        <button 
          className="absolute bottom-12 right-2 p-1.5 rounded-full bg-black/50 
                     hover:bg-black/70 text-white transition-colors duration-150"
          onClick={() => {/* Handle pin */}}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
})

VideoTile.displayName = 'VideoTile'
