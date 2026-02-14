'use client'

import React, { memo, useState, useCallback } from 'react'
import { X, Copy, Check, UserPlus, Shield } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

interface InviteCardProps {
  meetingCode: string
  onClose: () => void
  onCopyLink: () => Promise<string>
}

/**
 * Invite card that appears at bottom-left of meeting
 * Shows meeting link and copy functionality
 */
export const InviteCard = memo(function InviteCard({
  meetingCode,
  onClose,
  onCopyLink,
}: InviteCardProps) {
  const { user } = useAuth()
  const [linkCopied, setLinkCopied] = useState(false)
  
  const getMeetingLink = useCallback(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/join/${meetingCode}`
  }, [meetingCode])
  
  const handleCopyLink = useCallback(async () => {
    await onCopyLink()
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [onCopyLink])
  
  const displayLink = getMeetingLink().replace(/^https?:\/\//, '')
  
  return (
    <div 
      className={cn(
        "fixed bottom-28 left-6 z-50 w-72",
        "bg-white dark:bg-[#2d2e30] rounded-xl shadow-2xl overflow-hidden",
        "animate-in slide-in-from-left-5 fade-in duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">
          Your meeting's ready
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 
                     transition-colors duration-150"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Add Others Button */}
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-full text-sm font-medium 
                     transition-colors duration-150 mb-4"
        >
          <UserPlus className="h-4 w-4" />
          Add others
        </button>

        {/* Share Link Text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Or share this meeting link with others you want in the meeting
        </p>

        {/* Meeting Link */}
        <div className="flex items-center gap-2 p-2.5 bg-gray-100 dark:bg-[#3c4043] rounded-lg mb-3">
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
            {displayLink}
          </span>
          <button
            onClick={handleCopyLink}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded 
                       transition-colors duration-150 flex-shrink-0"
            title="Copy link"
          >
            {linkCopied ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Permission Notice */}
        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <Shield className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <span>
            People who use this meeting link must get your permission before they can join.
          </span>
        </div>

        {/* Joined As */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Joined as {user?.email || user?.name || 'Guest'}
        </p>
      </div>
    </div>
  )
})

InviteCard.displayName = 'InviteCard'
