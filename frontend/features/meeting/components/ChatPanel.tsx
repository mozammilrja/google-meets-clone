'use client'

import React, { memo, useCallback, useState, useRef, useEffect } from 'react'
import { X, Send, Pin, Trash2, PinOff, MessageSquare } from 'lucide-react'
import { useUIPanelsStore, useChatStore, selectMessages, selectPinnedMessage, selectIsChatEnabled, type ChatMessage } from '../stores'
import { usePermissionsStore, selectIsHostOrCoHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'
import { cn } from '@/lib/utils/cn'

interface ChatPanelProps {
  meetingId: string
  participantId: string
  participantName: string
}

/**
 * Chat panel with moderation features - Google Meet style
 * - Pin/unpin messages (host/cohost)
 * - Delete messages (host/cohost)
 * - System messages
 * - Chat enable/disable toggle for hosts
 */
export const ChatPanel = memo(function ChatPanel({
  meetingId,
  participantId,
  participantName,
}: ChatPanelProps) {
  const setChatVisible = useUIPanelsStore(state => state.setChatVisible)
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  
  // Chat store
  const messages = useChatStore(selectMessages)
  const pinnedMessage = useChatStore(selectPinnedMessage)
  const isChatEnabled = useChatStore(selectIsChatEnabled)
  const addMessage = useChatStore(state => state.addMessage)
  const deleteMessage = useChatStore(state => state.deleteMessage)
  const pinMessage = useChatStore(state => state.pinMessage)
  const unpinMessage = useChatStore(state => state.unpinMessage)
  const setChatEnabled = useChatStore(state => state.setChatEnabled)
  
  const [inputValue, setInputValue] = useState('')
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Toggle chat enabled (host only)
  const handleToggleChatEnabled = useCallback(() => {
    const newEnabled = !isChatEnabled
    setChatEnabled(newEnabled)
    signalingService.emit('chat-enabled-changed', { meetingId, enabled: newEnabled })
  }, [isChatEnabled, meetingId, setChatEnabled])
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Listen for incoming messages
  useEffect(() => {
    const handleMessage = (data: {
      id?: string
      participantId: string
      participantName: string
      message: string
      timestamp: string
      type?: 'user' | 'system' | 'private'
    }) => {
      // Don't add own messages again (we add them optimistically)
      if (data.participantId === participantId) return
      
      addMessage({
        id: data.id || `${Date.now()}-${Math.random()}`,
        meetingId,
        senderId: data.participantId,
        senderName: data.participantName,
        senderRole: 'participant',
        content: data.message,
        timestamp: new Date(data.timestamp),
        type: data.type || 'user',
        isPinned: false,
        isDeleted: false,
      })
    }
    
    const handleMessageDeleted = (data: { messageId: string }) => {
      deleteMessage(data.messageId, 'host')
    }
    
    const handleMessagePinned = (data: { messageId: string }) => {
      pinMessage(data.messageId)
    }
    
    const handleMessageUnpinned = () => {
      unpinMessage()
    }
    
    signalingService.on('chat-message', handleMessage)
    signalingService.on('chat-message-deleted', handleMessageDeleted)
    signalingService.on('chat-message-pinned', handleMessagePinned)
    signalingService.on('chat-message-unpinned', handleMessageUnpinned)
    
    return () => {
      signalingService.off('chat-message', handleMessage)
      signalingService.off('chat-message-deleted', handleMessageDeleted)
      signalingService.off('chat-message-pinned', handleMessagePinned)
      signalingService.off('chat-message-unpinned', handleMessageUnpinned)
    }
  }, [participantId, addMessage, deleteMessage, pinMessage, unpinMessage])
  
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !isChatEnabled) return
    
    const messageId = `${Date.now()}-${Math.random()}`
    
    // Send message via signaling
    signalingService.sendChatMessage({
      meetingId,
      senderId: participantId,
      senderName: participantName,
      message: inputValue.trim(),
    })
    
    // Add to local store immediately (optimistic update)
    addMessage({
      id: messageId,
      meetingId,
      senderId: participantId,
      senderName: participantName,
      senderRole: 'participant',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: 'user',
      isPinned: false,
      isDeleted: false,
    })
    
    setInputValue('')
  }, [inputValue, isChatEnabled, meetingId, participantId, participantName, addMessage])
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])
  
  const handleClose = useCallback(() => {
    setChatVisible(false)
  }, [setChatVisible])
  
  const handleDeleteMessage = useCallback((messageId: string) => {
    deleteMessage(messageId, participantId)
    signalingService.emit('chat-message-delete', { meetingId, messageId })
  }, [meetingId, participantId, deleteMessage])
  
  const handlePinMessage = useCallback((messageId: string) => {
    pinMessage(messageId)
    signalingService.emit('chat-message-pin', { meetingId, messageId })
  }, [meetingId, pinMessage])
  
  const handleUnpinMessage = useCallback(() => {
    unpinMessage()
    signalingService.emit('chat-message-unpin', { meetingId })
  }, [meetingId, unpinMessage])
  
  return (
    <aside 
      className={cn(
        "fixed right-4 top-4 bottom-24 w-[360px] z-40",
        "bg-[#202124] rounded-xl shadow-2xl border border-[#3c4043]",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-right-5 fade-in duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c4043]">
        <h2 className="text-lg font-medium text-white">
          In-call messages
        </h2>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-[#3c4043] 
                     transition-colors duration-150"
          aria-label="Close chat"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {/* Host Toggle - Let participants send messages */}
      {isHostOrCoHost && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c4043]">
          <span className="text-sm text-gray-300">Let participants send messages</span>
          <button
            onClick={handleToggleChatEnabled}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200",
              isChatEnabled ? "bg-[#8ab4f8]" : "bg-[#5f6368]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200",
                isChatEnabled && "translate-x-5"
              )}
            />
          </button>
        </div>
      )}
      
      {/* Continuous Chat Notice */}
      <div className="px-4 py-3 border-b border-[#3c4043] text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <input type="checkbox" className="w-3.5 h-3.5 rounded bg-[#3c4043] border-gray-500" disabled />
          <span>Continuous chat is OFF</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Messages won't be saved when the call ends. You can pin a message to make it visible for people who join later.
        </p>
      </div>
      
      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="px-4 py-3 bg-[#8ab4f8]/10 border-b border-[#3c4043]">
          <div className="flex items-start gap-2">
            <Pin className="h-4 w-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8ab4f8] font-medium mb-0.5">Pinned message</p>
              <p className="text-sm text-white truncate">{pinnedMessage.content}</p>
              <p className="text-xs text-gray-400">{pinnedMessage.senderName}</p>
            </div>
            {isHostOrCoHost && (
              <button
                onClick={handleUnpinMessage}
                className="p-1 hover:bg-[#3c4043] rounded transition-colors"
              >
                <PinOff className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {/* Google Meet style illustration - person with laptop waving */}
            <div className="mb-6 relative w-48 h-36">
              {/* Laptop */}
              <div className="absolute bottom-0 left-4">
                <div className="w-20 h-14 bg-[#3c4043] rounded-t-lg relative">
                  <div className="absolute inset-1 bg-[#8ab4f8]/30 rounded-md"></div>
                </div>
                <div className="w-24 h-2 bg-[#5f6368] rounded-b-lg -ml-2"></div>
              </div>
              {/* Person */}
              <div className="absolute right-6 bottom-0">
                {/* Body */}
                <div className="w-20 h-20 bg-gradient-to-b from-[#f4a460] to-[#e8915a] rounded-t-3xl relative">
                  {/* Head */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                    <div className="w-14 h-14 bg-[#f4a460] rounded-full relative">
                      {/* Hair */}
                      <div className="absolute -top-2 left-1 w-12 h-8 bg-[#8b4513] rounded-t-full"></div>
                      {/* Face features */}
                      <div className="absolute top-6 left-3 w-2 h-1 bg-[#333] rounded-full"></div>
                      <div className="absolute top-6 right-3 w-2 h-1 bg-[#333] rounded-full"></div>
                      <div className="absolute top-9 left-1/2 -translate-x-1/2 w-3 h-1 bg-[#333] rounded-full"></div>
                    </div>
                  </div>
                  {/* Waving arm */}
                  <div className="absolute -right-6 top-0 w-6 h-16 bg-[#f4a460] rounded-full transform rotate-[-30deg] origin-bottom"></div>
                  {/* Hand */}
                  <div className="absolute -right-8 -top-4 w-5 h-5 bg-[#f4a460] rounded-full"></div>
                </div>
              </div>
            </div>
            <p className="text-base text-gray-400 mb-2">No chat messages yet</p>
            <p className="text-sm text-gray-500">
              Messages can only be seen by people in the call
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                isOwn={message.senderId === participantId}
                isPinned={pinnedMessage?.id === message.id}
                isHovered={hoveredMessageId === message.id}
                isHostOrCoHost={isHostOrCoHost}
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                onDelete={() => handleDeleteMessage(message.id)}
                onPin={() => handlePinMessage(message.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-[#3c4043]">
        <div className="flex items-center gap-2 bg-[#3c4043] rounded-full px-4 py-2.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isChatEnabled ? "Send a message" : "Chat is disabled"}
            disabled={!isChatEnabled}
            className="flex-1 bg-transparent text-white placeholder:text-gray-400 
                       focus:outline-none text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isChatEnabled}
            className={cn(
              "p-2 rounded-full transition-colors flex-shrink-0",
              inputValue.trim() && isChatEnabled
                ? "text-[#8ab4f8] hover:bg-[#3c4043]" 
                : "text-gray-600 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  )
})

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  isPinned: boolean
  isHovered: boolean
  isHostOrCoHost: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDelete: () => void
  onPin: () => void
}

const MessageBubble = memo(function MessageBubble({ 
  message,
  isOwn,
  isPinned,
  isHovered,
  isHostOrCoHost,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  onPin,
}: MessageBubbleProps) {
  const timeString = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  // System message style
  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="px-3 py-1 bg-[#3c4043] rounded-full text-xs text-gray-400">
          {message.content}
        </span>
      </div>
    )
  }
  
  return (
    <div 
      className={cn(
        "group flex flex-col relative",
        isOwn ? "items-end" : "items-start"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Sender name (for others) */}
      {!isOwn && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
          {message.senderName}
        </span>
      )}
      
      {/* Message container with actions */}
      <div className="flex items-center gap-1">
        {/* Actions (show on hover for host) */}
        {isHostOrCoHost && isHovered && !isOwn && (
          <div className="flex items-center gap-1 animate-in fade-in duration-150">
            <button
              onClick={onPin}
              className="p-1.5 hover:bg-[#3c4043] rounded-full transition-colors"
              title="Pin message"
            >
              <Pin className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-900/30 rounded-full transition-colors"
              title="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        )}
        
        {/* Message bubble */}
        <div className={cn(
          "max-w-[80%] px-4 py-2 rounded-2xl relative",
          isOwn 
            ? "bg-blue-600 text-white rounded-br-md" 
            : "bg-gray-100 dark:bg-[#3c4043] text-gray-900 dark:text-white rounded-bl-md",
          isPinned && "ring-2 ring-[#8ab4f8]"
        )}>
          {isPinned && (
            <Pin className="absolute -top-1 -right-1 h-3 w-3 text-[#8ab4f8]" />
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        
        {/* Actions (show on hover for host - own messages) */}
        {isHostOrCoHost && isHovered && isOwn && (
          <div className="flex items-center gap-1 animate-in fade-in duration-150">
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-900/30 rounded-full transition-colors"
              title="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        )}
      </div>
      
      {/* Timestamp */}
      <span className="text-xs text-gray-400 mt-1 px-1">
        {timeString}
      </span>
    </div>
  )
})

ChatPanel.displayName = 'ChatPanel'
