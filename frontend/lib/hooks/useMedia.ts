'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/context/auth'
import { mediaService } from '@/lib/services/media'

/**
 * useMedia Hook - ONLY handles socket connection to media server
 * 
 * DOES NOT:
 * - Join rooms
 * - Initialize mediasoup device
 * - Create transports
 * 
 * Use useMediaStreaming hook for those operations
 */
export function useMedia() {
  const { token } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connectingRef = useRef(false)

  useEffect(() => {
    // Already connected or no token
    if (!token) {
      console.log('[useMedia] Skipping - no token')
      return
    }

    // Check if media service is already connected
    if (mediaService.isConnected()) {
      console.log('[useMedia] Already connected (from service)')
      if (!isConnected) setIsConnected(true)
      return
    }

    // Prevent duplicate connection attempts from this hook
    if (connectingRef.current) {
      console.log('[useMedia] Skipping - connectingRef is true')
      return
    }
    
    if (isConnected) {
      console.log('[useMedia] Skipping - isConnected state is true')
      return
    }

    connectingRef.current = true
    console.log('[useMedia] Starting connection...')

    const connect = async () => {
      try {
        const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL
        console.log('[useMedia] Calling mediaService.connect to:', mediaUrl)
        
        if (!mediaUrl) {
          throw new Error('NEXT_PUBLIC_MEDIA_URL not configured')
        }

        // ONLY connect socket - do NOT initialize device here
        await mediaService.connect(mediaUrl, token)
        console.log('[useMedia] Socket connected successfully')
        setIsConnected(true)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection failed'
        console.error('[useMedia] Connection error:', message)
        setError(message)
        setIsConnected(false)
      } finally {
        connectingRef.current = false
      }
    }

    connect()

    const handleDisconnect = () => {
      console.log('[useMedia] Socket disconnected')
      setIsConnected(false)
      connectingRef.current = false
    }

    mediaService.on('disconnected', handleDisconnect)

    return () => {
      console.log('[useMedia] Cleanup running')
      mediaService.off('disconnected', handleDisconnect)
    }
  }, [token])

  const disconnect = useCallback(() => {
    mediaService.disconnect()
    setIsConnected(false)
    connectingRef.current = false
  }, [])

  return { isConnected, error, disconnect }
}

export function useMediaListener(eventName: string, callback: (...args: any[]) => void) {
  useEffect(() => {
    mediaService.on(eventName, callback)
    return () => {
      mediaService.off(eventName, callback)
    }
  }, [eventName, callback])
}

