'use client'

import { io, Socket } from 'socket.io-client'
import * as mediasoupClient from 'mediasoup-client'

// Types
export interface RTCCapabilities {
  codecs?: any[]
  headerExtensions?: any[]
}

export interface JoinRoomResponse {
  success: boolean
  rtpCapabilities?: RTCCapabilities
  existingProducers?: Array<{ peerId: string; producerId: string; kind: string }>
  error?: string
}

export interface CreateTransportResponse {
  success: boolean
  id?: string
  iceParameters?: any
  iceCandidates?: any[]
  dtlsParameters?: any
  error?: string
}

export interface ProduceResponse {
  success: boolean
  producerId?: string
  error?: string
}

export interface ConsumeResponse {
  success: boolean
  id?: string
  producerId?: string
  kind?: string
  rtpParameters?: any
  error?: string
}

type EventCallback = (...args: any[]) => void

/**
 * MediaService - Handles WebSocket connection to SFU and mediasoup device management
 * 
 * STRICT Usage flow (DO NOT CHANGE ORDER):
 * 1. await mediaService.connect(url, token)       // Connect socket
 * 2. await mediaService.joinRoom(roomId, peerId)  // Join room → receive routerRtpCapabilities
 * 3. await mediaService.initializeDevice()        // device.load({ routerRtpCapabilities })
 * 4. await mediaService.createSendTransport()     // Create transports
 * 5. await mediaService.createRecvTransport()
 * 6. await mediaService.produce(track)            // Produce / consume
 * 
 * If even one step moves, it breaks.
 */
class MediaService {
  private static instance: MediaService | null = null
  
  private socket: Socket | null = null
  private device: mediasoupClient.Device | null = null
  private sendTransport: mediasoupClient.types.Transport | null = null
  private recvTransport: mediasoupClient.types.Transport | null = null
  private producers: Map<string, mediasoupClient.types.Producer> = new Map()
  private consumers: Map<string, mediasoupClient.types.Consumer> = new Map()
  private listeners: Map<string, EventCallback[]> = new Map()
  
  private roomId: string | null = null
  private participantId: string | null = null
  private routerRtpCapabilities: RTCCapabilities | null = null
  private isJoinedRoom: boolean = false
  private isDeviceLoaded: boolean = false
  private isConnecting: boolean = false
  private connectPromise: Promise<void> | null = null

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MediaService {
    if (typeof window === 'undefined') {
      // Return a dummy instance for SSR that won't be used
      return new MediaService()
    }
    
    if (!MediaService.instance) {
      MediaService.instance = new MediaService()
    }
    return MediaService.instance
  }

  /**
   * Connect to media server
   */
  async connect(mediaUrl: string, token: string): Promise<void> {
    // Already connected
    if (this.socket?.connected) {
      console.log('[MediaService] Already connected, socketId:', this.socket.id)
      return
    }

    // Already connecting - wait for the existing promise
    if (this.isConnecting && this.connectPromise) {
      console.log('[MediaService] Already connecting, waiting for existing promise...')
      return this.connectPromise
    }

    // Socket exists but not connected - close it
    if (this.socket && !this.socket.connected) {
      console.log('[MediaService] Stale socket found, closing...')
      this.socket.disconnect()
      this.socket = null
    }

    console.log('[MediaService] Starting new connection to:', mediaUrl)
    this.isConnecting = true
    
    this.connectPromise = new Promise((resolve, reject) => {
      if (!token) {
        this.isConnecting = false
        this.connectPromise = null
        reject(new Error('No token provided'))
        return
      }

      this.socket = io(mediaUrl, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
        upgrade: false,
      })

      const timeout = setTimeout(() => {
        if (!this.socket?.connected) {
          this.isConnecting = false
          this.connectPromise = null
          this.socket?.disconnect()
          reject(new Error('Connection timeout'))
        }
      }, 15000)

      this.socket.on('connect', () => {
        clearTimeout(timeout)
        this.isConnecting = false
        console.log('[MediaService] Connected successfully, socketId:', this.socket?.id)
        resolve()
      })

      this.socket.on('connect_error', (error: Error) => {
        clearTimeout(timeout)
        this.isConnecting = false
        this.connectPromise = null
        console.error('[MediaService] Connection error:', error.message)
        reject(error)
      })

      this.socket.on('error', (error: any) => {
        console.error('[MediaService] Socket error:', error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[MediaService] Disconnected:', reason)
        this.isJoinedRoom = false
        this.isConnecting = false
        this.connectPromise = null
        this.emitEvent('disconnected', { reason })
      })

      // Forward server events
      this.socket.on('newProducer', (data) => this.emitEvent('newProducer', data))
      this.socket.on('producerClosed', (data) => this.emitEvent('producerClosed', data))
      this.socket.on('participantJoined', (data) => this.emitEvent('participantJoined', data))
      this.socket.on('participantLeft', (data) => this.emitEvent('participantLeft', data))
    })

    return this.connectPromise
  }

