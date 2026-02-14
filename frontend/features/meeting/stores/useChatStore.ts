'use client'

import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'

// =============================================================================
// CHAT MESSAGE TYPES
// =============================================================================

export type MessageType = 'user' | 'system' | 'private'

export interface ChatMessage {
  id: string
  meetingId: string
  senderId: string
  senderName: string
  senderRole: 'host' | 'co-host' | 'participant' | 'viewer'
  content: string
  type: MessageType
  recipientId?: string // For private messages
  recipientName?: string
  timestamp: Date
  isPinned: boolean
  isDeleted: boolean
  deletedBy?: string
}

export interface ChatState {
  // Messages
  messages: ChatMessage[]
  pinnedMessage: ChatMessage | null
  
  // Unread tracking
  unreadCount: number
  lastReadTimestamp: Date | null
  
  // Chat settings
  isChatEnabled: boolean
  isPrivateMessagesEnabled: boolean
  
  // UI state
  isLoading: boolean
  error: string | null
  
  // Actions - Messages
  addMessage: (message: ChatMessage) => void
  addSystemMessage: (meetingId: string, content: string) => void
  deleteMessage: (messageId: string, deletedBy: string) => void
  clearMessages: () => void
  
  // Actions - Pinning
  pinMessage: (messageId: string) => void
  unpinMessage: () => void
  
  // Actions - Read tracking
  markAsRead: () => void
  incrementUnread: () => void
  
  // Actions - Settings (from host)
  setChatEnabled: (enabled: boolean) => void
  setPrivateMessagesEnabled: (enabled: boolean) => void
  
  // Actions - Bulk sync
  syncMessages: (messages: ChatMessage[]) => void
  
  // Actions - State
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Reset
  reset: () => void
}

// =============================================================================
// STORE
// =============================================================================

export const useChatStore = create<ChatState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      messages: [],
      pinnedMessage: null,
      unreadCount: 0,
      lastReadTimestamp: null,
      isChatEnabled: true,
      isPrivateMessagesEnabled: true,
      isLoading: false,
      error: null,
      
      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }))
      },
      
      addSystemMessage: (meetingId, content) => {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          meetingId,
          senderId: 'system',
          senderName: 'System',
          senderRole: 'host',
          content,
          type: 'system',
          timestamp: new Date(),
          isPinned: false,
          isDeleted: false,
        }
        set((state) => ({
          messages: [...state.messages, systemMessage],
        }))
      },
      
      deleteMessage: (messageId, deletedBy) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, isDeleted: true, deletedBy, content: '[Message deleted]' }
              : msg
          ),
          // If deleted message was pinned, unpin it
          pinnedMessage: state.pinnedMessage?.id === messageId ? null : state.pinnedMessage,
        }))
      },
      
      clearMessages: () => {
        set({ messages: [], pinnedMessage: null, unreadCount: 0 })
      },
      
      pinMessage: (messageId) => {
        const message = get().messages.find((m) => m.id === messageId)
        if (message && !message.isDeleted) {
          set((state) => ({
            messages: state.messages.map((msg) => ({
              ...msg,
              isPinned: msg.id === messageId,
            })),
            pinnedMessage: message,
          }))
        }
      },
      
      unpinMessage: () => {
        set((state) => ({
          messages: state.messages.map((msg) => ({
            ...msg,
            isPinned: false,
          })),
          pinnedMessage: null,
        }))
      },
      
      markAsRead: () => {
        set({ unreadCount: 0, lastReadTimestamp: new Date() })
      },
      
      incrementUnread: () => {
        set((state) => ({ unreadCount: state.unreadCount + 1 }))
      },
      
      setChatEnabled: (enabled) => {
        set({ isChatEnabled: enabled })
        if (!enabled) {
          // Add system message when chat is disabled
          const meetingId = get().messages[0]?.meetingId || ''
          if (meetingId) {
            get().addSystemMessage(meetingId, 'Chat has been disabled by the host')
          }
        }
      },
      
      setPrivateMessagesEnabled: (enabled) => {
        set({ isPrivateMessagesEnabled: enabled })
      },
      
      syncMessages: (messages) => {
        set({ messages, isLoading: false })
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      reset: () => {
        set({
          messages: [],
          pinnedMessage: null,
          unreadCount: 0,
          lastReadTimestamp: null,
          isChatEnabled: true,
          isPrivateMessagesEnabled: true,
          isLoading: false,
          error: null,
        })
      },
    })),
    { name: 'chat-store' }
  )
)

// =============================================================================
// SELECTORS
// =============================================================================

export const selectMessages = (state: ChatState) => state.messages
export const selectVisibleMessages = (state: ChatState) => 
  state.messages.filter((m) => !m.isDeleted || m.type === 'system')
export const selectPinnedMessage = (state: ChatState) => state.pinnedMessage
export const selectUnreadCount = (state: ChatState) => state.unreadCount
export const selectIsChatEnabled = (state: ChatState) => state.isChatEnabled
