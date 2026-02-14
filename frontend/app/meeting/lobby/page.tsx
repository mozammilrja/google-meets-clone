'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Copy, Check, Plus, ArrowRight, Loader2, LogOut, Clock, Keyboard, Users, Link2, Calendar, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiClient } from '@/lib/services/api'
import { useMeetingStore } from '@/lib/context/meeting'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LobbyPage() {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuth()
  const { setMeeting } = useMeetingStore()
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [meetingCode, setMeetingCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [createdMeeting, setCreatedMeeting] = useState<{ id: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowNewMeetingMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isClient, isAuthenticated, router])

  const handleCreateMeetingForLater = async () => {
    setShowNewMeetingMenu(false)
    setIsCreating(true)
    setError('')
    setCreatedMeeting(null)
    try {
      const meeting = await apiClient.createMeeting('My Meeting', 60)
      const meetingId = meeting.id || (meeting as any)._id
      if (!meetingId) {
        throw new Error('Meeting created but no ID was returned')
      }
      setMeeting(meetingId, meeting.code)
      setCreatedMeeting({ id: meetingId, code: meeting.code })
      toast({
        title: 'Meeting created!',
        description: `Code: ${meeting.code.toUpperCase()}`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartInstantMeeting = async () => {
    setShowNewMeetingMenu(false)
    setIsCreating(true)
    setError('')
    try {
      const meeting = await apiClient.createMeeting('Instant Meeting', 60)
      const meetingId = meeting.id || (meeting as any)._id
      if (!meetingId) {
        throw new Error('Meeting created but no ID was returned')
      }
      setMeeting(meetingId, meeting.code)
      router.push(`/meeting/${meetingId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting')
      setIsCreating(false)
    }
  }

  const handleScheduleInCalendar = async () => {
    setShowNewMeetingMenu(false)
    setIsCreating(true)
    setError('')
    try {
      // Create a meeting first to get the link
      const meeting = await apiClient.createMeeting('Scheduled Meeting', 60)
      const meetingId = meeting.id || (meeting as any)._id
      if (!meetingId) {
        throw new Error('Meeting created but no ID was returned')
      }
      
      const meetingLink = `${window.location.origin}/join/${meeting.code}`
      const title = encodeURIComponent('MeetClone Meeting')
      const details = encodeURIComponent(`Join the meeting: ${meetingLink}\n\nMeeting code: ${meeting.code.toUpperCase()}`)
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`
      
      window.open(calendarUrl, '_blank')
      
      toast({
        title: 'Meeting created!',
        description: 'Add it to your calendar',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinCreatedMeeting = () => {
    if (createdMeeting) {
      router.push(`/meeting/${createdMeeting.id}`)
    }
  }

  const getShareLink = () => {
    if (typeof window === 'undefined' || !createdMeeting) return ''
    return `${window.location.origin}/join/${createdMeeting.code}`
  }

  const copyShareLink = async () => {
    const link = getShareLink()
    if (link) {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast({
        title: 'Link copied!',
        description: 'Share this link with participants',
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoinMeeting = async (code: string) => {
    if (!code.trim()) {
      setError('Please enter a meeting code')
      return
    }

    setIsJoining(true)
    setError('')
    try {
      const meeting = await apiClient.getMeetingByCode(code.trim())
      setMeeting(meeting.id, meeting.code)
      router.push(`/join/${meeting.code}`)
    } catch (err: any) {
      if (err.status === 404) {
        setError('Meeting not found. Please check the code and try again.')
      } else {
        setError(err.message || 'Failed to join meeting')
      }
    } finally {
      setIsJoining(false)
    }
  }

  if (!isClient || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a2e] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#16213e] border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">MeetClone</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex px-6 py-12 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-12 w-full">
          {/* Left Section */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Video meetings for everyone
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Connect, collaborate, and celebrate from anywhere
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Created Meeting Success */}
            {createdMeeting && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Meeting created!</span>
                </div>
                <Badge variant="secondary" className="font-mono text-lg px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white mb-4">
                  {createdMeeting.code.toUpperCase()}
                </Badge>
                <div className="flex gap-2 mb-4">
                  <Input
                    readOnly
                    value={getShareLink()}
                    className="font-mono text-sm bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  />
                  <Button variant="outline" size="icon" onClick={copyShareLink} className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                    {copied ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleJoinCreatedMeeting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Start Meeting
                  </Button>
                  <Button variant="outline" onClick={() => setCreatedMeeting(null)} className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              {/* New Meeting Dropdown */}
              <div className="relative" ref={menuRef}>
                <Button 
                  onClick={() => setShowNewMeetingMenu(!showNewMeetingMenu)} 
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4 mr-2" />
                  )}
                  New meeting
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {/* Dropdown Menu */}
                {showNewMeetingMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <button
                      onClick={handleCreateMeetingForLater}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Link2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>Create a meeting for later</span>
                    </button>
                    <button
                      onClick={handleStartInstantMeeting}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>Start an instant meeting</span>
                    </button>
                    <button
                      onClick={handleScheduleInCalendar}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>Schedule in Calendar</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex">
                <div className="relative">
                  <Keyboard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Enter meeting code"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                    disabled={isJoining}
                    className="pl-10 w-48 bg-white dark:bg-[#16213e] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-gray-600"
                  />
                </div>
                <Button
                  onClick={() => handleJoinMeeting(meetingCode)}
                  disabled={isJoining || !meetingCode.trim()}
                  variant="ghost"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-transparent disabled:text-gray-400 dark:disabled:text-gray-600"
                >
                  {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
                </Button>
              </div>
            </div>

            {/* Recent Meetings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent meetings</h2>
              <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-800 p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <Clock className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No recent meetings</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Create or join a meeting to get started</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Colorful Cards */}
          <div className="lg:w-96">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Purple Card - Users */}
              <button 
                onClick={handleStartInstantMeeting}
                className="aspect-square rounded-2xl bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center shadow-lg"
              >
                <Users className="h-12 w-12 text-white" />
              </button>
              
              {/* Pink Card - Video */}
              <button 
                onClick={handleStartInstantMeeting}
                className="aspect-square rounded-2xl bg-pink-500 hover:bg-pink-600 transition-colors flex items-center justify-center shadow-lg"
              >
                <Video className="h-12 w-12 text-white" />
              </button>
              
              {/* Teal Card - Clock */}
              <button 
                onClick={handleCreateMeetingForLater}
                className="aspect-square rounded-2xl bg-teal-500 hover:bg-teal-600 transition-colors flex items-center justify-center shadow-lg"
              >
                <Clock className="h-12 w-12 text-white" />
              </button>
              
              {/* Orange Card - Plus */}
              <button 
                onClick={handleStartInstantMeeting}
                className="aspect-square rounded-2xl bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center shadow-lg"
              >
                <Plus className="h-12 w-12 text-white" />
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready to meet?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Create a new meeting or join an existing one</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