  /**
   * Join a room - MUST be called after connect(), before initializeDevice()
   * Stores routerRtpCapabilities for subsequent initializeDevice() call
   */
  async joinRoom(roomId: string, participantId: string): Promise<JoinRoomResponse> {
    this.ensureConnected()

    console.log('[MediaService] joinRoom called:', { roomId, participantId, socketId: this.socket?.id })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[MediaService] joinRoom timeout after 10s')
        reject(new Error('joinRoom timeout - server did not respond'))
      }, 10000)

      console.log('[MediaService] Emitting joinRoom event...')
      this.socket!.emit(
        'joinRoom',
        { roomId, participantId },
        (response: JoinRoomResponse) => {
          clearTimeout(timeout)
          console.log('[MediaService] joinRoom response:', response)
          if (!response.success || response.error) {
            reject(new Error(response.error || 'Failed to join room'))
            return
          }
          
          if (!response.rtpCapabilities) {
            reject(new Error('Server did not return rtpCapabilities'))
            return
          }
          
          this.roomId = roomId
          this.participantId = participantId
          this.routerRtpCapabilities = response.rtpCapabilities
          this.isJoinedRoom = true
          
          console.log('[MediaService] Joined room:', roomId, 'socketId:', this.socket?.id)
          console.log('[MediaService] Received rtpCapabilities:', !!response.rtpCapabilities)
          this.emitEvent('roomJoined', response)
          resolve(response)
        }
      )
    })
  }

  /**
   * Initialize mediasoup Device - MUST be called after joinRoom()
   * Uses routerRtpCapabilities stored from joinRoom() response
   */
  async initializeDevice(): Promise<mediasoupClient.Device> {
    if (!this.routerRtpCapabilities) {
      throw new Error(
        'No RTP capabilities available. Call joinRoom() first.'
      )
    }

    if (this.device && this.isDeviceLoaded) {
      console.log('[MediaService] Device already initialized')
      return this.device
    }

    try {
      this.device = new mediasoupClient.Device()
      
      await this.device.load({ 
        routerRtpCapabilities: this.routerRtpCapabilities as mediasoupClient.types.RtpCapabilities 
      })
      
      this.isDeviceLoaded = true
      console.log('[MediaService] Device initialized')
      console.log('[MediaService] Can produce audio:', this.device.canProduce('audio'))
      console.log('[MediaService] Can produce video:', this.device.canProduce('video'))
      
      return this.device
    } catch (error) {
      console.error('[MediaService] Failed to initialize device:', error)
      throw error
    }
  }

  /**
   * Get router RTP capabilities from server (alternative to joinRoom)
   */
  async getRouterRtpCapabilities(): Promise<RTCCapabilities> {
    this.ensureConnected()

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'getRouterRtpCapabilities',
        { roomId: this.roomId },
        (response: any) => {
          if (!response.success || response.error) {
            reject(new Error(response.error || 'Failed to get RTP capabilities'))
            return
          }
          
          this.routerRtpCapabilities = response.rtpCapabilities
          console.log('[MediaService] Got RTP capabilities')
          resolve(response.rtpCapabilities)
        }
      )
    })
  }

  /**
   * Create transport - returns transport options for external transport management
   * Used by TransportsManager for low-level transport control
   */
  async createTransport(direction: 'send' | 'recv'): Promise<CreateTransportResponse> {
    this.ensureConnected()
    this.ensureJoined()
    return this.requestCreateTransport(direction)
  }

  /**
   * Create send transport
   */
  async createSendTransport(): Promise<mediasoupClient.types.Transport> {
    this.ensureConnected()
    this.ensureJoined()
    this.ensureDeviceLoaded()

    const transportOptions = await this.requestCreateTransport('send')
    
    this.sendTransport = this.device!.createSendTransport({
      id: transportOptions.id!,
      iceParameters: transportOptions.iceParameters,
      iceCandidates: transportOptions.iceCandidates || [],
      dtlsParameters: transportOptions.dtlsParameters,
    })

    this.setupTransportEvents(this.sendTransport, 'send')
    
    console.log('[MediaService] Send transport created:', transportOptions.id)
    return this.sendTransport
  }

  /**
   * Create receive transport
   */
  async createRecvTransport(): Promise<mediasoupClient.types.Transport> {
    this.ensureConnected()
    this.ensureJoined()
    this.ensureDeviceLoaded()

    const transportOptions = await this.requestCreateTransport('recv')
    
    this.recvTransport = this.device!.createRecvTransport({
      id: transportOptions.id!,
      iceParameters: transportOptions.iceParameters,
      iceCandidates: transportOptions.iceCandidates || [],
      dtlsParameters: transportOptions.dtlsParameters,
    })

    this.setupTransportEvents(this.recvTransport, 'recv')
    
    console.log('[MediaService] Recv transport created:', transportOptions.id)
    return this.recvTransport
  }

  /**
   * Produce audio/video track
   */
  async produce(
    track: MediaStreamTrack,
    appData?: Record<string, any>
  ): Promise<mediasoupClient.types.Producer> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created. Call createSendTransport() first.')
    }

    console.log('[MediaService] Producing track:', track.kind, 'socketId:', this.socket?.id, 'roomId:', this.roomId)

    const producer = await this.sendTransport.produce({
      track,
      appData: { ...appData, trackKind: track.kind },
    })

    this.producers.set(producer.id, producer)
    
    producer.on('transportclose', () => {
      console.log('[MediaService] Producer transport closed:', producer.id)
      this.producers.delete(producer.id)
    })

    console.log('[MediaService] Created producer:', producer.id, producer.kind)
    return producer
  }

  /**
   * Notify server of produce (used by TransportsManager for low-level transport control)
   * This is called from the transport 'produce' event handler
   */
  async notifyProduce(
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: any,
    appData?: any
  ): Promise<ProduceResponse> {
    this.ensureConnected()
    return this.requestProduce(transportId, kind, rtpParameters, appData)
  }

  /**
   * Consume a remote producer
   */
  async consume(
    producerId: string,
    peerId: string
  ): Promise<{ consumer: mediasoupClient.types.Consumer; stream: MediaStream }> {
    if (!this.recvTransport) {
      throw new Error('Recv transport not created. Call createRecvTransport() first.')
    }

    if (!this.device) {
      throw new Error('Device not initialized')
    }

    const response = await this.requestConsume(producerId, this.device.rtpCapabilities)
    
    const consumer = await this.recvTransport.consume({
      id: response.id!,
      producerId: response.producerId!,
      kind: response.kind as mediasoupClient.types.MediaKind,
      rtpParameters: response.rtpParameters,
      appData: { peerId },
    })

    this.consumers.set(consumer.id, consumer)

    // Resume consumer on server
    await this.resumeConsumer(consumer.id)

    const stream = new MediaStream([consumer.track])
    
    console.log('[MediaService] Created consumer:', consumer.id, consumer.kind)
    return { consumer, stream }
  }

  /**
   * Resume a paused consumer
   */
  async resumeConsumer(consumerId: string): Promise<void> {
    this.ensureConnected()

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'resumeConsumer',
        { consumerId },
        (response: any) => {
          if (!response.success || response.error) {
            reject(new Error(response.error || 'Failed to resume consumer'))
            return
          }
          console.log('[MediaService] Resumed consumer:', consumerId)
          resolve()
        }
      )
    })
  }

  /**
   * Close a producer
   */
  async closeProducer(producerId: string): Promise<void> {
    const producer = this.producers.get(producerId)
    if (producer) {
      producer.close()
      this.producers.delete(producerId)
    }

    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket!.emit(
          'closeProducer',
          { producerId },
          () => {
            console.log('[MediaService] Closed producer:', producerId)
            resolve()
          }
        )
      })
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('[MediaService] Disconnecting...')
    
    // Close all producers
    this.producers.forEach((producer) => producer.close())
    this.producers.clear()
    
    // Close all consumers
    this.consumers.forEach((consumer) => consumer.close())
    this.consumers.clear()
    
    // Close transports
    this.sendTransport?.close()
    this.recvTransport?.close()
    this.sendTransport = null
    this.recvTransport = null
    
    // Reset state
    this.device = null
    this.isDeviceLoaded = false
    this.roomId = null
    this.participantId = null
    this.routerRtpCapabilities = null
    this.isJoinedRoom = false
    this.isConnecting = false
    this.connectPromise = null
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    console.log('[MediaService] Disconnected')
  }

  // Event handling
  on(eventName: string, callback: EventCallback): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, [])
    }
    this.listeners.get(eventName)!.push(callback)
  }

  off(eventName: string, callback?: EventCallback): void {
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

  // Getters
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  hasJoined(): boolean {
    return this.isJoinedRoom
  }

  isDeviceReady(): boolean {
    return this.isDeviceLoaded && this.device !== null
  }

  getDevice(): mediasoupClient.Device | null {
    return this.device
  }

  getSendTransport(): mediasoupClient.types.Transport | null {
    return this.sendTransport
  }

  getRecvTransport(): mediasoupClient.types.Transport | null {
    return this.recvTransport
  }

  getRoomId(): string | null {
    return this.roomId
  }

  getParticipantId(): string | null {
    return this.participantId
  }

  getRtpCapabilities(): RTCCapabilities | null {
    return this.routerRtpCapabilities
  }

  getProducers(): Map<string, mediasoupClient.types.Producer> {
    return this.producers
  }

  getConsumers(): Map<string, mediasoupClient.types.Consumer> {
    return this.consumers
  }

  // Private helpers
  private ensureConnected(): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to media server. Call connect() first.')
    }
  }

  private ensureJoined(): void {
    if (!this.isJoinedRoom) {
      throw new Error('Not joined to a room. Call joinRoom() first.')
    }
  }

  private ensureDeviceLoaded(): void {
    if (!this.device || !this.isDeviceLoaded) {
      throw new Error('Device not initialized. Call initializeDevice() first.')
    }
  }

  private emitEvent(eventName: string, ...args: any[]): void {
    const callbacks = this.listeners.get(eventName) || []
    callbacks.forEach((callback) => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`[MediaService] Error in listener for ${eventName}:`, error)
      }
    })
  }

  private async requestCreateTransport(direction: 'send' | 'recv'): Promise<CreateTransportResponse> {
    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'createTransport',
        { 
          roomId: this.roomId,
          participantId: this.participantId,
          direction 
        },
        (response: CreateTransportResponse) => {
          if (!response.success || response.error) {
            reject(new Error(response.error || 'Failed to create transport'))
            return
          }
          resolve(response)
        }
      )
    })
  }

  private async requestConsume(producerId: string, rtpCapabilities: any): Promise<ConsumeResponse> {
    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'consume',
        { producerId, rtpCapabilities },
        (response: ConsumeResponse) => {
          if (!response.success || response.error) {
            reject(new Error(response.error || 'Failed to consume'))
            return
          }
          resolve(response)
        }
      )
    })
  }

  private setupTransportEvents(
    transport: mediasoupClient.types.Transport,
    direction: 'send' | 'recv'
  ): void {
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.connectTransport(transport.id, dtlsParameters)
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })

    if (direction === 'send') {
      transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const response = await this.requestProduce(transport.id, kind, rtpParameters, appData)
          callback({ id: response.producerId! })
        } catch (error) {
          errback(error as Error)
        }
      })
    }

    transport.on('connectionstatechange', (state) => {
      console.log(`[MediaService] ${direction} transport state:`, state)
      if (state === 'failed') {
        transport.close()
      }
    })
  }

  async connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
    console.log('[MediaService] connectTransport - socketId:', this.socket?.id, 'roomId:', this.roomId, 'transportId:', transportId)
    
    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'connectTransport',
        { transportId, dtlsParameters },
        (response: any) => {
          if (!response.success || response.error) {
            console.error('[MediaService] connectTransport failed:', response.error)
            reject(new Error(response.error || 'Failed to connect transport'))
            return
          }
          console.log('[MediaService] Transport connected:', transportId)
          resolve()
        }
      )
    })
  }

  private async requestProduce(
    transportId: string,
    kind: string,
    rtpParameters: any,
    appData?: any
  ): Promise<ProduceResponse> {
    console.log('[MediaService] requestProduce - socketId:', this.socket?.id, 'roomId:', this.roomId, 'kind:', kind)
    
    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'produce',
        { transportId, kind, rtpParameters, appData },
        (response: ProduceResponse) => {
          if (!response.success || response.error) {
            console.error('[MediaService] requestProduce failed:', response.error)
            reject(new Error(response.error || 'Failed to produce'))
            return
          }
          console.log('[MediaService] Server acknowledged produce:', response.producerId)
          resolve(response)
        }
      )
    })
  }
}

// Singleton export for client-side usage
export const mediaService = MediaService.getInstance()
