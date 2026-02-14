'use client'

import React, { memo } from 'react'
import { Info, MessageSquare, Grid3X3, Shield, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { 
  useUIPanelsStore, 
  selectActivePanel, 
  useChatStore, 
  selectUnreadCount,
  usePermissionsStore,
  selectIsHostOrCoHost,
  useMeetingToolsStore,
  selectIsRecording
} from '../stores'
import type { ActivePanelType } from '../stores'

interface ControlClusterProps {
  className?: string
}

interface ClusterButtonProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  badge?: number | string | null
  badgeVariant?: 'count' | 'live' | 'recording'
  onClick: () => void
  ariaLabel: string
}

const ClusterButton = memo(function ClusterButton({
  icon,
  label,
  isActive,
  badge,
  badgeVariant = 'count',
  onClick,
  ariaLabel,
}: ClusterButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1",
        "w-14 h-14 rounded-xl transition-all duration-200",
        "hover:bg-[#3c4043]",
        isActive && "bg-[#8ab4f8]/20 text-[#8ab4f8]",
        !isActive && "text-white"
      )}
    >
      <div className="relative">
        {icon}
        {badge !== null && badge !== undefined && badge !== 0 && (
          <span className={cn(
            "absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1",
            "text-[10px] font-bold rounded-full",
            "flex items-center justify-center",
            badgeVariant === 'count' && "bg-[#8ab4f8] text-white",
            badgeVariant === 'live' && "bg-[#81c995] text-white",
            badgeVariant === 'recording' && "bg-red-500 text-white animate-pulse"
          )}>
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
})

/**
 * Control Cluster - Bottom-right control group
 * Contains: Info, Chat, Tools, Host Controls (lock)
 * 
 * Features:
 * - Only one panel open at a time (managed by Zustand)
 * - Unread badge on chat
 * - Recording indicator on tools
 * - Host controls only visible to host/co-host
 * - Smooth transitions
 * - Accessible ARIA labels
 */
export const ControlCluster = memo(function ControlCluster({
  className,
}: ControlClusterProps) {
  const activePanel = useUIPanelsStore(selectActivePanel)
  const setActivePanel = useUIPanelsStore(state => state.setActivePanel)
  const unreadCount = useChatStore(selectUnreadCount)
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  const isRecording = useMeetingToolsStore(selectIsRecording)
  
  const handleTogglePanel = (panel: ActivePanelType) => {
    if (activePanel === panel) {
      setActivePanel(null)
    } else {
      setActivePanel(panel)
    }
  }
  
  return (
    <div className={cn(
      "flex items-center gap-1 bg-[#202124]/80 backdrop-blur-sm rounded-2xl p-1",
      "border border-gray-800/50",
      className
    )}>
      {/* Info (Meeting Details) */}
      <ClusterButton
        icon={<Info className="h-5 w-5" />}
        label="Info"
        isActive={activePanel === 'details'}
        onClick={() => handleTogglePanel('details')}
        ariaLabel={activePanel === 'details' ? 'Close meeting details' : 'Open meeting details'}
      />
      
      {/* Chat */}
      <ClusterButton
        icon={<MessageSquare className="h-5 w-5" />}
        label="Chat"
        isActive={activePanel === 'chat'}
        badge={unreadCount > 0 ? unreadCount : null}
        badgeVariant="count"
        onClick={() => handleTogglePanel('chat')}
        ariaLabel={activePanel === 'chat' ? 'Close chat' : `Open chat${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      />
      
      {/* Tools */}
      <ClusterButton
        icon={<Grid3X3 className="h-5 w-5" />}
        label="Tools"
        isActive={activePanel === 'tools'}
        badge={isRecording ? 'REC' : null}
        badgeVariant="recording"
        onClick={() => handleTogglePanel('tools')}
        ariaLabel={activePanel === 'tools' ? 'Close tools' : 'Open meeting tools'}
      />
      
      {/* Host Controls (Lock) - Only visible to host/co-host */}
      {isHostOrCoHost && (
        <ClusterButton
          icon={activePanel === 'host' ? <Shield className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          label="Controls"
          isActive={activePanel === 'host'}
          onClick={() => handleTogglePanel('host')}
          ariaLabel={activePanel === 'host' ? 'Close host controls' : 'Open host controls'}
        />
      )}
    </div>
  )
})

ControlCluster.displayName = 'ControlCluster'
