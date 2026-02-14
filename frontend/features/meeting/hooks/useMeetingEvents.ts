'use client'

import { useEffect } from 'react'
import { signalingService } from '@/lib/services/signaling'
import { usePermissionsStore, useChatStore, useMeetingToolsStore } from '../stores'
import type { GlobalMeetingSettings, ParticipantRole, Poll, QAQuestion, BreakoutRoom } from '../stores'

interface UseMeetingEventsOptions {
  meetingId: string
  participantId: string
}

/**
 * Hook to set up all Socket.IO event listeners for meeting features
 * - Permission updates
 * - Chat moderation events
 * - Polls events
 * - Q&A events
 * - Timer events
 * - Recording events
 * - Breakout rooms events
 */
export function useMeetingEvents({ meetingId, participantId }: UseMeetingEventsOptions) {
  // Permissions store actions
  const setCurrentRole = usePermissionsStore(state => state.setCurrentRole)
  const updateGlobalSetting = usePermissionsStore(state => state.updateGlobalSetting)
  const syncPermissions = usePermissionsStore(state => state.syncPermissions)
  
  // Chat store actions
  const setChatEnabled = useChatStore(state => state.setChatEnabled)
  const addSystemMessage = useChatStore(state => state.addSystemMessage)
  
  // Meeting tools store actions
  const addPoll = useMeetingToolsStore(state => state.addPoll)
  const votePoll = useMeetingToolsStore(state => state.votePoll)
  const closePoll = useMeetingToolsStore(state => state.closePoll)
  const deletePoll = useMeetingToolsStore(state => state.deletePoll)
  
  const addQuestion = useMeetingToolsStore(state => state.addQuestion)
  const upvoteQuestion = useMeetingToolsStore(state => state.upvoteQuestion)
  const markAsAnswered = useMeetingToolsStore(state => state.markAsAnswered)
  const hideQuestion = useMeetingToolsStore(state => state.hideQuestion)
  const deleteQuestion = useMeetingToolsStore(state => state.deleteQuestion)
  const setQAEnabled = useMeetingToolsStore(state => state.setQAEnabled)
  
  const startTimer = useMeetingToolsStore(state => state.startTimer)
  const pauseTimer = useMeetingToolsStore(state => state.pauseTimer)
  const stopTimer = useMeetingToolsStore(state => state.stopTimer)
  
  const startRecording = useMeetingToolsStore(state => state.startRecording)
  const stopRecording = useMeetingToolsStore(state => state.stopRecording)
  
  const setBreakoutRooms = useMeetingToolsStore(state => state.setBreakoutRooms)
  const startBreakoutRooms = useMeetingToolsStore(state => state.startBreakoutRooms)
  const endBreakoutRooms = useMeetingToolsStore(state => state.endBreakoutRooms)
  const moveToBreakoutRoom = useMeetingToolsStore(state => state.moveToBreakoutRoom)
  const moveToMainRoom = useMeetingToolsStore(state => state.moveToMainRoom)
  
  useEffect(() => {
    // ========================================
    // Permission Events
    // ========================================
    
    const handlePermissionUpdate = (data: {
      setting: keyof GlobalMeetingSettings
      value: boolean
    }) => {
      updateGlobalSetting(data.setting, data.value)
      
      // Sync chat enabled state
      if (data.setting === 'allowChat') {
        setChatEnabled(data.value)
        if (!data.value) {
          addSystemMessage(meetingId, 'Chat has been disabled by the host')
        } else {
          addSystemMessage(meetingId, 'Chat has been enabled')
        }
      }
    }
    
    const handleRoleUpdate = (data: {
      participantId: string
      role: ParticipantRole
    }) => {
      if (data.participantId === participantId) {
        setCurrentRole(data.role)
        addSystemMessage(meetingId, `Your role has been changed to ${data.role}`)
      }
    }
    
    const handlePermissionsSync = (data: {
      globalSettings: GlobalMeetingSettings
      role: ParticipantRole
    }) => {
      syncPermissions({ globalSettings: data.globalSettings, role: data.role })
      setChatEnabled(data.globalSettings.allowChat)
    }
    
    // ========================================
    // Poll Events
    // ========================================
    
    const handlePollCreated = (data: { poll: Poll }) => {
      addPoll(data.poll)
    }
    
    const handlePollVote = (data: {
      pollId: string
      optionId: string
      participantId: string
    }) => {
      votePoll(data.pollId, data.optionId, data.participantId)
    }
    
    const handlePollClosed = (data: { pollId: string }) => {
      closePoll(data.pollId)
    }
    
    const handlePollDeleted = (data: { pollId: string }) => {
      deletePoll(data.pollId)
    }
    
    // ========================================
    // Q&A Events
    // ========================================
    
    const handleQuestionAsked = (data: { question: QAQuestion }) => {
      addQuestion(data.question)
    }
    
    const handleQuestionUpvoted = (data: {
      questionId: string
      participantId: string
    }) => {
      upvoteQuestion(data.questionId, data.participantId)
    }
    
    const handleQuestionAnswered = (data: { questionId: string }) => {
      markAsAnswered(data.questionId)
    }
    
    const handleQuestionHidden = (data: { questionId: string }) => {
      hideQuestion(data.questionId)
    }
    
    const handleQuestionDeleted = (data: { questionId: string }) => {
      deleteQuestion(data.questionId)
    }
    
    const handleQAEnabledChanged = (data: { enabled: boolean }) => {
      setQAEnabled(data.enabled)
    }
    
    // ========================================
    // Timer Events
    // ========================================
    
    const handleTimerStarted = (data: {
      duration: number
      type: 'countdown' | 'stopwatch'
    }) => {
      startTimer(meetingId, data.duration, data.type)
    }
    
    const handleTimerPaused = () => {
      pauseTimer()
    }
    
    const handleTimerReset = () => {
      stopTimer()
    }
    
    // ========================================
    // Recording Events
    // ========================================
    
    const handleRecordingStarted = () => {
      startRecording(meetingId)
      addSystemMessage(meetingId, 'Recording has started')
    }
    
    const handleRecordingStopped = () => {
      stopRecording()
      addSystemMessage(meetingId, 'Recording has stopped')
    }
    
    // ========================================
    // Breakout Room Events
    // ========================================
    
    const handleBreakoutRoomsCreated = (data: {
      rooms: BreakoutRoom[]
    }) => {
      setBreakoutRooms(data.rooms)
    }
    
    const handleBreakoutRoomsStarted = (data: { timer?: number }) => {
      startBreakoutRooms(data.timer)
      addSystemMessage(meetingId, 'Breakout rooms have opened')
    }
    
    const handleBreakoutRoomsEnded = () => {
      endBreakoutRooms()
      addSystemMessage(meetingId, 'Breakout rooms have closed')
    }
    
    const handleBreakoutRoomMove = (data: {
      roomId: string
      participantId: string
    }) => {
      moveToBreakoutRoom(data.roomId, data.participantId)
    }
    
    const handleBreakoutRoomReturn = (data: { participantId: string }) => {
      moveToMainRoom(data.participantId)
    }
    
    // ========================================
    // Register All Listeners
    // ========================================
    
    // Permission events
    signalingService.on('permission-update', handlePermissionUpdate)
    signalingService.on('role-update', handleRoleUpdate)
    signalingService.on('permissions-sync', handlePermissionsSync)
    
    // Poll events
    signalingService.on('poll-created', handlePollCreated)
    signalingService.on('poll-vote', handlePollVote)
    signalingService.on('poll-closed', handlePollClosed)
    signalingService.on('poll-deleted', handlePollDeleted)
    
    // Q&A events
    signalingService.on('qa-question-asked', handleQuestionAsked)
    signalingService.on('qa-question-upvoted', handleQuestionUpvoted)
    signalingService.on('qa-question-answered', handleQuestionAnswered)
    signalingService.on('qa-question-hidden', handleQuestionHidden)
    signalingService.on('qa-question-deleted', handleQuestionDeleted)
    signalingService.on('qa-enabled-changed', handleQAEnabledChanged)
    
    // Timer events
    signalingService.on('timer-started', handleTimerStarted)
    signalingService.on('timer-paused', handleTimerPaused)
    signalingService.on('timer-resumed', handleTimerStarted)
    signalingService.on('timer-reset', handleTimerReset)
    
    // Recording events
    signalingService.on('recording-started', handleRecordingStarted)
    signalingService.on('recording-stopped', handleRecordingStopped)
    
    // Breakout room events
    signalingService.on('breakout-rooms-created', handleBreakoutRoomsCreated)
    signalingService.on('breakout-rooms-started', handleBreakoutRoomsStarted)
    signalingService.on('breakout-rooms-ended', handleBreakoutRoomsEnded)
    signalingService.on('breakout-room-participant-moved', handleBreakoutRoomMove)
    signalingService.on('breakout-room-participant-returned', handleBreakoutRoomReturn)
    
    // ========================================
    // Cleanup
    // ========================================
    
    return () => {
      // Permission events
      signalingService.off('permission-update', handlePermissionUpdate)
      signalingService.off('role-update', handleRoleUpdate)
      signalingService.off('permissions-sync', handlePermissionsSync)
      
      // Poll events
      signalingService.off('poll-created', handlePollCreated)
      signalingService.off('poll-vote', handlePollVote)
      signalingService.off('poll-closed', handlePollClosed)
      signalingService.off('poll-deleted', handlePollDeleted)
      
      // Q&A events
      signalingService.off('qa-question-asked', handleQuestionAsked)
      signalingService.off('qa-question-upvoted', handleQuestionUpvoted)
      signalingService.off('qa-question-answered', handleQuestionAnswered)
      signalingService.off('qa-question-hidden', handleQuestionHidden)
      signalingService.off('qa-question-deleted', handleQuestionDeleted)
      signalingService.off('qa-enabled-changed', handleQAEnabledChanged)
      
      // Timer events
      signalingService.off('timer-started', handleTimerStarted)
      signalingService.off('timer-paused', handleTimerPaused)
      signalingService.off('timer-resumed', handleTimerStarted)
      signalingService.off('timer-reset', handleTimerReset)
      
      // Recording events
      signalingService.off('recording-started', handleRecordingStarted)
      signalingService.off('recording-stopped', handleRecordingStopped)
      
      // Breakout room events
      signalingService.off('breakout-rooms-created', handleBreakoutRoomsCreated)
      signalingService.off('breakout-rooms-started', handleBreakoutRoomsStarted)
      signalingService.off('breakout-rooms-ended', handleBreakoutRoomsEnded)
      signalingService.off('breakout-room-participant-moved', handleBreakoutRoomMove)
      signalingService.off('breakout-room-participant-returned', handleBreakoutRoomReturn)
    }
  }, [
    meetingId,
    participantId,
    setCurrentRole,
    updateGlobalSetting,
    syncPermissions,
    setChatEnabled,
    addSystemMessage,
    addPoll,
    votePoll,
    closePoll,
    deletePoll,
    addQuestion,
    upvoteQuestion,
    markAsAnswered,
    hideQuestion,
    deleteQuestion,
    setQAEnabled,
    startTimer,
    pauseTimer,
    stopTimer,
    startRecording,
    stopRecording,
    setBreakoutRooms,
    startBreakoutRooms,
    endBreakoutRooms,
    moveToBreakoutRoom,
    moveToMainRoom,
  ])
}
