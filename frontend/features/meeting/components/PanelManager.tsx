'use client'

import React, { memo, Suspense, lazy, ComponentType, useCallback, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useUIPanelsStore, selectActivePanel } from '../stores'

// Define prop types for lazy-loaded components
interface InfoPanelProps {
  meetingCode: string
  meetingId?: string
  hostName?: string
  onClose: () => void
  onCopyLink: () => Promise<string>
}

interface ChatPanelProps {
  meetingId: string
  participantId: string
  participantName: string
}

interface ActivitiesPanelProps {
  meetingId: string
  onClose: () => void
}

interface HostControlsPanelProps {
  meetingId: string
  onClose: () => void
}

interface ParticipantsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

// Lazy load panels for code splitting
const InfoPanel: ComponentType<InfoPanelProps> = lazy(() => 
  import('./InfoPanel').then(m => ({ default: m.InfoPanel }))
)
const ChatPanel: ComponentType<ChatPanelProps> = lazy(() => 
  import('./ChatPanel').then(m => ({ default: m.ChatPanel }))
)
const ActivitiesPanel: ComponentType<ActivitiesPanelProps> = lazy(() => 
  import('./ActivitiesPanel').then(m => ({ default: m.ActivitiesPanel }))
)
const HostControlsPanel: ComponentType<HostControlsPanelProps> = lazy(() => 
  import('./HostControlsPanel').then(m => ({ default: m.HostControlsPanel }))
)
const ParticipantsDrawer: ComponentType<ParticipantsDrawerProps> = lazy(() => 
  import('./ParticipantsDrawer').then(m => ({ default: m.ParticipantsDrawer }))
)

// Panel loading fallback
const PanelLoader = memo(function PanelLoader() {
  return (
    <aside className="fixed right-4 top-4 bottom-24 w-[360px] z-40 
                      bg-[#202124]/95 backdrop-blur-lg rounded-xl shadow-2xl
                      flex items-center justify-center border border-gray-800/50
                      animate-in slide-in-from-right-5 fade-in duration-200">
      <Loader2 className="h-8 w-8 text-[#8ab4f8] animate-spin" />
    </aside>
  )
})

interface PanelManagerProps {
  meetingId: string
  meetingCode: string
  participantId: string
  participantName: string
  hostName?: string
  onCopyLink: () => Promise<string>
}

/**
 * Panel Manager - Orchestrates panel rendering
 * 
 * Features:
 * - Renders active panel based on Zustand state
 * - Only one panel open at a time
 * - Lazy loads panels for performance
 * - Handles close callbacks
 * - ESC key global handler
 * - Smooth animations via CSS
 */
export const PanelManager = memo(function PanelManager({
  meetingId,
  meetingCode,
  participantId,
  participantName,
  hostName,
  onCopyLink,
}: PanelManagerProps) {
  const activePanel = useUIPanelsStore(selectActivePanel)
  const setActivePanel = useUIPanelsStore(state => state.setActivePanel)
  const closeAllRightPanels = useUIPanelsStore(state => state.closeAllRightPanels)
  
  // Close panel handler
  const handleClose = useCallback(() => {
    setActivePanel(null)
  }, [setActivePanel])
  
  // Global ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanel) {
        closeAllRightPanels()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activePanel, closeAllRightPanels])
  
  // Render based on active panel
  const renderPanel = (): React.ReactNode => {
    switch (activePanel) {
      case 'details':
        return (
          <Suspense fallback={<PanelLoader />}>
            <InfoPanel
              meetingCode={meetingCode}
              meetingId={meetingId}
              hostName={hostName}
              onClose={handleClose}
              onCopyLink={onCopyLink}
            />
          </Suspense>
        )
        
      case 'chat':
        return (
          <Suspense fallback={<PanelLoader />}>
            <ChatPanel
              meetingId={meetingId}
              participantId={participantId}
              participantName={participantName}
            />
          </Suspense>
        )
        
      case 'tools':
        return (
          <Suspense fallback={<PanelLoader />}>
            <ActivitiesPanel
              meetingId={meetingId}
              onClose={handleClose}
            />
          </Suspense>
        )
        
      case 'host':
        return (
          <Suspense fallback={<PanelLoader />}>
            <HostControlsPanel
              meetingId={meetingId}
              onClose={handleClose}
            />
          </Suspense>
        )
        
      case 'participants':
        return (
          <Suspense fallback={<PanelLoader />}>
            <ParticipantsDrawer
              isOpen={true}
              onClose={handleClose}
            />
          </Suspense>
        )
        
      default:
        return null
    }
  }
  
  return <>{renderPanel()}</>
})

PanelManager.displayName = 'PanelManager'
