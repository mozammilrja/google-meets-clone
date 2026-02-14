'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Panel types for the control cluster
 */
export type ActivePanelType = 'details' | 'chat' | 'tools' | 'host' | 'participants' | null

/**
 * Isolated store for UI panels and drawers
 * Manages visibility of chat, participants panel, invite card, etc.
 * Only one right-side panel can be open at a time
 */
interface UIPanelsState {
  // Right-side panel visibility (mutually exclusive)
  isChatVisible: boolean
  isParticipantsPanelVisible: boolean
  isInfoPanelVisible: boolean
  isActivitiesPanelVisible: boolean
  isHostControlsVisible: boolean
  
  // Dropdown/overlay visibility
  isInviteCardVisible: boolean
  isMoreOptionsVisible: boolean
  isDeviceSettingsVisible: boolean
  isReactionPickerVisible: boolean
  
  // Modal states
  showMeetingReadyModal: boolean
  
  // Actions - Set visibility
  setChatVisible: (visible: boolean) => void
  setParticipantsPanelVisible: (visible: boolean) => void
  setInfoPanelVisible: (visible: boolean) => void
  setActivitiesPanelVisible: (visible: boolean) => void
  setHostControlsVisible: (visible: boolean) => void
  setInviteCardVisible: (visible: boolean) => void
  setMoreOptionsVisible: (visible: boolean) => void
  setDeviceSettingsVisible: (visible: boolean) => void
  setReactionPickerVisible: (visible: boolean) => void
  setMeetingReadyModalVisible: (visible: boolean) => void
  
  // New unified panel API
  setActivePanel: (panel: ActivePanelType) => void
  
  // Toggle actions (close other right panels when opening one)
  toggleChat: () => void
  toggleParticipantsPanel: () => void
  toggleInfoPanel: () => void
  toggleActivitiesPanel: () => void
  toggleHostControls: () => void
  toggleInviteCard: () => void
  toggleMoreOptions: () => void
  toggleDeviceSettings: () => void
  toggleReactionPicker: () => void
  
  closeAllRightPanels: () => void
  closeAllPanels: () => void
  reset: () => void
}

const initialState = {
  isChatVisible: false,
  isParticipantsPanelVisible: false,
  isInfoPanelVisible: false,
  isActivitiesPanelVisible: false,
  isHostControlsVisible: false,
  isInviteCardVisible: false,
  isMoreOptionsVisible: false,
  isDeviceSettingsVisible: false,
  isReactionPickerVisible: false,
  showMeetingReadyModal: true,
}

// Helper to close all right-side panels
const closeRightPanels = {
  isChatVisible: false,
  isParticipantsPanelVisible: false,
  isInfoPanelVisible: false,
  isActivitiesPanelVisible: false,
  isHostControlsVisible: false,
}

