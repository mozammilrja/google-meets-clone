'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Store for captions/speech recognition
 */
interface CaptionsState {
  isEnabled: boolean
  currentText: string
  language: string
  
  setEnabled: (enabled: boolean) => void
  toggleEnabled: () => void
  setCurrentText: (text: string) => void
  setLanguage: (lang: string) => void
  reset: () => void
}

export const useCaptionsStore = create<CaptionsState>()(
  subscribeWithSelector((set) => ({
    isEnabled: false,
    currentText: '',
    language: 'en-US',
    
    setEnabled: (enabled) => set({ isEnabled: enabled }),
    toggleEnabled: () => set((state) => ({ isEnabled: !state.isEnabled })),
    setCurrentText: (text) => set({ currentText: text }),
    setLanguage: (lang) => set({ language: lang }),
    reset: () => set({ isEnabled: false, currentText: '', language: 'en-US' }),
  }))
)
