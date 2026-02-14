'use client'

import React, { memo, useEffect, useState } from 'react'
import { Wifi, WifiOff, Server, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

interface ConnectionStatusProps {
  signalingConnected: boolean
  mediaConnected: boolean
  className?: string
}

/**
 * Connection status indicator for meeting
 * Shows real-time connection state with auto-hide on success
 */
export const ConnectionStatus = memo(function ConnectionStatus({
  signalingConnected,
  mediaConnected,
  className,
}: ConnectionStatusProps) {
  const [visible, setVisible] = useState(true)
  const [state, setState] = useState<ConnectionState>('connecting')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  useEffect(() => {
    if (signalingConnected && mediaConnected) {
      setState('connected')
      // Auto-hide after connection is stable
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    } else if (!signalingConnected && !mediaConnected) {
      setState('connecting')
      setVisible(true)
    } else {
      setState('reconnecting')
      setVisible(true)
      setReconnectAttempts(prev => prev + 1)
    }
  }, [signalingConnected, mediaConnected])
  
  // Don't render if hidden
  if (!visible && state === 'connected') {
    return null
  }
  
  const statusConfig = {
    connecting: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: 'Connecting to meeting server...',
      bgClass: 'bg-yellow-900/90 border-yellow-700',
      textClass: 'text-yellow-200',
    },
    connected: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: 'Connected',
      bgClass: 'bg-green-900/90 border-green-700',
      textClass: 'text-green-200',
    },
    reconnecting: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: `Reconnecting... (attempt ${reconnectAttempts})`,
      bgClass: 'bg-orange-900/90 border-orange-700',
      textClass: 'text-orange-200',
    },
    disconnected: {
      icon: <WifiOff className="h-4 w-4" />,
      text: 'Disconnected from server',
      bgClass: 'bg-red-900/90 border-red-700',
      textClass: 'text-red-200',
    },
    error: {
      icon: <AlertTriangle className="h-4 w-4" />,
      text: 'Connection error',
      bgClass: 'bg-red-900/90 border-red-700',
      textClass: 'text-red-200',
    },
  }
  
  const config = statusConfig[state]
  
  return (
    <div 
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-4 py-2 rounded-full border",
        "shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-bottom-2 fade-in duration-300",
        config.bgClass,
        className
      )}
    >
      <span className={config.textClass}>{config.icon}</span>
      <span className={cn("text-sm font-medium", config.textClass)}>
        {config.text}
      </span>
      
      {/* Connection details */}
      <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-current/20">
        <div className={cn(
          "flex items-center gap-1",
          signalingConnected ? "text-green-400" : "text-red-400"
        )}>
          <Server className="h-3 w-3" />
          <span className="text-xs">Signal</span>
        </div>
        <div className={cn(
          "flex items-center gap-1",
          mediaConnected ? "text-green-400" : "text-red-400"
        )}>
          <Wifi className="h-3 w-3" />
          <span className="text-xs">Media</span>
        </div>
      </div>
    </div>
  )
})

ConnectionStatus.displayName = 'ConnectionStatus'
