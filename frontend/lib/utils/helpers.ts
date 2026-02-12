// Token utilities
export const getTokenFromCookie = (name: string = 'token'): string | null => {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split('; ')
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=')
    if (key === name) return decodeURIComponent(value)
  }
  return null
}

export const setTokenCookie = (token: string, maxAge: number = 86400): void => {
  if (typeof document === 'undefined') return
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; secure; samesite=strict`
}

export const removeTokenCookie = (name: string = 'token'): void => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}

// URL utilities
export const buildUrl = (baseUrl: string, path: string, query?: Record<string, any>): string => {
  const url = new URL(path, baseUrl)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }
  return url.toString()
}

// Meeting utilities
export const generateMeetingCode = (): string => {
  const parts = []
  for (let i = 0; i < 3; i++) {
    parts.push(Math.random().toString(36).substr(2, 3).toUpperCase())
  }
  return parts.join('-')
}

export const parseMeetingCode = (code: string): string[] => {
  return code.split('-').filter((part) => part.length > 0)
}

// Media utilities
export const getMediaDevices = async (): Promise<{
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
}> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return {
      audioDevices: devices.filter((d) => d.kind === 'audioinput'),
      videoDevices: devices.filter((d) => d.kind === 'videoinput'),
    }
  } catch (error) {
    console.error('Failed to enumerate devices:', error)
    return { audioDevices: [], videoDevices: [] }
  }
}

// Error handling
export const formatError = (error: any): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  return 'An error occurred'
}

// Local storage utilities
export const setStorageItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to set storage item ${key}:`, error)
  }
}

export const getStorageItem = (key: string, defaultValue?: any): any => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Failed to get storage item ${key}:`, error)
    return defaultValue
  }
}

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove storage item ${key}:`, error)
  }
}
