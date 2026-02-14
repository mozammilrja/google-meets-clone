'use client'

import React, { memo, useState, useCallback, useEffect, useRef } from 'react'
import { X, Timer, Play, Pause, RotateCcw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMeetingToolsStore, selectTimer } from '../stores'
import { usePermissionsStore, selectIsHostOrCoHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'

interface TimerPanelProps {
  meetingId: string
  onClose: () => void
}

/**
 * Timer Panel - Meeting timer with countdown/stopwatch
 */
export const TimerPanel = memo(function TimerPanel({
  meetingId,
  onClose,
}: TimerPanelProps) {
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  const timer = useMeetingToolsStore(selectTimer)
  const startTimer = useMeetingToolsStore(state => state.startTimer)
  const pauseTimer = useMeetingToolsStore(state => state.pauseTimer)
  const stopTimer = useMeetingToolsStore(state => state.stopTimer)
  const updateTimerRemaining = useMeetingToolsStore(state => state.updateTimerRemaining)
  
  const [timerType, setTimerType] = useState<'countdown' | 'stopwatch'>('countdown')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Update timer every second when running
  useEffect(() => {
    if (timer?.isRunning) {
      intervalRef.current = setInterval(() => {
        if (timer.type === 'countdown') {
          const newRemaining = (timer.remainingTime ?? 0) - 1
          if (newRemaining <= 0) {
            updateTimerRemaining(0)
            signalingService.emit('timer-complete', { meetingId })
          } else {
            updateTimerRemaining(newRemaining)
          }
        } else {
          // Stopwatch - count up
          updateTimerRemaining((timer.remainingTime ?? 0) + 1)
        }
      }, 1000)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timer?.isRunning, timer?.type, timer?.remainingTime, updateTimerRemaining, meetingId])
  
  const handleStart = useCallback(() => {
    const totalSeconds = timerType === 'countdown'
      ? hours * 3600 + minutes * 60 + seconds
      : 0
    
    startTimer(meetingId, totalSeconds, timerType)
    
    signalingService.emit('timer-started', {
      meetingId,
      duration: totalSeconds,
      type: timerType,
    })
  }, [timerType, hours, minutes, seconds, meetingId, startTimer])
  
  const handlePause = useCallback(() => {
    pauseTimer()
    signalingService.emit('timer-paused', { meetingId })
  }, [meetingId, pauseTimer])
  
  const handleResume = useCallback(() => {
    if (!timer) return
    startTimer(meetingId, timer.remainingTime, timer.type)
    signalingService.emit('timer-resumed', { meetingId })
  }, [meetingId, timer, startTimer])
  
  const handleReset = useCallback(() => {
    stopTimer()
    signalingService.emit('timer-reset', { meetingId })
  }, [meetingId, stopTimer])
  
  const formatTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  
  const isTimerSet = (timer?.duration ?? 0) > 0 || timer?.isRunning
  const isLowTime = timer?.type === 'countdown' && (timer?.remainingTime ?? 0) <= 60 && (timer?.remainingTime ?? 0) > 0
  
  return (
    <aside 
      className={cn(
        "fixed right-4 top-4 bottom-24 w-[350px] z-40",
        "bg-[#202124] rounded-xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-right-5 fade-in duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-[#8ab4f8]" />
          <h2 className="text-lg font-medium text-white">Timer</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6">
        {/* Timer Display */}
        {isTimerSet && timer ? (
          <div className="text-center mb-8">
            <div className={cn(
              "text-6xl font-light tabular-nums",
              isLowTime ? "text-red-400 animate-pulse" : "text-white"
            )}>
              {formatTime(timer.remainingTime)}
            </div>
            <p className="text-sm text-gray-400 mt-2 capitalize">
              {timer.type}
              {timer.type === 'countdown' && timer.remainingTime === 0 && ' - Complete!'}
            </p>
          </div>
        ) : (
          /* Timer Setup (Host only) */
          isHostOrCoHost ? (
            <>
              {/* Timer Type Toggle */}
              <div className="flex items-center gap-2 p-1 bg-[#292a2d] rounded-full mb-6">
                <button
                  onClick={() => setTimerType('countdown')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-colors",
                    timerType === 'countdown'
                      ? "bg-[#8ab4f8] text-[#202124]"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Timer className="h-4 w-4" />
                  Countdown
                </button>
                <button
                  onClick={() => setTimerType('stopwatch')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-colors",
                    timerType === 'stopwatch'
                      ? "bg-[#8ab4f8] text-[#202124]"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Clock className="h-4 w-4" />
                  Stopwatch
                </button>
              </div>
              
              {/* Time Input (Countdown only) */}
              {timerType === 'countdown' && (
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-3">Set duration</p>
                  <div className="flex items-center justify-center gap-2">
                    <TimeInput
                      value={hours}
                      onChange={setHours}
                      max={23}
                      label="hours"
                    />
                    <span className="text-2xl text-gray-500">:</span>
                    <TimeInput
                      value={minutes}
                      onChange={setMinutes}
                      max={59}
                      label="minutes"
                    />
                    <span className="text-2xl text-gray-500">:</span>
                    <TimeInput
                      value={seconds}
                      onChange={setSeconds}
                      max={59}
                      label="seconds"
                    />
                  </div>
                </div>
              )}
              
              {/* Quick Presets (Countdown only) */}
              {timerType === 'countdown' && (
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-2">Quick presets</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '1 min', h: 0, m: 1, s: 0 },
                      { label: '5 min', h: 0, m: 5, s: 0 },
                      { label: '10 min', h: 0, m: 10, s: 0 },
                      { label: '15 min', h: 0, m: 15, s: 0 },
                      { label: '30 min', h: 0, m: 30, s: 0 },
                      { label: '1 hour', h: 1, m: 0, s: 0 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setHours(preset.h)
                          setMinutes(preset.m)
                          setSeconds(preset.s)
                        }}
                        className="px-3 py-1.5 bg-[#3c4043] hover:bg-[#5f6368] 
                                   text-sm text-white rounded-full transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Timer className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No timer running</p>
              <p className="text-sm text-gray-500 mt-1">
                The host can start a timer
              </p>
            </div>
          )
        )}
        
        {/* Controls */}
        {isHostOrCoHost && (
          <div className="flex items-center justify-center gap-3 mt-auto">
            {!isTimerSet ? (
              <button
                onClick={handleStart}
                disabled={timerType === 'countdown' && hours === 0 && minutes === 0 && seconds === 0}
                className="flex items-center gap-2 px-6 py-3 bg-[#8ab4f8] hover:bg-[#aecbfa] 
                           text-[#202124] rounded-full font-medium transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-5 w-5" />
                Start Timer
              </button>
            ) : timer ? (
              <>
                {timer.isRunning ? (
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 
                               hover:bg-yellow-500 text-white rounded-full font-medium transition-colors"
                  >
                    <Pause className="h-5 w-5" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    disabled={timer.type === 'countdown' && timer.remainingTime === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 
                               hover:bg-green-500 text-white rounded-full font-medium transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-5 w-5" />
                    Resume
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#3c4043] 
                             hover:bg-[#5f6368] text-white rounded-full font-medium transition-colors"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  )
})

// Time Input Component
interface TimeInputProps {
  value: number
  onChange: (value: number) => void
  max: number
  label: string
}

const TimeInput = memo(function TimeInput({
  value,
  onChange,
  max,
  label,
}: TimeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10)
    if (isNaN(num)) {
      onChange(0)
    } else {
      onChange(Math.min(Math.max(0, num), max))
    }
  }
  
  return (
    <div className="flex flex-col items-center">
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={0}
        max={max}
        className="w-16 h-14 text-center text-2xl font-light bg-[#3c4043] 
                   text-white rounded-lg focus:outline-none focus:ring-2 
                   focus:ring-[#8ab4f8] [appearance:textfield] 
                   [&::-webkit-outer-spin-button]:appearance-none 
                   [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  )
})

TimerPanel.displayName = 'TimerPanel'
