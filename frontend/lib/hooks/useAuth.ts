import { useCallback, useState } from 'react'
import { apiClient } from '@/lib/services/api'
import { useAuthStore, loginUser } from '@/lib/context/auth'
import { LoginRequest, RegisterRequest } from '@/lib/types'

export function useAuth() {
  const store = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const register = useCallback(
    async (data: RegisterRequest) => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await apiClient.register(data)
        loginUser(response)
        return response
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        setError(message)
        store.setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [store]
  )

  const login = useCallback(
    async (data: LoginRequest) => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await apiClient.login(data)
        loginUser(response)
        return response
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        store.setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [store]
  )

  const logout = useCallback(() => {
    store.logout()
    setError(null)
  }, [store])

  return {
    user: store.user,
    token: store.token,
    isLoading,
    isAuthenticated: !!store.token,
    error,
    register,
    login,
    logout,
  }
}
