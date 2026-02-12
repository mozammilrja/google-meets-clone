import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/context/auth'
import { signalingService } from '@/lib/services/signaling'

export function useSignaling() {
  const { token } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || isConnected) return

    const connect = async () => {
      try {
        await signalingService.connect(
          process.env.NEXT_PUBLIC_SIGNALING_URL!,
          token
        )
        setIsConnected(true)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection failed'
        setError(message)
        setIsConnected(false)
      }
    }

    connect()

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    signalingService.on('signaling:disconnected', handleDisconnect)

    return () => {
      signalingService.off('signaling:disconnected', handleDisconnect)
    }
  }, [token, isConnected])

  const disconnect = useCallback(() => {
    signalingService.disconnect()
    setIsConnected(false)
  }, [])

  return { isConnected, error, disconnect }
}

export function useSignalingListener(eventName: string, callback: Function) {
  useEffect(() => {
    signalingService.on(eventName, callback)
    return () => {
      signalingService.off(eventName, callback)
    }
  }, [eventName, callback])
}
