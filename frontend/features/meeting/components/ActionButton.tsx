'use client'

import React, { memo, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ActionButtonProps {
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  label: string
  isActive?: boolean
  isDestructive?: boolean
  onClick: () => void | Promise<void>
  disabled?: boolean
  className?: string
}

/**
 * Action button with built-in loading state
 * Used in control bar for media toggles
 */
export const ActionButton = memo(function ActionButton({
  icon,
  activeIcon,
  label,
  isActive = false,
  isDestructive = false,
  onClick,
  disabled = false,
  className,
}: ActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleClick = useCallback(async () => {
    if (isLoading || disabled) return
    
    setIsLoading(true)
    try {
      await onClick()
    } catch (error) {
      console.error(`[ActionButton] ${label} action failed:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [onClick, isLoading, disabled, label])
  
  const displayIcon = isActive && activeIcon ? activeIcon : icon
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "relative flex items-center justify-center",
        "w-12 h-12 rounded-full transition-all duration-200",
        // Default state
        !isActive && !isDestructive && "bg-[#3c4043] text-white hover:bg-[#5f6368]",
        // Active state (e.g., muted)
        isActive && !isDestructive && "bg-[#ea4335] text-white hover:bg-[#f04438]",
        // Destructive (e.g., leave call)
        isDestructive && "bg-[#ea4335] text-white hover:bg-[#f04438] hover:scale-105",
        // Disabled
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
        className
      )}
      title={label}
      aria-label={label}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <span className="transition-transform duration-200">
          {displayIcon}
        </span>
      )}
      
      {/* Pulse effect when toggling */}
      {isLoading && (
        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
      )}
    </button>
  )
})

ActionButton.displayName = 'ActionButton'

/**
 * Secondary action button (smaller, for auxiliary actions)
 */
export const SecondaryButton = memo(function SecondaryButton({
  icon,
  label,
  isActive = false,
  onClick,
  disabled = false,
  badge,
  className,
}: {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
  disabled?: boolean
  badge?: string | number
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative p-2.5 rounded-full transition-all",
        isActive 
          ? "bg-[#8ab4f8] text-[#202124]" 
          : "text-gray-400 hover:text-white hover:bg-[#3c4043]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={label}
      aria-label={label}
    >
      {icon}
      
      {/* Badge */}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 
                         bg-[#ea4335] text-white text-xs font-medium 
                         rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
})

SecondaryButton.displayName = 'SecondaryButton'
