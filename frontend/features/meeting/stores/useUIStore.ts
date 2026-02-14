'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface FloatingReaction {
  id: string
  emoji: string
  participantName: string
  x: number
}

interface UIStore {
  // Panel visibility
  isChatOpen: boolean
  isParticipantsOpen: boolean
  isMoreOptionsOpen: boolean
  isDeviceSettingsOpen: boolean
  isInfoPanelOpen: boolean
  isActivitiesOpen: boolean
  isHostControlsOpen: boolean
  
  // Modals
  showMeetingReadyModal: boolean
  
  // Reactions
  showReactionPicker: boolean
  floatingReactions: FloatingReaction[]
  
  // Actions - Panels
  toggleChat: () => void
  toggleParticipants: () => void
  toggleMoreOptions: () => void
  toggleDeviceSettings: () => void
  toggleInfoPanel: () => void
  toggleActivities: () => void
  toggleHostControls: () => void
  closeAllPanels: () => void
  closeRightPanels: () => void
  
  // Actions - Modals
  setShowMeetingReadyModal: (show: boolean) => void
  
  // Actions - Reactions
  setShowReactionPicker: (show: boolean) => void
  addFloatingReaction: (reaction: Omit<FloatingReaction, 'id'>) => void
  removeFloatingReaction: (id: string) => void
  clearOldReactions: () => void
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    isChatOpen: false,
    isParticipantsOpen: false,
    isMoreOptionsOpen: false,
    isDeviceSettingsOpen: false,
    isInfoPanelOpen: false,
    isActivitiesOpen: false,
    isHostControlsOpen: false,
    showMeetingReadyModal: true,
    showReactionPicker: false,
    floatingReactions: [],

    // Panel toggles (only one right panel at a time)
    toggleChat: () => set((state) => ({ 
      isChatOpen: !state.isChatOpen,
      isParticipantsOpen: false,
      isInfoPanelOpen: false,
      isActivitiesOpen: false,
      isHostControlsOpen: false,
    })),

    toggleParticipants: () => set((state) => ({ 
      isParticipantsOpen: !state.isParticipantsOpen,
      isChatOpen: false,
      isInfoPanelOpen: false,
      isActivitiesOpen: false,
      isHostControlsOpen: false,
    })),

    toggleInfoPanel: () => set((state) => ({
      isInfoPanelOpen: !state.isInfoPanelOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isActivitiesOpen: false,
      isHostControlsOpen: false,
    })),

    toggleActivities: () => set((state) => ({
      isActivitiesOpen: !state.isActivitiesOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isInfoPanelOpen: false,
      isHostControlsOpen: false,
    })),

    toggleHostControls: () => set((state) => ({
      isHostControlsOpen: !state.isHostControlsOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isInfoPanelOpen: false,
      isActivitiesOpen: false,
    })),

    toggleMoreOptions: () => set((state) => ({ 
      isMoreOptionsOpen: !state.isMoreOptionsOpen,
      showReactionPicker: false,
    })),

    toggleDeviceSettings: () => set((state) => ({ 
      isDeviceSettingsOpen: !state.isDeviceSettingsOpen 
    })),

    closeAllPanels: () => set({
      isChatOpen: false,
      isParticipantsOpen: false,
      isMoreOptionsOpen: false,
      isDeviceSettingsOpen: false,
      isInfoPanelOpen: false,
      isActivitiesOpen: false,
      isHostControlsOpen: false,
      showReactionPicker: false,
    }),

    closeRightPanels: () => set({
      isChatOpen: false,
      isParticipantsOpen: false,
      isInfoPanelOpen: false,
      isActivitiesOpen: false,
      isHostControlsOpen: false,
    }),

    // Modals
    setShowMeetingReadyModal: (show) => set({ showMeetingReadyModal: show }),

    // Reactions
    setShowReactionPicker: (show) => set((state) => ({ 
      showReactionPicker: show,
      isMoreOptionsOpen: show ? false : state.isMoreOptionsOpen,
    })),

    addFloatingReaction: (reaction) => set((state) => ({
      floatingReactions: [...state.floatingReactions, { 
        ...reaction, 
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}` 
      }],
    })),

    removeFloatingReaction: (id) => set((state) => ({
      floatingReactions: state.floatingReactions.filter((r) => r.id !== id),
    })),

    clearOldReactions: () => set((state) => ({
      floatingReactions: state.floatingReactions.slice(-10), // Keep max 10
    })),
  }))
)

// Selectors for optimized subscriptions
export const selectIsChatOpen = (state: UIStore) => state.isChatOpen
export const selectIsParticipantsOpen = (state: UIStore) => state.isParticipantsOpen
export const selectIsMoreOptionsOpen = (state: UIStore) => state.isMoreOptionsOpen
export const selectShowMeetingReadyModal = (state: UIStore) => state.showMeetingReadyModal
export const selectFloatingReactions = (state: UIStore) => state.floatingReactions
export const selectAnyRightPanelOpen = (state: UIStore) => 
  state.isChatOpen || state.isParticipantsOpen || state.isInfoPanelOpen || 
  state.isActivitiesOpen || state.isHostControlsOpen
