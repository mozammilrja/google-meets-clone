'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Isolated store for reactions and hand raise
 */

export interface FloatingReaction {
  id: string
  emoji: string
  participantId: string
  participantName: string
  x: number
  timestamp: number
}

interface ReactionsState {
  // Floating reactions currently displayed
  floatingReactions: FloatingReaction[]
  
  // Hand raise state
  isHandRaised: boolean
  participantHandsRaised: Map<string, boolean>
  
  // Actions
  addReaction: (reaction: Omit<FloatingReaction, 'id' | 'timestamp'>) => void
  removeReaction: (id: string) => void
  clearOldReactions: () => void
  
  setHandRaised: (raised: boolean) => void
  toggleHandRaised: () => void
  setParticipantHandRaised: (participantId: string, raised: boolean) => void
  clearParticipantHand: (participantId: string) => void
  
  reset: () => void
}

const initialState = {
  floatingReactions: [] as FloatingReaction[],
  isHandRaised: false,
  participantHandsRaised: new Map<string, boolean>(),
}

export const useReactionsStore = create<ReactionsState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    addReaction: (reaction) => set((state) => {
      const newReaction: FloatingReaction = {
        ...reaction,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }
      return { 
        floatingReactions: [...state.floatingReactions, newReaction].slice(-20) // Keep max 20 reactions
      }
    }),
    
    removeReaction: (id) => set((state) => ({
      floatingReactions: state.floatingReactions.filter(r => r.id !== id)
    })),
    
    clearOldReactions: () => set((state) => {
      const now = Date.now()
      return {
        floatingReactions: state.floatingReactions.filter(r => now - r.timestamp < 3000)
      }
    }),
    
    setHandRaised: (raised) => set({ isHandRaised: raised }),
    toggleHandRaised: () => set((state) => ({ isHandRaised: !state.isHandRaised })),
    
    setParticipantHandRaised: (participantId, raised) => set((state) => {
      const newMap = new Map(state.participantHandsRaised)
      if (raised) {
        newMap.set(participantId, true)
      } else {
        newMap.delete(participantId)
      }
      return { participantHandsRaised: newMap }
    }),
    
    clearParticipantHand: (participantId) => set((state) => {
      const newMap = new Map(state.participantHandsRaised)
      newMap.delete(participantId)
      return { participantHandsRaised: newMap }
    }),
    
    reset: () => set({
      floatingReactions: [],
      isHandRaised: false,
      participantHandsRaised: new Map(),
    }),
  }))
)

// Selectors
export const selectFloatingReactions = (state: ReactionsState) => state.floatingReactions
export const selectIsHandRaised = (state: ReactionsState) => state.isHandRaised
export const selectParticipantHandsRaised = (state: ReactionsState) => state.participantHandsRaised
