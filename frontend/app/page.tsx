'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-6xl font-bold mb-4 text-white">
          Exit<span className="text-blue-500">Meet</span>
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Crystal-clear video conferencing platform built for teams
        </p>

        <div className="flex gap-4 justify-center mb-12">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
          >
            Sign Up
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-bold mb-2 text-blue-400">HD Video</h3>
            <p className="text-slate-300 text-sm">
              Crystal-clear HD video and audio for seamless communication
            </p>
          </div>
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-bold mb-2 text-blue-400">Screen Share</h3>
            <p className="text-slate-300 text-sm">
              Share your screen in real-time to collaborate effectively
            </p>
          </div>
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-bold mb-2 text-blue-400">Secure</h3>
            <p className="text-slate-300 text-sm">
              End-to-end encryption ensures your conversations stay private
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
