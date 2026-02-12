'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useMedia } from '@/lib/hooks/useMedia'
import { apiClient } from '@/lib/services/api'
import { useMeetingStore } from '@/lib/context/meeting'

interface MeetingInfo {
  id: string
  code: string
  title: string
  hostId: string
  status: string
}

export default function JoinByCodePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const { isAuthenticated, user } = useAuth()
  const { isConnected: mediaConnected } = useMedia()
  const { setMeeting } = useMeetingStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const initRef = useRef(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Store the join URL to redirect back after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', `/join/${code}`)
      }
      router.push('/auth/login')
    }
  }, [isAuthenticated, code, router])

  // Fetch meeting info by code
  useEffect(() => {
    if (!isAuthenticated || !code || initRef.current) return

    initRef.current = true
    const fetchMeeting = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('[JoinPage] Fetching meeting by code:', code)
        const meeting = await apiClient.getMeetingByCode(code)
        
        console.log('[JoinPage] Meeting found:', meeting)
        setMeetingInfo(meeting)
        setMeeting(meeting.id, meeting.code)
      } catch (err: any) {
        console.error('[JoinPage] Failed to fetch meeting:', err)
        if (err.status === 404) {
          setError('Meeting not found. Please check the code and try again.')
        } else {
          setError(err.message || 'Failed to find meeting')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeeting()
  }, [isAuthenticated, code, setMeeting])

  // Join the meeting
  const handleJoinMeeting = async () => {
    if (!meetingInfo || !user) return

    setIsJoining(true)
    setError(null)

    try {
      console.log('[JoinPage] Joining meeting:', meetingInfo.id)
      
      // Join via backend API to get participant ID
      const participantData = await apiClient.joinMeeting(meetingInfo.id, user.name || 'Guest')
      console.log('[JoinPage] Joined as participant:', participantData.participantId)

      // Navigate to the meeting room
      router.push(`/meeting/${meetingInfo.id}`)
    } catch (err: any) {
      console.error('[JoinPage] Failed to join meeting:', err)
      setError(err.message || 'Failed to join meeting')
      setIsJoining(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="p-8 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Exit<span className="text-blue-500">Meet</span>
            </h1>
            <p className="text-slate-400">Join Meeting</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Finding meeting...</p>
              <p className="text-slate-500 text-sm mt-2">Code: {code}</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => router.push('/meeting/lobby')}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Go to Lobby
              </button>
            </div>
          )}

          {/* Meeting Found - Ready to Join */}
          {meetingInfo && !isLoading && !error && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">
                {meetingInfo.title || 'Meeting'}
              </h2>

              <p className="text-slate-400 mb-6">
                Code: <span className="font-mono text-blue-400">{meetingInfo.code.toUpperCase()}</span>
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleJoinMeeting}
                  disabled={isJoining || !mediaConnected}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Joining...
                    </span>
                  ) : !mediaConnected ? (
                    'Connecting...'
                  ) : (
                    'Join Meeting'
                  )}
                </button>

                <button
                  onClick={() => router.push('/meeting/lobby')}
                  className="w-full py-2 text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>

              {user && (
                <p className="text-slate-500 text-sm mt-6">
                  Joining as <span className="text-slate-300">{user.name}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
