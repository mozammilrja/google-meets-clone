'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, Video } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError('')

    const trimmedEmail = formData.email.trim()
    const trimmedPassword = formData.password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setLocalError('Please fill in all fields')
      return
    }

    try {
      await login({ email: trimmedEmail, password: trimmedPassword })
      // Check for redirect URL from join flow
      const redirectUrl = typeof window !== 'undefined' 
        ? sessionStorage.getItem('redirectAfterLogin') 
        : null
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectUrl)
      } else {
        router.push('/meeting/lobby')
      }
    } catch (err: any) {
      // Extract error message from API error or generic error
      const errorMessage = err?.message || err?.response?.data?.message || 'Invalid email or password'
      setLocalError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
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
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to continue to your meetings</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || localError) && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error || localError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter your email"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>

              <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                  Sign up
                </Link>
              </p>

              <Link href="/" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} MeetClone. All rights reserved.</p>
      </footer>
    </div>
  )
}
