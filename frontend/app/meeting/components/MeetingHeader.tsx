'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Users, Shield, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MeetingHeaderProps {
  title?: string
  participantCount: number
  isRecording?: boolean
  isConnected?: boolean
  isHost?: boolean
  startedAt?: Date | null
  error?: string | null
}

export function MeetingHeader({
  title = 'Meeting',
  participantCount,
  isRecording = false,
  isConnected = true,
  isHost = false,
  startedAt,
  error,
}: MeetingHeaderProps) {
  const [duration, setDuration] = useState('00:00')

  // Update duration every second
  useEffect(() => {
    if (!startedAt) return

    const updateDuration = () => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - startedAt.getTime()) / 1000)
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      if (hours > 0) {
        setDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      } else {
        setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 flex items-center justify-between">
      {/* Left: Title and Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px]">
          {title}
        </h1>
        
        {isHost && (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Host
          </Badge>
        )}

        {isRecording && (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            REC
          </Badge>
        )}
      </div>

      {/* Center: Connection Status */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!isConnected && !error && (
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-md text-sm">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Connecting...
        </div>
      )}

      {/* Right: Duration and Participants */}
      <div className="flex items-center gap-4">
        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{duration}</span>
        </div>

        {/* Participant Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{participantCount}</span>
        </div>
      </div>
    </header>
  )
}
