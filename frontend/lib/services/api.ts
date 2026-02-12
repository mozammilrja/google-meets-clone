import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '@/lib/context/auth'
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  Meeting,
  APIError,
} from '@/lib/types'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000,
    })

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, logout
          useAuthStore.getState().logout()
        }
        throw this.parseError(error)
      }
    )
  }

  private parseError(error: AxiosError): APIError {
    const message =
      (error.response?.data as any)?.message || error.message || 'Unknown error'
    return {
      status: error.response?.status || 500,
      message,
      code: (error.response?.data as any)?.code,
    }
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data)
    return response.data
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data)
    return response.data
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get<User>('/users/me')
    return response.data
  }

  // Meeting endpoints
  async createMeeting(title: string, duration: number): Promise<Meeting> {
    const response = await this.client.post<Meeting>('/meetings', {
      title,
      duration,
      scheduledAt: new Date().toISOString(),
    })
    return response.data
  }

  async getMeeting(id: string): Promise<Meeting> {
    const response = await this.client.get<Meeting>(`/meetings/${id}`)
    return response.data
  }

  async getMeetingByCode(code: string): Promise<{ id: string; code: string; title: string; hostId: string; status: string }> {
    const response = await this.client.get(`/meetings/code/${code}`)
    return response.data
  }

  async joinMeeting(meetingId: string, name: string): Promise<any> {
    const response = await this.client.post(
      `/meetings/${meetingId}/join`,
      { name }
    )
    return response.data
  }

  async leaveMeeting(meetingId: string, participantId: string): Promise<void> {
    await this.client.post(
      `/meetings/${meetingId}/leave/${participantId}`
    )
  }
}

export const apiClient = new APIClient()
