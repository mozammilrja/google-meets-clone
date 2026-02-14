'use client'

import React, { memo, useCallback, useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  MicOff, 
  VideoOff,
  WifiOff,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ErrorType = 'media' | 'connection' | 'permission' | 'meeting' | 'unknown'

interface ErrorCardProps {
  error: string
  errorType?: ErrorType
  onRetry?: () => void
  onDismiss?: () => void
  onBack?: () => void
  showDetails?: boolean
  className?: string
}

/**
 * Error card with recovery options
 * Displays contextual help based on error type
 */
export const ErrorCard = memo(function ErrorCard({
  error,
  errorType = 'unknown',
  onRetry,
  onDismiss,
  onBack,
  showDetails = false,
  className,
}: ErrorCardProps) {
  const [expanded, setExpanded] = useState(showDetails)
  const [retrying, setRetrying] = useState(false)
  
  const handleRetry = useCallback(async () => {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }, [onRetry])
  
  const errorConfig = {
    media: {
      icon: <VideoOff className="h-6 w-6" />,
      title: 'Camera or Microphone Error',
      suggestions: [
        'Check if another app is using your camera',
        'Refresh the page and allow camera access',
        'Try a different browser (Chrome works best)',
        'Check your device privacy settings',
      ],
    },
    connection: {
      icon: <WifiOff className="h-6 w-6" />,
      title: 'Connection Error',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable VPN or proxy if enabled',
        'Check if the meeting server is accessible',
      ],
    },
    permission: {
      icon: <MicOff className="h-6 w-6" />,
      title: 'Permission Denied',
      suggestions: [
        'Click the camera icon in your browser address bar',
        'Allow camera and microphone access',
        'In browser settings, reset site permissions',
        'Make sure your device has a working camera/mic',
      ],
    },
    meeting: {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: 'Meeting Error',
      suggestions: [
        'The meeting may have ended',
        'Check if you have the correct meeting link',
        'Contact the meeting host',
        'Try creating a new meeting',
      ],
    },
    unknown: {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: 'Something Went Wrong',
      suggestions: [
        'Try refreshing the page',
        'Clear browser cache and cookies',
        'Try a different browser',
        'Contact support if the issue persists',
      ],
    },
  }
  
  const config = errorConfig[errorType]
  
  return (
    <div 
      className={cn(
        "bg-[#292a2d] border border-red-900/50 rounded-xl overflow-hidden",
        "shadow-lg max-w-md w-full",
        "animate-in slide-in-from-bottom-2 fade-in duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-red-900/20">
        <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center text-red-400 flex-shrink-0">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-white">{config.title}</h3>
          <p className="text-sm text-red-300 mt-1 break-words">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-red-900/30 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>
      
      {/* Suggestions (collapsible) */}
      <div className="border-t border-gray-700">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-400 hover:bg-[#3c4043] transition-colors"
        >
          <span>Troubleshooting tips</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expanded && (
          <ul className="px-4 pb-4 space-y-2">
            {config.suggestions.map((suggestion, index) => (
              <li 
                key={index}
                className="flex items-start gap-2 text-sm text-gray-300"
              >
                <span className="text-[#8ab4f8] mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3 p-4 border-t border-gray-700 bg-[#202124]">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-[#3c4043] hover:bg-[#5f6368] 
                       text-white rounded-full text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lobby
          </button>
        )}
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]",
              retrying && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
            {retrying ? 'Retrying...' : 'Try Again'}
          </button>
        )}
      </div>
    </div>
  )
})

ErrorCard.displayName = 'ErrorCard'

/**
 * Inline error toast (for non-blocking errors)
 */
export const ErrorToast = memo(function ErrorToast({
  message,
  onDismiss,
  duration = 5000,
  className,
}: {
  message: string
  onDismiss?: () => void
  duration?: number
  className?: string
}) {
  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onDismiss])
  
  return (
    <div 
      className={cn(
        "fixed bottom-20 right-6 z-50",
        "flex items-center gap-3 px-4 py-3",
        "bg-red-900/90 border border-red-700 rounded-xl",
        "shadow-lg backdrop-blur-sm max-w-sm",
        "animate-in slide-in-from-right-2 fade-in duration-300",
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
      <p className="text-sm text-red-200 flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-full hover:bg-red-800 transition-colors"
        >
          <X className="h-4 w-4 text-red-300" />
        </button>
      )}
    </div>
  )
})

ErrorToast.displayName = 'ErrorToast'
