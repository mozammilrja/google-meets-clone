'use client'

import React, { memo, useEffect, useState } from 'react'
import { Loader2, Video, Wifi, Server, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LoadingStep {
  id: string
  label: string
  icon: React.ReactNode
  status: 'pending' | 'loading' | 'complete' | 'error'
}

interface MeetingLoaderProps {
  currentStep?: string
  error?: string | null
  onRetry?: () => void
}

/**
 * Enhanced loading state for meeting page with step indicators
 */
export const MeetingLoader = memo(function MeetingLoader({
  currentStep = 'connecting',
  error = null,
  onRetry,
}: MeetingLoaderProps) {
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: 'connecting', label: 'Connecting to server', icon: <Wifi className="h-4 w-4" />, status: 'pending' },
    { id: 'media', label: 'Setting up camera & mic', icon: <Video className="h-4 w-4" />, status: 'pending' },
    { id: 'joining', label: 'Joining meeting room', icon: <Server className="h-4 w-4" />, status: 'pending' },
    { id: 'ready', label: 'Preparing video stream', icon: <CheckCircle2 className="h-4 w-4" />, status: 'pending' },
  ])
  
  useEffect(() => {
    const stepOrder = ['connecting', 'media', 'joining', 'ready']
    const currentIndex = stepOrder.indexOf(currentStep)
    
    setSteps(prev => prev.map((step) => {
      const stepIndex = stepOrder.indexOf(step.id)
      if (error && step.id === currentStep) {
        return { ...step, status: 'error' }
      }
      if (stepIndex < currentIndex) {
        return { ...step, status: 'complete' }
      }
      if (stepIndex === currentIndex) {
        return { ...step, status: 'loading' }
      }
      return { ...step, status: 'pending' }
    }))
  }, [currentStep, error])

  return (
    <div className="h-screen flex items-center justify-center bg-[#202124]">
      <div className="w-full max-w-md mx-4">
        {/* Main loader */}
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className="w-20 h-20 rounded-full bg-[#3c4043] flex items-center justify-center">
              {error ? (
                <span className="text-3xl">⚠️</span>
              ) : (
                <Loader2 className="h-10 w-10 text-[#8ab4f8] animate-spin" />
              )}
            </div>
            {/* Pulse effect */}
            {!error && (
              <div className="absolute inset-0 rounded-full bg-[#8ab4f8]/20 animate-ping" />
            )}
          </div>
          
          <h2 className="text-xl font-medium text-white mt-6">
            {error ? 'Connection Failed' : 'Setting up your meeting'}
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            {error ? error : 'This will only take a moment'}
          </p>
        </div>
        
        {/* Steps */}
        <div className="bg-[#292a2d] rounded-xl p-4 space-y-3">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                step.status === 'loading' && "bg-[#3c4043]",
                step.status === 'error' && "bg-red-900/30"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                step.status === 'pending' && "bg-[#3c4043] text-gray-500",
                step.status === 'loading' && "bg-[#8ab4f8] text-[#202124]",
                step.status === 'complete' && "bg-green-600 text-white",
                step.status === 'error' && "bg-red-600 text-white"
              )}>
                {step.status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-sm transition-colors",
                step.status === 'pending' && "text-gray-500",
                step.status === 'loading' && "text-white font-medium",
                step.status === 'complete' && "text-green-400",
                step.status === 'error' && "text-red-400"
              )}>
                {step.label}
              </span>
              
              {/* Status indicator */}
              {step.status === 'loading' && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div 
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Retry button */}
        {error && onRetry && (
          <div className="mt-6 text-center">
            <button
              onClick={onRetry}
              className="px-6 py-2.5 bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] 
                         rounded-full font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/meeting/lobby'}
              className="ml-3 px-6 py-2.5 bg-[#3c4043] hover:bg-[#5f6368] text-white 
                         rounded-full font-medium transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        )}
        
        {/* Tips */}
        {!error && (
          <p className="text-center text-gray-500 text-xs mt-6">
            💡 Tip: Make sure your camera and microphone are not blocked
          </p>
        )}
      </div>
    </div>
  )
})

MeetingLoader.displayName = 'MeetingLoader'
