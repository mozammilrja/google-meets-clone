'use client'

import React, { memo, useEffect, useState } from 'react'
import { Circle, CircleStop } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMeetingToolsStore, selectRecording } from '../stores'
import { usePermissionsStore, selectIsHostOrCoHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'

interface RecordingIndicatorProps {
  meetingId: string
  className?: string
}

/**
 * Recording Indicator - Shows when meeting is being recorded
 */
export const RecordingIndicator = memo(function RecordingIndicator({
  meetingId,
  className,
}: RecordingIndicatorProps) {
  const recording = useMeetingToolsStore(selectRecording)
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  const startRecording = useMeetingToolsStore(state => state.startRecording)
  const stopRecording = useMeetingToolsStore(state => state.stopRecording)
  
  const [elapsed, setElapsed] = useState('00:00')
  
  // Update elapsed time
  useEffect(() => {
    if (!recording.isRecording || !recording.startedAt) return
    
    const interval = setInterval(() => {
      const startTime = new Date(recording.startedAt!).getTime()
      const now = Date.now()
      const diffSecs = Math.floor((now - startTime) / 1000)
      const mins = Math.floor(diffSecs / 60)
      const secs = diffSecs % 60
      setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [recording.isRecording, recording.startedAt])
  
  const handleToggleRecording = () => {
    if (recording.isRecording) {
      stopRecording()
      signalingService.emit('recording-stopped', { meetingId })
    } else {
      startRecording(meetingId)
      signalingService.emit('recording-started', { meetingId })
    }
  }
  
  // Non-host view: just show indicator if recording
  if (!isHostOrCoHost) {
    if (!recording.isRecording) return null
    
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-red-600/90 rounded-full",
        className
      )}>
        <Circle className="h-3 w-3 fill-white text-white animate-pulse" />
        <span className="text-sm font-medium text-white">Recording</span>
        <span className="text-sm text-white/80">{elapsed}</span>
      </div>
    )
  }
  
  // Host/Co-host view: clickable button
  return (
    <button
      onClick={handleToggleRecording}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
        recording.isRecording
          ? "bg-red-600 hover:bg-red-500"
          : "bg-[#3c4043] hover:bg-[#5f6368]",
        className
      )}
    >
      {recording.isRecording ? (
        <>
          <CircleStop className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">Stop Recording</span>
          <span className="text-sm text-white/80">{elapsed}</span>
        </>
      ) : (
        <>
          <Circle className="h-4 w-4 text-red-400" />
          <span className="text-sm font-medium text-white">Record</span>
        </>
      )}
    </button>
  )
})

RecordingIndicator.displayName = 'RecordingIndicator'
