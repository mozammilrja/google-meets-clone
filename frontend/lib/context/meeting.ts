'use client'

import { create } from 'zustand'
import { Participant } from '@/lib/types'

interface MeetingStore {
  meetingId: string | null
  meetingCode: string | null
  participants: Participant[]
  localParticipant: {
    id: string
    name: string
    audio: boolean
    video: boolean
    screenSharing: boolean
  } | null
  isLoading: boolean
  error: string | null

  // Actions
  setMeeting: (meetingId: string, meetingCode: string) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (id: string) => void
  updateParticipant: (id: string, updates: Partial<Participant>) => void
  setLocalParticipant: (participant: MeetingStore['localParticipant']) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetingId: null,
  meetingCode: null,
  participants: [],
  localParticipant: null,
  isLoading: false,
  error: null,

  setMeeting: (meetingId: string, meetingCode: string) =>
    set({ meetingId, meetingCode, error: null }),

  setParticipants: (participants: Participant[]) =>
    set({ participants }),

  addParticipant: (participant: Participant) =>
    set((state) => {
      // Check if participant already exists
      const exists = state.participants.some((p) => p.id === participant.id)
      if (exists) {
        // Update existing participant instead of adding duplicate
        return {
          participants: state.participants.map((p) =>
            p.id === participant.id ? { ...p, ...participant } : p
          ),
        }
      }
      return {
        participants: [...state.participants, participant],
      }
    }),

  removeParticipant: (id: string) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),

  updateParticipant: (id: string, updates: Partial<Participant>) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setLocalParticipant: (participant: MeetingStore['localParticipant']) =>
    set({ localParticipant: participant }),

  setError: (error: string | null) => set({ error }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  reset: () =>
    set({
      meetingId: null,
      meetingCode: null,
      participants: [],
      localParticipant: null,
      isLoading: false,
      error: null,
    }),
}))
