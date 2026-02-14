'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Participant } from '@/lib/types'

/**
 * Core meeting state store
 * Manages meeting info, participants, and connection status
 */
interface MeetingState {
  // Meeting info
  meetingId: string | null
  meetingCode: string | null
  meetingTitle: string
  
  // Connection status
  isLoading: boolean
  isConnected: boolean
  error: string | null
  
  // Participants
  participants: Participant[]
  localParticipant: {
    id: string
    name: string
    email?: string
  } | null
  
  // Time
  startTime: number | null
  
  // Actions
  setMeeting: (meetingId: string, meetingCode: string) => void
  setMeetingTitle: (title: string) => void
  setLoading: (loading: boolean) => void
  setConnected: (connected: boolean) => void
  setError: (error: string | null) => void
  
  setLocalParticipant: (participant: MeetingState['localParticipant']) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (id: string) => void
  updateParticipant: (id: string, updates: Partial<Participant>) => void
  
  setStartTime: (time: number) => void
  
  reset: () => void
}

const initialState = {
  meetingId: null,
  meetingCode: null,
  meetingTitle: 'Meeting',
  isLoading: true,
  isConnected: false,
  error: null,
  participants: [],
  localParticipant: null,
  startTime: null,
}

export const useMeetingSessionStore = create<MeetingState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setMeeting: (meetingId, meetingCode) => 
      set({ meetingId, meetingCode, error: null }),
    
    setMeetingTitle: (title) => set({ meetingTitle: title }),
    setLoading: (loading) => set({ isLoading: loading }),
    setConnected: (connected) => set({ isConnected: connected }),
    setError: (error) => set({ error }),
    
    setLocalParticipant: (participant) => set({ localParticipant: participant }),
    
    setParticipants: (participants) => set({ participants }),
    
    addParticipant: (participant) => set((state) => {
      const exists = state.participants.some(p => p.id === participant.id)
      if (exists) {
        return {
          participants: state.participants.map(p => 
            p.id === participant.id ? { ...p, ...participant } : p
          )
        }
      }
      return { participants: [...state.participants, participant] }
    }),
    
    removeParticipant: (id) => set((state) => ({
      participants: state.participants.filter(p => p.id !== id)
    })),
    
    updateParticipant: (id, updates) => set((state) => ({
      participants: state.participants.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    })),
    
    setStartTime: (time) => set({ startTime: time }),
    
    reset: () => set(initialState),
  }))
)

// Selectors
export const selectParticipants = (state: MeetingState) => state.participants
export const selectParticipantCount = (state: MeetingState) => state.participants.length + 1 // +1 for local
export const selectMeetingCode = (state: MeetingState) => state.meetingCode
export const selectIsLoading = (state: MeetingState) => state.isLoading
export const selectError = (state: MeetingState) => state.error
