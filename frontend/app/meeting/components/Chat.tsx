'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, X } from 'lucide-react'
import { signalingService } from '@/lib/services/signaling'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'

export interface ChatMessage {
  id?: string
  participantId: string
  participantName: string
  message: string
  timestamp: Date
}

interface ChatProps {
  meetingId: string
  participantId: string
  participantName: string
  isVisible?: boolean
  onClose?: () => void
  isHost?: boolean
}

export const Chat: React.FC<ChatProps> = ({
  meetingId,
  participantId,
  participantName,
  isVisible = true,
  onClose,
  isHost = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Toggle chat enabled (host only)
  const handleToggleChatEnabled = useCallback(() => {
    const newEnabled = !chatEnabled
    setChatEnabled(newEnabled)
    signalingService.emit('chat-enabled-changed', { meetingId, enabled: newEnabled })
  }, [chatEnabled, meetingId])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up message listener
  useEffect(() => {
    const handleMessageReceived = (data: any) => {
      console.log('[Chat] Received message-received event:', data, 'my participantId:', participantId)
      
      // Skip messages from ourselves (we add them locally for immediate feedback)
      if (data.participantId === participantId) {
        console.log('[Chat] Skipping own message (already added locally)')
        return
      }
      
      const newMessage: ChatMessage = {
        id: data.id,
        participantId: data.participantId,
        participantName: data.participantName,
        message: data.message,
        timestamp: new Date(data.timestamp),
      }
      setMessages((prev) => [...prev, newMessage])
    }

    console.log('[Chat] Setting up message-received listener for meeting:', meetingId, 'my participantId:', participantId)
    signalingService.on('message-received', handleMessageReceived)

    return () => {
      signalingService.off('message-received', handleMessageReceived)
    }
  }, [meetingId, participantId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) {
      return
    }

    try {
      setIsSending(true)

      console.log('[Chat] Sending message:', {
        meetingId,
        participantId,
        participantName,
        message: inputValue,
      })

      // Send message via WebSocket
      signalingService.emit('send-message', {
        meetingId,
        participantId,
        participantName,
        message: inputValue,
      })

      // Add message locally for immediate feedback
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          participantId,
          participantName,
          message: inputValue,
          timestamp: new Date(),
        },
      ])

      // Clear input
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isOwnMessage = (msg: ChatMessage) => msg.participantId === participantId

  if (!isVisible) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-[#202124] w-[360px] border-l border-[#3c4043]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c4043]">
        <h3 className="text-lg font-medium text-white">In-call messages</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Host Toggle - Let participants send messages */}
      {isHost && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c4043]">
          <span className="text-sm text-gray-300">Let participants send messages</span>
          <button
            onClick={handleToggleChatEnabled}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200",
              chatEnabled ? "bg-[#8ab4f8]" : "bg-[#5f6368]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200",
                chatEnabled && "translate-x-5"
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

      {/* Messages Area */}
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
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={cn(
                  'flex gap-3',
                  isOwnMessage(msg) && 'flex-row-reverse'
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={cn(
                    'text-xs font-medium',
                    isOwnMessage(msg) 
                      ? 'bg-[#8ab4f8] text-[#202124]' 
                      : 'bg-[#5f6368] text-white'
                  )}>
                    {getInitials(msg.participantName)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  'max-w-[75%] flex flex-col',
                  isOwnMessage(msg) && 'items-end'
                )}>
                  <div className={cn(
                    'flex items-center gap-2 mb-1',
                    isOwnMessage(msg) && 'flex-row-reverse'
                  )}>
                    <span className="text-xs font-medium text-gray-300">
                      {isOwnMessage(msg) ? 'You' : msg.participantName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className={cn(
                    'rounded-2xl px-4 py-2 text-sm',
                    isOwnMessage(msg)
                      ? 'bg-[#8ab4f8] text-[#202124] rounded-br-sm'
                      : 'bg-[#3c4043] text-white rounded-bl-sm'
                  )}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#3c4043]">
        <div className="flex items-center gap-2 bg-[#3c4043] rounded-full px-4 py-2.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chatEnabled ? "Send a message" : "Chat is disabled"}
            disabled={isSending || !chatEnabled}
            maxLength={1000}
            className="flex-1 bg-transparent text-white placeholder:text-gray-400 focus:outline-none text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending || !inputValue.trim() || !chatEnabled}
            className={cn(
              "p-2 rounded-full transition-colors flex-shrink-0",
              inputValue.trim() && chatEnabled 
                ? "text-[#8ab4f8] hover:bg-[#3c4043]" 
                : "text-gray-600 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
