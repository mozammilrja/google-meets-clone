'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import { User, AuthResponse } from '@/lib/types'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User) => void
  setToken: (token: string) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user: User) => set({ user }),
      setToken: (token: string) => {
        Cookies.set('token', token, { 
          secure: true, 
          sameSite: 'Strict',
          expires: 1 // 24 hours
        })
        set({ token })
      },
      setError: (error: string | null) => set({ error }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      logout: () => {
        Cookies.remove('token')
        set({ user: null, token: null, error: null })
      },
      clear: () => {
        set({ user: null, token: null, error: null, isLoading: false })
      },
    }),
    {
      name: 'auth', // localStorage key
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

export const loginUser = (response: AuthResponse) => {
  const { token, id, email, name, roles } = response
  useAuthStore.setState({
    token,
    user: { id, email, name, roles },
    error: null,
  })
}

export const getAuthHeader = (token: string | null) => {
  if (!token) return {}
  return {
    Authorization: `Bearer ${token}`,
  }
}
