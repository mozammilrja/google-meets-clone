'use client'

import React, { memo, useEffect, useRef } from 'react'
import { useCaptionsStore } from '../stores'
import { cn } from '@/lib/utils/cn'

/**
 * Live captions overlay using Web Speech API
 */
export const CaptionsOverlay = memo(function CaptionsOverlay() {
  const isEnabled = useCaptionsStore(state => state.isEnabled)
  const currentText = useCaptionsStore(state => state.currentText)
  const language = useCaptionsStore(state => state.language)
  const setCurrentText = useCaptionsStore(state => state.setCurrentText)
  const setEnabled = useCaptionsStore(state => state.setEnabled)
  
  const recognitionRef = useRef<any>(null)
  
  // Initialize speech recognition
  useEffect(() => {
    if (!isEnabled) {
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      return
    }
    
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported')
      setEnabled(false)
      return
    }
    
    // Initialize recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      
      setCurrentText(finalTranscript || interimTranscript)
      
      // Clear caption after 5 seconds of no speech
      if (finalTranscript) {
        setTimeout(() => {
          setCurrentText('')
        }, 5000)
      }
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setEnabled(false)
      }
    }
    
    recognition.onend = () => {
      // Restart if still enabled
      if (isEnabled && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          // Ignore restart errors
        }
      }
    }
    
    recognitionRef.current = recognition
    recognition.start()
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [isEnabled, language, setCurrentText, setEnabled])
  
  if (!isEnabled || !currentText) return null
  
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 max-w-[80%] z-30">
      <div 
        className={cn(
          "bg-black/80 text-white px-6 py-3 rounded-lg text-lg text-center",
          "backdrop-blur-sm shadow-xl",
          "animate-in fade-in duration-150"
        )}
      >
        {currentText}
      </div>
    </div>
  )
})

CaptionsOverlay.displayName = 'CaptionsOverlay'
