'use client'

import React, { memo, useState, useEffect, useCallback } from 'react'
import { X, Check, Calendar, Users, Shield, Link2, Info } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMeetingSessionStore, selectParticipantCount } from '../stores'

interface InfoPanelProps {
  meetingCode: string
  meetingId?: string
  hostName?: string
  onClose: () => void
  onCopyLink: () => Promise<string>
}

/**
 * Meeting Details Panel - shows joining info
 * Matches Google Meet "Meeting details" panel style
 * Features:
 * - Meeting ID/code display
 * - Copy invite link with toast feedback
 * - Live participant count
 * - Host name display
 * - Outside click handling
 * - ESC key handling
 * - Smooth slide-in animation
 */
export const InfoPanel = memo(function InfoPanel({
  meetingCode,
  meetingId,
  hostName = 'You (Host)',
  onClose,
  onCopyLink,
}: InfoPanelProps) {
  const [copied, setCopied] = useState(false)
  const participantCount = useMeetingSessionStore(selectParticipantCount)
  
  const getMeetingLink = () => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/join/${meetingCode}`
  }
  
  const handleCopyLink = async () => {
    await onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])
  
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
        aria-label="Meeting details"
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
            <Info className="h-5 w-5 text-[#8ab4f8]" />
            <h2 className="text-lg font-medium text-white">Meeting details</h2>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Meeting ID Section */}
          {meetingId && (
            <div className="bg-[#3c4043]/30 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Meeting ID</h3>
              <p className="text-sm text-gray-300 font-mono">{meetingId}</p>
            </div>
          )}
          
          {/* Joining Info Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Joining info</h3>
            <div className="bg-[#3c4043]/50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-300 break-all font-mono">
                {getMeetingLink()}
              </p>
            </div>
            
            <button
              onClick={handleCopyLink}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all",
                "px-4 py-2 rounded-full",
                copied 
                  ? "bg-green-500/20 text-green-400" 
                  : "text-[#8ab4f8] hover:bg-[#8ab4f8]/10"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied to clipboard!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Copy invite link
                </>
              )}
            </button>
          </div>
          
          {/* Meeting Info */}
          <div className="pt-4 border-t border-gray-700/50 space-y-4">
            {/* Host */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8ab4f8]/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#8ab4f8]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Host</p>
                <p className="text-sm text-white">{hostName}</p>
              </div>
            </div>
            
            {/* Participants */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#81c995]/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#81c995]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Participants</p>
                <p className="text-sm text-white">
                  {participantCount} {participantCount === 1 ? 'person' : 'people'} in call
                </p>
              </div>
            </div>
          </div>
          
          {/* Calendar Attachments Section */}
          <div className="pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-3 text-gray-500 bg-[#3c4043]/20 rounded-lg p-3">
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">No calendar event attached</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
})

InfoPanel.displayName = 'InfoPanel'