export const useUIPanelsStore = create<UIPanelsState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    // Direct setters
    setChatVisible: (visible) => set(visible ? { ...closeRightPanels, isChatVisible: true } : { isChatVisible: false }),
    setParticipantsPanelVisible: (visible) => set(visible ? { ...closeRightPanels, isParticipantsPanelVisible: true } : { isParticipantsPanelVisible: false }),
    setInfoPanelVisible: (visible) => set(visible ? { ...closeRightPanels, isInfoPanelVisible: true } : { isInfoPanelVisible: false }),
    setActivitiesPanelVisible: (visible) => set(visible ? { ...closeRightPanels, isActivitiesPanelVisible: true } : { isActivitiesPanelVisible: false }),
    setHostControlsVisible: (visible) => set(visible ? { ...closeRightPanels, isHostControlsVisible: true } : { isHostControlsVisible: false }),
    setInviteCardVisible: (visible) => set({ isInviteCardVisible: visible }),
    setMoreOptionsVisible: (visible) => set({ isMoreOptionsVisible: visible }),
    setDeviceSettingsVisible: (visible) => set({ isDeviceSettingsVisible: visible }),
    setReactionPickerVisible: (visible) => set({ isReactionPickerVisible: visible }),
    setMeetingReadyModalVisible: (visible) => set({ showMeetingReadyModal: visible }),
    
    // Unified panel API - sets exactly one panel open
    setActivePanel: (panel) => {
      switch (panel) {
        case 'details':
          set({ ...closeRightPanels, isInfoPanelVisible: true })
          break
        case 'chat':
          set({ ...closeRightPanels, isChatVisible: true })
          break
        case 'tools':
          set({ ...closeRightPanels, isActivitiesPanelVisible: true })
          break
        case 'host':
          set({ ...closeRightPanels, isHostControlsVisible: true })
          break
        case 'participants':
          set({ ...closeRightPanels, isParticipantsPanelVisible: true })
          break
        case null:
        default:
          set(closeRightPanels)
      }
    },
    
    // Toggle actions
    toggleChat: () => set((state) => 
      state.isChatVisible 
        ? { isChatVisible: false } 
        : { ...closeRightPanels, isChatVisible: true }
    ),
    toggleParticipantsPanel: () => set((state) => 
      state.isParticipantsPanelVisible 
        ? { isParticipantsPanelVisible: false } 
        : { ...closeRightPanels, isParticipantsPanelVisible: true }
    ),
    toggleInfoPanel: () => set((state) => 
      state.isInfoPanelVisible 
        ? { isInfoPanelVisible: false } 
        : { ...closeRightPanels, isInfoPanelVisible: true }
    ),
    toggleActivitiesPanel: () => set((state) => 
      state.isActivitiesPanelVisible 
        ? { isActivitiesPanelVisible: false } 
        : { ...closeRightPanels, isActivitiesPanelVisible: true }
    ),
    toggleHostControls: () => set((state) => 
      state.isHostControlsVisible 
        ? { isHostControlsVisible: false } 
        : { ...closeRightPanels, isHostControlsVisible: true }
    ),
    toggleInviteCard: () => set((state) => ({ isInviteCardVisible: !state.isInviteCardVisible })),
    toggleMoreOptions: () => set((state) => ({ isMoreOptionsVisible: !state.isMoreOptionsVisible })),
    toggleDeviceSettings: () => set((state) => ({ isDeviceSettingsVisible: !state.isDeviceSettingsVisible })),
    toggleReactionPicker: () => set((state) => ({ isReactionPickerVisible: !state.isReactionPickerVisible })),
    
    closeAllRightPanels: () => set(closeRightPanels),
    
    closeAllPanels: () => set({
      ...closeRightPanels,
      isInviteCardVisible: false,
      isMoreOptionsVisible: false,
      isDeviceSettingsVisible: false,
      isReactionPickerVisible: false,
    }),
    
    reset: () => set(initialState),
  }))
)

// Selectors
export const selectIsChatVisible = (state: UIPanelsState) => state.isChatVisible
export const selectIsParticipantsPanelVisible = (state: UIPanelsState) => state.isParticipantsPanelVisible
export const selectIsInfoPanelVisible = (state: UIPanelsState) => state.isInfoPanelVisible
export const selectIsActivitiesPanelVisible = (state: UIPanelsState) => state.isActivitiesPanelVisible
export const selectIsHostControlsVisible = (state: UIPanelsState) => state.isHostControlsVisible
export const selectIsInviteCardVisible = (state: UIPanelsState) => state.isInviteCardVisible
export const selectShowMeetingReadyModal = (state: UIPanelsState) => state.showMeetingReadyModal
export const selectAnyRightPanelOpen = (state: UIPanelsState) => 
  state.isChatVisible || state.isParticipantsPanelVisible || state.isInfoPanelVisible || 
  state.isActivitiesPanelVisible || state.isHostControlsVisible

// Derive active panel from individual booleans
export const selectActivePanel = (state: UIPanelsState): ActivePanelType => {
  if (state.isInfoPanelVisible) return 'details'
  if (state.isChatVisible) return 'chat'
  if (state.isActivitiesPanelVisible) return 'tools'
  if (state.isHostControlsVisible) return 'host'
  if (state.isParticipantsPanelVisible) return 'participants'
  return null
}
