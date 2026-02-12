'use client'

import React, { useCallback } from 'react'
import styles from './ScreenShare.module.css'

interface ScreenShareProps {
  meetingId: string
  participantId: string
  isScreenSharing: boolean
  onToggle: () => Promise<void>
  isLoading?: boolean
  error?: string
}

export const ScreenShare: React.FC<ScreenShareProps> = ({
  meetingId: _meetingId,
  participantId: _participantId,
  isScreenSharing,
  onToggle,
  isLoading = false,
  error = '',
}) => {
  const handleToggle = useCallback(async () => {
    try {
      await onToggle()
    } catch (err) {
      console.error('Screen share toggle error:', err)
    }
  }, [onToggle])

  return (
    <div className={styles.screenShareControl}>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`${styles.shareButton} ${isScreenSharing ? styles.active : ''}`}
        title={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="10" y1="21" x2="14" y2="21" />
          <line x1="6" y1="21" x2="8" y2="21" />
          <line x1="16" y1="21" x2="18" y2="21" />
        </svg>
        {isScreenSharing ? 'Sharing' : 'Share'}
      </button>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  )
}
