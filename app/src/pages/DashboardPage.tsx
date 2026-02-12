import React, { useState } from 'react';
import { Video, Plus, Keyboard, Clock, Copy, Check, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/custom/ThemeToggle';
import { useAuth, useMeeting, useToast } from '@/contexts';
import { formatRelativeTime, copyToClipboard } from '@/utils';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { createMeeting, joinMeeting, recentMeetings } = useMeeting();
  const { success, error } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateMeeting = async () => {
    setIsCreating(true);
    try {
      const code = await createMeeting('New Meeting');
      success('Meeting created', `Meeting code: ${code}`);
    } catch (err) {
      error('Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setIsJoining(true);
    try {
      await joinMeeting(joinCode.trim().toLowerCase().replace(/-/g, ''));
      success('Joined meeting');
    } catch (err) {
      error('Failed to join meeting', 'Please check the meeting code and try again');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;
    if (await copyToClipboard(formatted)) {
      setCopiedCode(code);
      success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleQuickJoin = (code: string) => {
    setJoinCode(code);
    joinMeeting(code);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">MeetClone</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video meetings for everyone</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Connect, collaborate, and celebrate from anywhere</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={handleCreateMeeting} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-5 w-5 mr-2" />
                {isCreating ? 'Creating...' : 'New meeting'}
              </Button>

              <form onSubmit={handleJoinMeeting} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Enter meeting code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={isJoining || !joinCode.trim()}>
                  {isJoining ? 'Joining...' : 'Join'}
                </Button>
              </form>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent meetings</h2>
              {recentMeetings.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No recent meetings</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Create or join a meeting to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                          <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{meeting.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(meeting.date)} • {meeting.participantCount} participants
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCode(meeting.code)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Copy meeting code"
                        >
                          {copiedCode === meeting.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
                        </button>
                        <Button size="sm" onClick={() => handleQuickJoin(meeting.code)}>Join</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <Users className="h-12 w-12 text-white/80" />
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Video className="h-12 w-12 text-white/80" />
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                    <Clock className="h-12 w-12 text-white/80" />
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                    <Plus className="h-12 w-12 text-white/80" />
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Ready to meet?</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Create a new meeting or join an existing one</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
