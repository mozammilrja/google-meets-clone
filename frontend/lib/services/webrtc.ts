import { signalingService } from './signaling'
import { mediaService } from './media'

class WebRTCClient {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private listeners: Map<string, Function[]> = new Map()

  async initialize(): Promise<void> {
    console.log('[WebRTC] Initializing WebRTC client')

    // Get media capabilities from SFU
    await mediaService.initializeDevice()

    // Listen for media events
    mediaService.on('media:producer', this.handleProducer.bind(this))
    mediaService.on('media:consumer', this.handleConsumer.bind(this))
    mediaService.on('media:disconnected', this.handleDisconnect.bind(this))

    // Listen for signaling events
    signalingService.on('offer', this.handleOffer.bind(this))
    signalingService.on('answer', this.handleAnswer.bind(this))
    signalingService.on('ice-candidate', this.handleIceCandidate.bind(this))
    signalingService.on('participant-joined', this.handleParticipantJoined.bind(this))
    signalingService.on('participant-left', this.handleParticipantLeft.bind(this))
  }

  async getLocalStream(
    constraints: MediaStreamConstraints = { audio: true, video: true }
  ): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('[WebRTC] Got local stream')
      return stream
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error)
      throw error
    }
  }

  createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)!
    }

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    const peerConnection = new RTCPeerConnection(config)

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] New ICE candidate:', event.candidate)
        signalingService.sendIceCandidate({
          to: peerId,
          candidate: event.candidate,
        })
      }
    }

    peerConnection.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${peerId}:`, peerConnection.connectionState)
      this.emit('rtc:connection-state', { peerId, state: peerConnection.connectionState })
    }

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state with ${peerId}:`, peerConnection.iceConnectionState)
      this.emit('rtc:ice-state', { peerId, state: peerConnection.iceConnectionState })
    }

    peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind)
      this.emit('rtc:remote-track', { peerId, track: event.track, stream: event.streams[0] })
    }

    this.peerConnections.set(peerId, peerConnection)
    return peerConnection
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.createPeerConnection(peerId)
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    })
    await peerConnection.setLocalDescription(offer)
    console.log('[WebRTC] Created and set local offer')
    return offer
  }

  async handleOffer(data: any): Promise<void> {
    const { from, offer } = data
    console.log('[WebRTC] Received offer from:', from)

    try {
      const peerConnection = this.createPeerConnection(from)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      console.log('[WebRTC] Created and set local answer')

      signalingService.sendAnswer({ to: from, answer })
    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error)
      throw error
    }
  }

  async handleAnswer(data: any): Promise<void> {
    const { from, answer } = data
    console.log('[WebRTC] Received answer from:', from)

    try {
      const peerConnection = this.peerConnections.get(from)
      if (!peerConnection) {
        throw new Error(`No peer connection for ${from}`)
      }
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('[WebRTC] Set remote answer')
    } catch (error) {
      console.error('[WebRTC] Error handling answer:', error)
      throw error
    }
  }

  async handleIceCandidate(data: any): Promise<void> {
    const { from, candidate } = data
    console.log('[WebRTC] Received ICE candidate from:', from)

    try {
      const peerConnection = this.peerConnections.get(from)
      if (!peerConnection) {
        throw new Error(`No peer connection for ${from}`)
      }
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error)
    }
  }

  addLocalTrack(
    peerId: string,
    track: MediaStreamTrack,
    stream: MediaStream
  ): RTCRtpSender {
    const peerConnection = this.createPeerConnection(peerId)
    return peerConnection.addTrack(track, stream)
  }

  removeLocalTrack(peerId: string, sender: RTCRtpSender): void {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.removeTrack(sender)
    }
  }

  closePeerConnection(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(peerId)
      console.log('[WebRTC] Closed peer connection:', peerId)
    }
  }

  closeAll(): void {
    this.peerConnections.forEach((pc) => pc.close())
    this.peerConnections.clear()
    console.log('[WebRTC] Closed all peer connections')
  }

  private handleProducer(data: any): void {
    console.log('[WebRTC] Producer event:', data)
    this.emit('rtc:producer', data)
  }

  private handleConsumer(data: any): void {
    console.log('[WebRTC] Consumer event:', data)
    this.emit('rtc:consumer', data)
  }

  private handleDisconnect(data: any): void {
    console.log('[WebRTC] Media service disconnected:', data)
    this.emit('rtc:disconnect', data)
  }

  private handleParticipantJoined(data: any): void {
    console.log('[WebRTC] Participant joined:', data)
    this.emit('rtc:participant-joined', data)
  }

  private handleParticipantLeft(data: any): void {
    console.log('[WebRTC] Participant left:', data)
    const { participantId } = data
    this.closePeerConnection(participantId)
    this.emit('rtc:participant-left', data)
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

  private emit(eventName: string, ...args: any[]): void {
    const callbacks = this.listeners.get(eventName) || []
    callbacks.forEach((callback) => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`[WebRTC] Error in listener for ${eventName}:`, error)
      }
    })
  }
}

export const webRTCClient = new WebRTCClient()
