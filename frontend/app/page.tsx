'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import { Video, Users, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && isAuthenticated) {
      router.push('/meeting/lobby')
    }
  }, [isClient, isAuthenticated, router])

  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">MeetClone</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">
            Video meetings for <span className="text-blue-600">everyone</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Crystal-clear video conferencing platform built for teams. Connect, collaborate, and celebrate from anywhere.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-xl"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg transition border border-gray-200 dark:border-gray-700"
            >
              Sign up
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 mx-auto mb-4">
                <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">HD Video</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Crystal-clear HD video and audio for seamless communication
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Screen Share</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Share your screen in real-time to collaborate effectively
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 mx-auto mb-4">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Secure</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                End-to-end encryption ensures your conversations stay private
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <p>&copy; {new Date().getFullYear()} MeetClone. All rights reserved.</p>
      </footer>
    </div>
  )
}
