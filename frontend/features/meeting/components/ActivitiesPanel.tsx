'use client'

import React, { memo, useState, useCallback, useEffect, Suspense, lazy, useMemo } from 'react'
import { 
  X, Timer, Mic, FileText, Radio, DoorOpen, BarChart3, HelpCircle, 
  ChevronRight, ChevronLeft, Loader2, Grid3X3
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { 
  useMeetingToolsStore, 
  selectTimer, 
  selectIsRecording, 
  selectActivePoll,
  usePermissionsStore,
  selectIsHostOrCoHost,
  useMeetingSessionStore
} from '../stores'

// Lazy load tool panels for code splitting
const TimerPanel = lazy(() => import('./TimerPanel').then(m => ({ default: m.TimerPanel })))
const PollsPanel = lazy(() => import('./PollsPanel').then(m => ({ default: m.PollsPanel })))
const QAPanel = lazy(() => import('./QAPanel').then(m => ({ default: m.QAPanel })))
const BreakoutRoomsPanel = lazy(() => import('./BreakoutRoomsPanel').then(m => ({ default: m.BreakoutRoomsPanel })))

interface ActivitiesPanelProps {
  meetingId: string
  participantId?: string
  participantName?: string
  onClose: () => void
}

type ToolView = 'list' | 'timer' | 'polls' | 'qa' | 'recording' | 'transcription' | 'streaming' | 'breakout'

// Loading spinner for lazy-loaded components
const ToolLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 text-[#8ab4f8] animate-spin" />
  </div>
)

interface ToolItemProps {
  icon: React.ReactNode
  title: string
  description: string
  isActive?: boolean
  available?: boolean
  badge?: string
  onClick: () => void
}

const ToolItem = memo(function ToolItem({
  icon,
  title,
  description,
  isActive = false,
  available = true,
  badge,
  onClick,
}: ToolItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-xl transition-all",
        available 
          ? "bg-[#292a2d] hover:bg-[#3c4043] cursor-pointer" 
          : "opacity-50 cursor-not-allowed",
        isActive && "ring-2 ring-[#8ab4f8] bg-[#8ab4f8]/10"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-full",
          available ? "bg-[#3c4043]" : "bg-[#292a2d]"
        )}>
          {icon}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              available ? "text-white" : "text-gray-400"
            )}>
              {title}
            </span>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500 text-white rounded">
                {badge}
              </span>
            )}
          </div>
          <div className={cn(
            "text-xs",
            available ? "text-gray-400" : "text-gray-500"
          )}>
            {description}
          </div>
        </div>
      </div>
      {available && <ChevronRight className="h-5 w-5 text-gray-400" />}
    </button>
  )
})

/**
 * Meeting Tools Panel - Activities/Tools
 * Features:
 * - Timer with countdown/stopwatch
 * - Polls creation and voting
 * - Q&A with upvotes
 * - Recording control
 * - Transcription toggle
 * - Live streaming
 * - Breakout rooms management
 * 
 * Each tool lazy loads when selected and integrates with stores
 */
