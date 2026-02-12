'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { signalingService } from '@/lib/services/signaling'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
}

export const Chat: React.FC<ChatProps> = ({
  meetingId,
  participantId,
  participantName,
  isVisible = true,
  onClose: _onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Chat</h3>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/70">Start the conversation!</p>
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
                    'text-xs',
                    isOwnMessage(msg) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {getInitials(msg.participantName)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  'max-w-[75%]',
                  isOwnMessage(msg) && 'items-end'
                )}>
                  <div className={cn(
                    'flex items-center gap-2 mb-1',
                    isOwnMessage(msg) && 'flex-row-reverse'
                  )}>
                    <span className="text-xs font-medium text-foreground">
                      {isOwnMessage(msg) ? 'You' : msg.participantName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    isOwnMessage(msg)
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted text-foreground rounded-tl-none'
                  )}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            maxLength={1000}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSending || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
