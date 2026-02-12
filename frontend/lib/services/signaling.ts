import { io, Socket } from 'socket.io-client'

class SignalingService {
  private socket: Socket | null = null
  private listeners: Map<string, Function[]> = new Map()

  connect(signalingUrl: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to the /signaling namespace on the backend
      this.socket = io(`${signalingUrl}/signaling`, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      this.socket.on('connect', () => {
        console.log('[Signaling] Connected to backend')
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        console.error('[Signaling] Connection error:', error)
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[Signaling] Disconnected:', reason)
        this.emit('signaling:disconnected', { reason })
      })

      // Forward all events to listeners
      this.socket.onAny((eventName: string, ...args: any[]) => {
        console.log('[Signaling] Received event:', eventName, args)
        this._emit(eventName, ...args)
      })
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
  }

  emit(eventName: string, data?: any): void {
    if (!this.socket) {
      console.warn('[Signaling] Socket not connected')
      return
    }
    this.socket.emit(eventName, data)
  }

  on(eventName: string, callback: Function): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, [])
    }
    this.listeners.get(eventName)!.push(callback)
  }

  off(eventName: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(eventName)
      return
    }
    const callbacks = this.listeners.get(eventName)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private _emit(eventName: string, ...args: any[]): void {
    const callbacks = this.listeners.get(eventName) || []
    callbacks.forEach((callback) => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`[Signaling] Error in listener for ${eventName}:`, error)
      }
    })
  }

  // Meeting events
  joinMeeting(meetingId: string, userId: string, participantId: string): void {
    this.socket?.emit('join-meeting', { meetingId, userId, participantId })
  }

  leaveMeeting(meetingId: string, participantId: string): void {
    this.socket?.emit('leave-meeting', { meetingId, participantId })
  }

  // WebRTC signaling
  sendOffer(data: any): void {
    this.socket?.emit('offer', data)
  }

  sendAnswer(data: any): void {
    this.socket?.emit('answer', data)
  }

  sendIceCandidate(data: any): void {
    this.socket?.emit('ice-candidate', data)
  }

  // Media state
  updateMediaState(data: {
    meetingId: string
    participantId: string
    audio: boolean
    video: boolean
    screenSharing: boolean
  }): void {
    this.socket?.emit('media-state', data)
  }

  requestMeetingState(meetingId: string): void {
    this.socket?.emit('meeting-state-sync', { meetingId })
  }

  // Host controls
  muteParticipant(meetingId: string, participantId: string): void {
    this.socket?.emit('host:mute-participant', { meetingId, participantId })
  }

  kickParticipant(meetingId: string, participantId: string): void {
    this.socket?.emit('host:kick-participant', { meetingId, participantId })
  }

  // Chat
  sendChatMessage(data: { meetingId: string; message: string; senderId: string; senderName: string }): void {
    this.socket?.emit('chat:message', data)
  }

  // Reactions
  sendReaction(data: { meetingId: string; participantId: string; emoji: string }): void {
    this.socket?.emit('reaction', data)
  }

  raiseHand(meetingId: string, participantId: string, raised: boolean): void {
    this.socket?.emit('hand-raise', { meetingId, participantId, raised })
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const signalingService = new SignalingService()