export const ActivitiesPanel = memo(function ActivitiesPanel({
  meetingId,
  participantId: propParticipantId,
  participantName: propParticipantName,
  onClose,
}: ActivitiesPanelProps) {
  const [currentView, setCurrentView] = useState<ToolView>('list')
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  
  // Get participant data from store if not provided
  const localParticipant = useMeetingSessionStore(state => state.localParticipant)
  const remoteParticipants = useMeetingSessionStore(state => state.participants)
  
  const participantId = propParticipantId || localParticipant?.id || ''
  const participantName = propParticipantName || localParticipant?.name || 'Guest'
  
  // Get all participants for breakout rooms
  const allParticipants = useMemo(() => {
    const participants = [
      ...(localParticipant ? [{ id: localParticipant.id, name: localParticipant.name }] : []),
      ...remoteParticipants.map(p => ({ id: p.id, name: p.name }))
    ]
    return participants
  }, [localParticipant, remoteParticipants])
  
  // Get status indicators from stores
  const timer = useMeetingToolsStore(selectTimer)
  const isRecording = useMeetingToolsStore(selectIsRecording)
  const activePoll = useMeetingToolsStore(selectActivePoll)
  
  // ESC key to go back or close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (currentView !== 'list') {
        setCurrentView('list')
      } else {
        onClose()
      }
    }
  }, [currentView, onClose])
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  // Outside click to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }, [onClose])
  
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])
  
  const handleBackToList = useCallback(() => {
    setCurrentView('list')
  }, [])
  
  // Render specific tool panel with close callback
  const renderToolPanel = () => {
    const timerProps = {
      meetingId,
      onClose: handleBackToList,
    }
    
    const pollsQAProps = {
      meetingId,
      participantId,
      participantName,
      onClose: handleBackToList,
    }
    
    const breakoutProps = {
      meetingId,
      participants: allParticipants,
      currentParticipantId: participantId,
      onClose: handleBackToList,
    }
    
    switch (currentView) {
      case 'timer':
        return (
          <Suspense fallback={<ToolLoader />}>
            <TimerPanel {...timerProps} />
          </Suspense>
        )
      case 'polls':
        return (
          <Suspense fallback={<ToolLoader />}>
            <PollsPanel {...pollsQAProps} />
          </Suspense>
        )
      case 'qa':
        return (
          <Suspense fallback={<ToolLoader />}>
            <QAPanel {...pollsQAProps} />
          </Suspense>
        )
      case 'breakout':
        return (
          <Suspense fallback={<ToolLoader />}>
            <BreakoutRoomsPanel {...breakoutProps} />
          </Suspense>
        )
      default:
        return null
    }
  }
  
  // Main tools list
  const renderToolsList = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {/* Available Tools */}
      <div className="space-y-2">
        <ToolItem
          icon={<Timer className="h-5 w-5 text-[#8ab4f8]" />}
          title="Timer"
          description={timer?.isRunning ? 'Timer is running' : 'Show a countdown timer'}
          isActive={timer?.isRunning}
          onClick={() => setCurrentView('timer')}
        />
        
        <ToolItem
          icon={<BarChart3 className="h-5 w-5 text-[#81c995]" />}
          title="Polls"
          description="Create and manage polls"
          isActive={!!activePoll}
          badge={activePoll ? 'LIVE' : undefined}
          onClick={() => setCurrentView('polls')}
        />
        
        <ToolItem
          icon={<HelpCircle className="h-5 w-5 text-[#f9ab00]" />}
          title="Q&A"
          description="Ask and answer questions"
          onClick={() => setCurrentView('qa')}
        />
      </div>
      
      {/* Host-only tools */}
      {isHostOrCoHost && (
        <div className="pt-4 border-t border-gray-700/50">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 px-1">
            Host Tools
          </h3>
          
          <div className="space-y-2">
            <ToolItem
              icon={<Mic className={cn("h-5 w-5", isRecording ? "text-red-500" : "text-[#ea4335]")} />}
              title="Recording"
              description={isRecording ? 'Recording in progress' : 'Record the meeting'}
              isActive={isRecording}
              badge={isRecording ? 'REC' : undefined}
              onClick={() => setCurrentView('recording')}
            />
            
            <ToolItem
              icon={<FileText className="h-5 w-5 text-gray-500" />}
              title="Transcription"
              description="Capture the conversation"
              available={false}
              onClick={() => {}}
            />
            
            <ToolItem
              icon={<Radio className="h-5 w-5 text-gray-500" />}
              title="Live Streaming"
              description="Stream to view-only users"
              available={false}
              onClick={() => {}}
            />
            
            <ToolItem
              icon={<DoorOpen className="h-5 w-5 text-[#a142f4]" />}
              title="Breakout Rooms"
              description="Break into smaller groups"
              onClick={() => setCurrentView('breakout')}
            />
          </div>
        </div>
      )}
      
      {/* Non-host info */}
      {!isHostOrCoHost && (
        <div className="pt-4 border-t border-gray-700/50">
          <div className="bg-[#3c4043]/30 rounded-lg p-3">
            <p className="text-xs text-gray-400">
              Additional tools are available to the host
            </p>
          </div>
        </div>
      )}
    </div>
  )
  
  return (
    <>
      {/* Invisible backdrop for outside click */}
      <div 
        className="fixed inset-0 z-30" 
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      <aside 
        onClick={handlePanelClick}
        role="dialog"
        aria-label="Meeting tools"
        className={cn(
          "fixed right-4 top-4 bottom-24 w-[360px] z-40",
          "bg-[#202124]/95 backdrop-blur-lg rounded-xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "animate-in slide-in-from-right-5 fade-in duration-200",
          "border border-gray-800/50"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            {currentView !== 'list' ? (
              <button
                onClick={handleBackToList}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-[#3c4043] transition-colors"
                aria-label="Back to tools list"
              >
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </button>
            ) : (
              <Grid3X3 className="h-5 w-5 text-[#8ab4f8]" />
            )}
            <h2 className="text-lg font-medium text-white">
              {currentView === 'list' ? 'Meeting tools' : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        {currentView === 'list' ? renderToolsList() : (
          <div className="flex-1 overflow-hidden">
            {renderToolPanel()}
          </div>
        )}
      </aside>
    </>
  )
})

ActivitiesPanel.displayName = 'ActivitiesPanel'
