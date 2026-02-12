'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Users, Copy, Check, Plus, ArrowRight, Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiClient } from '@/lib/services/api'
import { useMeetingStore } from '@/lib/context/meeting'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isClient, isAuthenticated, router])

  const handleCreateMeeting = async () => {
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

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (!isClient || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Exit<span className="text-primary">Meet</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground hidden sm:inline">{user?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Meeting */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Create Meeting</CardTitle>
                  <CardDescription>Start a new meeting instantly</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="p-3 mb-4 bg-destructive/15 border border-destructive rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              {createdMeeting ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">Meeting created!</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                      {createdMeeting.code.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={getShareLink()}
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={copyShareLink}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleJoinCreatedMeeting} className="flex-1">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Start Meeting
                    </Button>
                    <Button variant="outline" onClick={() => setCreatedMeeting(null)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleCreateMeeting} disabled={isCreating} className="w-full">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      New Meeting
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Join Meeting */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle>Join Meeting</CardTitle>
                  <CardDescription>Enter a code to join</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="ABC-DEF-GHI"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                disabled={isJoining}
                className="font-mono uppercase text-center text-lg tracking-widest"
              />
              <Button
                onClick={() => handleJoinMeeting(meetingCode)}
                disabled={isJoining || !meetingCode.trim()}
                variant="secondary"
                className="w-full"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Join
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to start your video conference</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { step: 1, text: 'Click "New Meeting" to create a new video conference' },
                { step: 2, text: 'Allow access to your camera and microphone' },
                { step: 3, text: 'Share the meeting code with other participants' },
                { step: 4, text: 'Use the controls to mute/unmute and manage your media' },
              ].map(({ step, text }) => (
                <li key={step} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                    {step}
                  </span>
                  <span className="text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
