'use client'

import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'

// =============================================================================
// TIMER TYPES
// =============================================================================

export interface MeetingTimer {
  id: string
  duration: number // in seconds
  remainingTime: number // in seconds
  isRunning: boolean
  startedAt: Date | null
  startedBy: string
  type: 'countdown' | 'stopwatch'
}

// =============================================================================
// POLL TYPES
// =============================================================================

export interface PollOption {
  id: string
  text: string
  votes: number
  voterIds: string[]
}

export interface Poll {
  id: string
  meetingId: string
  question: string
  options: PollOption[]
  createdBy: string
  createdByName: string
  createdAt: Date
  isActive: boolean
  isClosed: boolean
  allowMultiple: boolean
  isAnonymous: boolean
  totalVotes: number
}

// =============================================================================
// Q&A TYPES
// =============================================================================

export interface QAQuestion {
  id: string
  meetingId: string
  question: string
  askedBy: string
  askedByName: string
  askedAt: Date
  upvotes: number
  upvoterIds: string[]
  isAnswered: boolean
  answeredBy?: string
  answeredAt?: Date
  answer?: string
  isHidden: boolean
}

// =============================================================================
// RECORDING TYPES
// =============================================================================

export interface RecordingState {
  isRecording: boolean
  recordingId: string | null
  startedAt: Date | null
  startedBy: string | null
  duration: number
}

// =============================================================================
// BREAKOUT ROOM TYPES
// =============================================================================

export interface BreakoutRoom {
  id: string
  name: string
  participantIds: string[]
  timerDuration: number | null // in seconds
  timerRemaining: number | null
  isTimerRunning: boolean
  createdAt: Date
  isActive: boolean
  remainingTime?: number // Alias for timerRemaining for component compatibility
}

export interface BreakoutRoomsState {
  isActive: boolean
  rooms: BreakoutRoom[]
  mainRoomId: string | null
  currentRoomId: string | null
  returnTimestamp: Date | null
}

// =============================================================================
// STORE STATE
// =============================================================================

interface MeetingToolsState {
  // Timer
  timer: MeetingTimer | null
  
  // Polls
  polls: Poll[]
  activePoll: Poll | null
  
  // Q&A
  questions: QAQuestion[]
  
  // Recording
  recording: RecordingState
  
  // Breakout rooms
  breakoutRooms: BreakoutRoomsState
  
  // Timer actions
  startTimer: (meetingId: string, duration: number, type?: 'countdown' | 'stopwatch') => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  updateTimerRemaining: (remaining: number) => void
  syncTimer: (timer: MeetingTimer | null) => void
  
  // Poll actions
  createPoll: (poll: Omit<Poll, 'id' | 'createdAt' | 'isActive' | 'isClosed' | 'totalVotes'>) => Poll
  addPoll: (poll: Poll) => void
  votePoll: (pollId: string, optionId: string, participantId: string) => void
  closePoll: (pollId: string) => void
  deletePoll: (pollId: string) => void
  setActivePoll: (pollId: string | null) => void
  syncPolls: (polls: Poll[]) => void
  
  // Q&A actions
  askQuestion: (question: Omit<QAQuestion, 'id' | 'askedAt' | 'upvotes' | 'upvoterIds' | 'isAnswered' | 'isHidden'>) => QAQuestion
  addQuestion: (question: QAQuestion) => void
  upvoteQuestion: (questionId: string, participantId: string) => void
  markAsAnswered: (questionId: string, answeredBy?: string, answer?: string) => void
  hideQuestion: (questionId: string) => void
  unhideQuestion: (questionId: string) => void
  deleteQuestion: (questionId: string) => void
  setQAEnabled: (enabled: boolean) => void
  syncQuestions: (questions: QAQuestion[]) => void
  qa: { isEnabled: boolean }
  
  // Recording actions
  startRecording: (meetingId: string) => void
  stopRecording: () => void
  updateRecordingDuration: (duration: number) => void
  syncRecording: (recording: RecordingState) => void
  
