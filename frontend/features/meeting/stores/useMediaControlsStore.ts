'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Isolated store for media controls (mic, camera, screen share)
 * Prevents unnecessary re-renders when only media state changes
 */
interface MediaControlsState {
  // Audio state
  isAudioEnabled: boolean
  audioDeviceId: string | null
  audioDevices: MediaDeviceInfo[]
  
  // Video state
  isVideoEnabled: boolean
  hasVideoTrack: boolean
  videoDeviceId: string | null
  videoDevices: MediaDeviceInfo[]
  
  // Screen share state
  isScreenSharing: boolean
  
  // Actions
  setAudioEnabled: (enabled: boolean) => void
  setVideoEnabled: (enabled: boolean) => void
  setHasVideoTrack: (hasTrack: boolean) => void
  setScreenSharing: (sharing: boolean) => void
  setAudioDeviceId: (deviceId: string | null) => void
  setVideoDeviceId: (deviceId: string | null) => void
  setAudioDevices: (devices: MediaDeviceInfo[]) => void
  setVideoDevices: (devices: MediaDeviceInfo[]) => void
  toggleAudio: () => void
  toggleVideo: () => void
  toggleScreenShare: () => void
  reset: () => void
}

const initialState = {
  isAudioEnabled: true,
  audioDeviceId: null,
  audioDevices: [],
  isVideoEnabled: true,
  hasVideoTrack: false,
  videoDeviceId: null,
  videoDevices: [],
  isScreenSharing: false,
}

export const useMediaControlsStore = create<MediaControlsState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setAudioEnabled: (enabled) => set({ isAudioEnabled: enabled }),
    setVideoEnabled: (enabled) => set({ isVideoEnabled: enabled }),
    setHasVideoTrack: (hasTrack) => set({ hasVideoTrack: hasTrack }),
    setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
    setAudioDeviceId: (deviceId) => set({ audioDeviceId: deviceId }),
    setVideoDeviceId: (deviceId) => set({ videoDeviceId: deviceId }),
    setAudioDevices: (devices) => set({ audioDevices: devices }),
    setVideoDevices: (devices) => set({ videoDevices: devices }),
    
    toggleAudio: () => set((state) => ({ isAudioEnabled: !state.isAudioEnabled })),
    toggleVideo: () => set((state) => ({ isVideoEnabled: !state.isVideoEnabled })),
    toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
    
    reset: () => set(initialState),
  }))
)

// Selectors for optimized subscriptions
export const selectIsAudioEnabled = (state: MediaControlsState) => state.isAudioEnabled
export const selectIsVideoEnabled = (state: MediaControlsState) => state.isVideoEnabled
export const selectIsScreenSharing = (state: MediaControlsState) => state.isScreenSharing
export const selectHasVideoTrack = (state: MediaControlsState) => state.hasVideoTrack