  // Breakout room actions
  createBreakoutRooms: (meetingId: string, names: string[], assignments?: Record<string, string[]>) => void
  setBreakoutRooms: (rooms: BreakoutRoom[]) => void
  startBreakoutRooms: (timerSeconds?: number) => void
  endBreakoutRooms: () => void
  moveToBreakoutRoom: (roomId: string, participantId: string) => void
  moveToMainRoom: (participantId: string) => void
  joinBreakoutRoom: (roomId: string) => void
  moveParticipant: (participantId: string, fromRoomId: string, toRoomId: string) => void
  startBreakoutTimer: (roomId: string, duration: number) => void
  closeBreakoutRooms: (returnTimestamp: Date) => void
  syncBreakoutRooms: (state: BreakoutRoomsState) => void
  
  // Reset
  reset: () => void
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialRecordingState: RecordingState = {
  isRecording: false,
  recordingId: null,
  startedAt: null,
  startedBy: null,
  duration: 0,
}

const initialBreakoutState: BreakoutRoomsState = {
  isActive: false,
  rooms: [],
  mainRoomId: null,
  currentRoomId: null,
  returnTimestamp: null,
}

const initialQAState = {
  isEnabled: true,
}

// =============================================================================
// STORE
// =============================================================================

export const useMeetingToolsStore = create<MeetingToolsState>()(
  devtools(
    subscribeWithSelector((set) => ({
      timer: null,
      polls: [],
      activePoll: null,
      questions: [],
      recording: initialRecordingState,
      breakoutRooms: initialBreakoutState,
      qa: initialQAState,
      
      // Timer actions
      startTimer: (meetingId, duration, type = 'countdown') => {
        const timer: MeetingTimer = {
          id: `timer-${meetingId}-${Date.now()}`,
          duration,
          remainingTime: duration,
          isRunning: true,
          startedAt: new Date(),
          startedBy: meetingId,
          type,
        }
        set({ timer })
      },
      
      pauseTimer: () => {
        set((state) => ({
          timer: state.timer ? { ...state.timer, isRunning: false } : null,
        }))
      },
      
      resumeTimer: () => {
        set((state) => ({
          timer: state.timer ? { ...state.timer, isRunning: true } : null,
        }))
      },
      
      stopTimer: () => {
        set({ timer: null })
      },
      
      updateTimerRemaining: (remaining) => {
        set((state) => ({
          timer: state.timer ? { ...state.timer, remainingTime: remaining } : null,
        }))
      },
      
      syncTimer: (timer) => {
        set({ timer })
      },
      
      // Poll actions
      createPoll: (pollData) => {
        const poll: Poll = {
          ...pollData,
          id: `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          isActive: true,
          isClosed: false,
          totalVotes: 0,
          options: pollData.options.map((opt) => ({
            ...opt,
            votes: 0,
            voterIds: [],
          })),
        }
        set((state) => ({
          polls: [...state.polls, poll],
          activePoll: poll,
        }))
        return poll
      },
      
      addPoll: (poll) => {
        set((state) => ({
          polls: [...state.polls, poll],
          activePoll: poll.isActive ? poll : state.activePoll,
        }))
      },
      
      votePoll: (pollId, optionId, participantId) => {
        set((state) => {
          const updatedPolls = state.polls.map((poll) => {
            if (poll.id !== pollId) return poll
            
            // Check if already voted
            const hasVoted = poll.options.some((opt) => opt.voterIds.includes(participantId))
            if (hasVoted && !poll.allowMultiple) return poll
            
            return {
              ...poll,
              totalVotes: poll.totalVotes + 1,
              options: poll.options.map((opt) => {
                if (opt.id !== optionId) return opt
                return {
                  ...opt,
                  votes: opt.votes + 1,
                  voterIds: [...opt.voterIds, participantId],
                }
              }),
            }
          })
          
          const updatedActivePoll = state.activePoll?.id === pollId
            ? updatedPolls.find((p) => p.id === pollId) || null
            : state.activePoll
            
          return { polls: updatedPolls, activePoll: updatedActivePoll }
        })
      },
      
      closePoll: (pollId) => {
        set((state) => ({
          polls: state.polls.map((poll) =>
            poll.id === pollId ? { ...poll, isActive: false, isClosed: true } : poll
          ),
          activePoll: state.activePoll?.id === pollId 
            ? { ...state.activePoll, isActive: false, isClosed: true }
            : state.activePoll,
        }))
      },
      
      deletePoll: (pollId) => {
        set((state) => ({
          polls: state.polls.filter((poll) => poll.id !== pollId),
          activePoll: state.activePoll?.id === pollId ? null : state.activePoll,
        }))
      },
      
      setActivePoll: (pollId) => {
        set((state) => ({
          activePoll: pollId ? state.polls.find((p) => p.id === pollId) || null : null,
        }))
      },
      
      syncPolls: (polls) => {
        set({ polls })
      },
      
      // Q&A actions
      askQuestion: (questionData) => {
        const question: QAQuestion = {
          ...questionData,
          id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          askedAt: new Date(),
          upvotes: 0,
          upvoterIds: [],
          isAnswered: false,
          isHidden: false,
        }
        set((state) => ({
          questions: [...state.questions, question],
        }))
        return question
      },
      
      addQuestion: (question) => {
        set((state) => ({
          questions: [...state.questions, question],
        }))
      },
      
      upvoteQuestion: (questionId, participantId) => {
        set((state) => ({
          questions: state.questions.map((q) => {
            if (q.id !== questionId) return q
            if (q.upvoterIds.includes(participantId)) return q // Already upvoted
            return {
              ...q,
              upvotes: q.upvotes + 1,
              upvoterIds: [...q.upvoterIds, participantId],
            }
          }),
        }))
      },
      
      markAsAnswered: (questionId, answeredBy, answer) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? { ...q, isAnswered: true, answeredBy, answeredAt: new Date(), answer }
              : q
          ),
        }))
      },
      
      hideQuestion: (questionId) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId ? { ...q, isHidden: true } : q
          ),
        }))
      },
      
      unhideQuestion: (questionId) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId ? { ...q, isHidden: false } : q
          ),
        }))
      },
      
      deleteQuestion: (questionId) => {
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== questionId),
        }))
      },
      
      setQAEnabled: (enabled) => {
        set((state) => ({
          qa: { ...state.qa, isEnabled: enabled },
        }))
      },
      
      syncQuestions: (questions) => {
        set({ questions })
      },
      
      // Recording actions
      startRecording: (meetingId) => {
        set({
          recording: {
            isRecording: true,
            recordingId: `rec-${meetingId}-${Date.now()}`,
            startedAt: new Date(),
            startedBy: null,
            duration: 0,
          },
        })
      },
      
      stopRecording: () => {
        set({ recording: initialRecordingState })
      },
      
      updateRecordingDuration: (duration) => {
        set((state) => ({
          recording: { ...state.recording, duration },
        }))
      },
      
      syncRecording: (recording) => {
        set({ recording })
      },
      
      // Breakout room actions
      createBreakoutRooms: (meetingId, names, assignments = {}) => {
        const breakoutRooms: BreakoutRoom[] = names.map((name, idx) => ({
          id: `breakout-${meetingId}-${Date.now()}-${idx}`,
          name,
          participantIds: assignments[name] || [],
          timerDuration: null,
          timerRemaining: null,
          isTimerRunning: false,
          createdAt: new Date(),
          isActive: false,
          remainingTime: undefined,
        }))
        
        set({
          breakoutRooms: {
            isActive: false,
            rooms: breakoutRooms,
            mainRoomId: meetingId,
            currentRoomId: null,
            returnTimestamp: null,
          },
        })
      },
      
      setBreakoutRooms: (rooms) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            rooms,
          },
        }))
      },
      
      startBreakoutRooms: (timerSeconds) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            isActive: true,
            rooms: state.breakoutRooms.rooms.map((room) => ({
              ...room,
              isActive: true,
              timerDuration: timerSeconds || null,
              timerRemaining: timerSeconds || null,
              isTimerRunning: !!timerSeconds,
            })),
          },
        }))
      },
      
      endBreakoutRooms: () => {
        set({
          breakoutRooms: {
            isActive: false,
            rooms: [],
            mainRoomId: null,
            currentRoomId: null,
            returnTimestamp: new Date(),
          },
        })
      },
      
      moveToBreakoutRoom: (roomId, participantId) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            rooms: state.breakoutRooms.rooms.map((room) => {
              // Remove from other rooms
              const filteredIds = room.participantIds.filter(id => id !== participantId)
              // Add to target room
              if (room.id === roomId) {
                return { ...room, participantIds: [...filteredIds, participantId] }
              }
              return { ...room, participantIds: filteredIds }
            }),
          },
        }))
      },
      
      moveToMainRoom: (participantId) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            rooms: state.breakoutRooms.rooms.map((room) => ({
              ...room,
              participantIds: room.participantIds.filter(id => id !== participantId),
            })),
          },
        }))
      },
      
      joinBreakoutRoom: (roomId) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            currentRoomId: roomId,
          },
        }))
      },
      
      moveParticipant: (participantId, fromRoomId, toRoomId) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            rooms: state.breakoutRooms.rooms.map((room) => {
              if (room.id === fromRoomId) {
                return {
                  ...room,
                  participantIds: room.participantIds.filter((id) => id !== participantId),
                }
              }
              if (room.id === toRoomId) {
                return {
                  ...room,
                  participantIds: [...room.participantIds, participantId],
                }
              }
              return room
            }),
          },
        }))
      },
      
      startBreakoutTimer: (roomId, duration) => {
        set((state) => ({
          breakoutRooms: {
            ...state.breakoutRooms,
            rooms: state.breakoutRooms.rooms.map((room) =>
              room.id === roomId
                ? { ...room, timerDuration: duration, timerRemaining: duration, isTimerRunning: true }
                : room
            ),
          },
        }))
      },
      
      closeBreakoutRooms: (returnTimestamp) => {
        set({
          breakoutRooms: {
            isActive: false,
            rooms: [],
            mainRoomId: null,
            currentRoomId: null,
            returnTimestamp,
          },
        })
      },
      
      syncBreakoutRooms: (state) => {
        set({ breakoutRooms: state })
      },
      
      reset: () => {
        set({
          timer: null,
          polls: [],
          activePoll: null,
          questions: [],
          recording: initialRecordingState,
          breakoutRooms: initialBreakoutState,
          qa: initialQAState,
        })
      },
    })),
    { name: 'meeting-tools-store' }
  )
)

// =============================================================================
// SELECTORS
// =============================================================================

export const selectTimer = (state: MeetingToolsState) => state.timer
export const selectPolls = (state: MeetingToolsState) => state.polls
export const selectActivePoll = (state: MeetingToolsState) => state.activePoll
export const selectQuestions = (state: MeetingToolsState) => state.questions
export const selectQAQuestions = (state: MeetingToolsState) => state.questions
export const selectVisibleQuestions = (state: MeetingToolsState) => 
  state.questions.filter((q) => !q.isHidden)
export const selectRecording = (state: MeetingToolsState) => state.recording
export const selectIsRecording = (state: MeetingToolsState) => state.recording.isRecording
export const selectBreakoutRooms = (state: MeetingToolsState) => state.breakoutRooms.rooms
export const selectBreakoutRoomsState = (state: MeetingToolsState) => state.breakoutRooms
export const selectIsInBreakoutRoom = (state: MeetingToolsState) => 
  state.breakoutRooms.isActive && state.breakoutRooms.currentRoomId !== null
export const selectQAEnabled = (state: MeetingToolsState) => state.qa.isEnabled
