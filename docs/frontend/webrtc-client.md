# WebRTC Client Logic

> Complete WebRTC implementation for client-side media handling, peer connections, and SFU integration.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Client Application                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │  MediaManager   │        │ SignalingClient │             │
│  │ - getUserMedia  │◄──────►│ - Socket.IO     │             │
│  │ - Tracks        │        │ - Events        │             │
│  └─────────────────┘        └─────────────────┘             │
│           │                          │                        │
│           ▼                          ▼                        │
│  ┌─────────────────────────────────────────────┐             │
│  │         PeerConnectionManager               │             │
│  │  - RTCPeerConnection instances              │             │
│  │  - SDP negotiation                          │             │
│  │  - ICE candidates                           │             │
│  └─────────────────────────────────────────────┘             │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Media Acquisition

### Get User Media

```typescript
// lib/media/MediaManager.ts
export class MediaManager {
  private localStream: MediaStream | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  
  async getUserMedia(constraints: MediaStreamConstraints = {}): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        }
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        ...defaultConstraints,
        ...constraints
      });
      
      this.audioTrack = this.localStream.getAudioTracks()[0] || null;
      this.videoTrack = this.localStream.getVideoTracks()[0] || null;
      
      // Log track settings
      if (this.videoTrack) {
        const settings = this.videoTrack.getSettings();
        console.log('Video track settings:', settings);
      }
      
      return this.localStream;
    } catch (error) {
      console.error('getUserMedia error:', error);
      throw this.handleMediaError(error);
    }
  }
  
  private handleMediaError(error: any): Error {
    if (error.name === 'NotAllowedError') {
      return new Error('Camera/microphone access denied');
    } else if (error.name === 'NotFoundError') {
      return new Error('No camera/microphone found');
    } else if (error.name === 'NotReadableError') {
      return new Error('Camera/microphone already in use');
    } else {
      return new Error('Failed to access media devices');
    }
  }
  
  toggleAudio(enabled?: boolean): boolean {
    if (!this.audioTrack) return false;
    
    const newState = enabled ?? !this.audioTrack.enabled;
    this.audioTrack.enabled = newState;
    return newState;
  }
  
  toggleVideo(enabled?: boolean): boolean {
    if (!this.videoTrack) return false;
    
    const newState = enabled ?? !this.videoTrack.enabled;
    this.videoTrack.enabled = newState;
    return newState;
  }
  
  async getDisplayMedia(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false // Screen audio capture (optional)
      });
    } catch (error) {
      console.error('getDisplayMedia error:', error);
      throw new Error('Screen sharing access denied');
    }
  }
  
  stopAllTracks(): void {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.audioTrack = null;
    this.videoTrack = null;
  }
}
```

---

## Peer Connection Management

### Single Peer Connection (SFU Mode)

```typescript
// lib/webrtc/PeerConnectionManager.ts
import { Device } from 'mediasoup-client';
import { Transport, Producer, Consumer } from 'mediasoup-client/lib/types';

export class PeerConnectionManager {
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  
  constructor(
    private signalingClient: SignalingClient,
    private mediaManager: MediaManager
  ) {}
  
  async initialize(): Promise<void> {
    // Load device with router RTP capabilities
    const { rtpCapabilities } = await this.signalingClient.getRouterCapabilities();
    
    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
    
    console.log('Device loaded:', {
      canProduce: {
        audio: this.device.canProduce('audio'),
        video: this.device.canProduce('video')
      }
    });
  }
  
  async createSendTransport(): Promise<void> {
    // Get transport params from server
    const params = await this.signalingClient.createTransport({ producing: true });
    
    this.sendTransport = this.device!.createSendTransport(params);
    
    // Handle 'connect' event
    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.signalingClient.connectTransport({
          transportId: this.sendTransport!.id,
          dtlsParameters
        });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });
    
    // Handle 'produce' event
    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { producerId } = await this.signalingClient.produce({
          transportId: this.sendTransport!.id,
          kind,
          rtpParameters,
          appData
        });
        callback({ id: producerId });
      } catch (error) {
        errback(error as Error);
      }
    });
    
    // Handle connection state changes
    this.sendTransport.on('connectionstatechange', (state) => {
      console.log('Send transport connection state:', state);
      if (state === 'failed' || state === 'closed') {
        this.handleTransportFailure('send');
      }
    });
  }
  
  async createRecvTransport(): Promise<void> {
    const params = await this.signalingClient.createTransport({ producing: false });
    
    this.recvTransport = this.device!.createRecvTransport(params);
    
    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.signalingClient.connectTransport({
          transportId: this.recvTransport!.id,
          dtlsParameters
        });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });
    
    this.recvTransport.on('connectionstatechange', (state) => {
      console.log('Recv transport connection state:', state);
      if (state === 'failed' || state === 'closed') {
        this.handleTransportFailure('recv');
      }
    });
  }
  
  async produceAudio(track: MediaStreamTrack): Promise<string> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }
    
    const producer = await this.sendTransport.produce({
      track,
      codecOptions: {
        opusStereo: true,
        opusDtx: true
      },
      appData: { mediaTag: 'mic-audio' }
    });
    
    this.producers.set(producer.id, producer);
    
    producer.on('transportclose', () => {
      this.producers.delete(producer.id);
    });
    
    producer.on('trackended', () => {
      console.log('Audio track ended');
      this.closeProducer(producer.id);
    });
    
    return producer.id;
  }
  
  async produceVideo(track: MediaStreamTrack): Promise<string> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }
    
    const producer = await this.sendTransport.produce({
      track,
      encodings: [
        { maxBitrate: 100000, scaleResolutionDownBy: 4 },  // Low
        { maxBitrate: 300000, scaleResolutionDownBy: 2 },  // Medium
        { maxBitrate: 900000, scaleResolutionDownBy: 1 }   // High
      ],
      codecOptions: {
        videoGoogleStartBitrate: 1000
      },
      appData: { mediaTag: 'cam-video' }
    });
    
    this.producers.set(producer.id, producer);
    
    producer.on('transportclose', () => {
      this.producers.delete(producer.id);
    });
    
    producer.on('trackended', () => {
      console.log('Video track ended');
      this.closeProducer(producer.id);
    });
    
    return producer.id;
  }
  
  async consume(producerId: string): Promise<Consumer> {
    if (!this.recvTransport || !this.device) {
      throw new Error('Recv transport not created');
    }
    
    const { id, kind, rtpParameters } = await this.signalingClient.consume({
      producerId,
      rtpCapabilities: this.device.rtpCapabilities
    });
    
    const consumer = await this.recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters
    });
    
    this.consumers.set(consumer.id, consumer);
    
    // Resume consumer after adding to DOM
    await this.signalingClient.resumeConsumer({ consumerId: consumer.id });
    
    consumer.on('transportclose', () => {
      this.consumers.delete(consumer.id);
    });
    
    consumer.on('producerclose', () => {
      console.log('Producer closed for consumer:', consumer.id);
      this.closeConsumer(consumer.id);
    });
    
    return consumer;
  }
  
  closeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
      this.signalingClient.closeProducer({ producerId });
    }
  }
  
  closeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
    }
  }
  
  private async handleTransportFailure(type: 'send' | 'recv'): Promise<void> {
    console.error(`${type} transport failed, attempting to reconnect...`);
    
    // Close all producers/consumers
    if (type === 'send') {
      this.producers.forEach(producer => producer.close());
      this.producers.clear();
    } else {
      this.consumers.forEach(consumer => consumer.close());
      this.consumers.clear();
    }
    
    // Recreate transport
    if (type === 'send') {
      await this.createSendTransport();
    } else {
      await this.createRecvTransport();
    }
  }
  
  close(): void {
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.producers.clear();
    this.consumers.clear();
  }
}
```

---

## Signaling Client

```typescript
// lib/signaling/SignalingClient.ts
import { io, Socket } from 'socket.io-client';

export class SignalingClient {
  private socket: Socket;
  private eventHandlers: Map<string, Function[]> = new Map();
  
  constructor(private url: string, private authToken: string) {
    this.socket = io(url, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.setupListeners();
  }
  
  private setupListeners(): void {
    this.socket.on('connect', () => {
      console.log('Signaling connected:', this.socket.id);
      this.emit('connected', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Signaling disconnected:', reason);
      this.emit('disconnected', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('error', error);
    });
    
    // Meeting events
    this.socket.on('participant:joined', (data) => this.emit('participant-joined', data));
    this.socket.on('participant:left', (data) => this.emit('participant-left', data));
    this.socket.on('participant:audio-changed', (data) => this.emit('audio-changed', data));
    this.socket.on('participant:video-changed', (data) => this.emit('video-changed', data));
    
    // Producer/Consumer events
    this.socket.on('new-producer', (data) => this.emit('new-producer', data));
    this.socket.on('producer-closed', (data) => this.emit('producer-closed', data));
  }
  
  async joinMeeting(meetingId: string, options: any): Promise<any> {
    return this.request('meeting:join', { meetingId, ...options });
  }
  
  async getRouterCapabilities(): Promise<any> {
    return this.request('router:capabilities');
  }
  
  async createTransport(params: any): Promise<any> {
    return this.request('transport:create', params);
  }
  
  async connectTransport(params: any): Promise<void> {
    return this.request('transport:connect', params);
  }
  
  async produce(params: any): Promise<any> {
    return this.request('produce', params);
  }
  
  async consume(params: any): Promise<any> {
    return this.request('consume', params);
  }
  
  async resumeConsumer(params: any): Promise<void> {
    return this.request('consumer:resume', params);
  }
  
  async closeProducer(params: any): Promise<void> {
    return this.request('producer:close', params);
  }
  
  private request(event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }
  
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  disconnect(): void {
    this.socket.disconnect();
  }
}
```

---

## React Integration

### useMeeting Hook

```typescript
// hooks/useMeeting.ts
import { useState, useEffect, useCallback } from 'react';
import { MediaManager } from '../lib/media/MediaManager';
import { PeerConnectionManager } from '../lib/webrtc/PeerConnectionManager';
import { SignalingClient } from '../lib/signaling/SignalingClient';

export const useMeeting = (meetingId: string, authToken: string) => {
  const [mediaManager] = useState(() => new MediaManager());
  const [signalingClient] = useState(() => new SignalingClient(
    process.env.NEXT_PUBLIC_SIGNALING_URL!,
    authToken
  ));
  const [peerManager] = useState(() => new PeerConnectionManager(signalingClient, mediaManager));
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Join meeting
  useEffect(() => {
    const join = async () => {
      try {
        // Get local media
        const stream = await mediaManager.getUserMedia();
        setLocalStream(stream);
        
        // Initialize peer connection
        await peerManager.initialize();
        await peerManager.createSendTransport();
        await peerManager.createRecvTransport();
        
        // Join meeting via signaling
        const { participants } = await signalingClient.joinMeeting(meetingId, {
          audio: true,
          video: true
        });
        
        // Produce local tracks
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        
        if (audioTrack) await peerManager.produceAudio(audioTrack);
        if (videoTrack) await peerManager.produceVideo(videoTrack);
        
        // Consume existing participants
        for (const participant of participants) {
          if (participant.audioProducerId) {
            const consumer = await peerManager.consume(participant.audioProducerId);
            addParticipantTrack(participant.id, consumer.track);
          }
          if (participant.videoProducerId) {
            const consumer = await peerManager.consume(participant.videoProducerId);
            addParticipantTrack(participant.id, consumer.track);
          }
        }
      } catch (error) {
        console.error('Failed to join meeting:', error);
      }
    };
    
    join();
    
    return () => {
      mediaManager.stopAllTracks();
      peerManager.close();
      signalingClient.disconnect();
    };
  }, [meetingId]);
  
  // Handle new producers
  useEffect(() => {
    const handleNewProducer = async ({ producerId, participantId, kind }: any) => {
      const consumer = await peerManager.consume(producerId);
      addParticipantTrack(participantId, consumer.track);
    };
    
    signalingClient.on('new-producer', handleNewProducer);
    
    return () => {
      signalingClient.off('new-producer', handleNewProducer);
    };
  }, []);
  
  const addParticipantTrack = (participantId: string, track: MediaStreamTrack) => {
    setParticipants(prev => {
      const updated = new Map(prev);
      const participant = updated.get(participantId) || { id: participantId, streams: [] };
      
      const stream = new MediaStream([track]);
      participant.streams.push(stream);
      
      updated.set(participantId, participant);
      return updated;
    });
  };
  
  const toggleAudio = useCallback(() => {
    const enabled = mediaManager.toggleAudio();
    setAudioEnabled(enabled);
  }, [mediaManager]);
  
  const toggleVideo = useCallback(() => {
    const enabled = mediaManager.toggleVideo();
    setVideoEnabled(enabled);
  }, [mediaManager]);
  
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await mediaManager.getDisplayMedia();
      const screenTrack = screenStream.getVideoTracks()[0];
      
      await peerManager.produceVideo(screenTrack);
      
      screenTrack.onended = () => {
        setIsScreenSharing(false);
      };
      
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Screen share failed:', error);
    }
  }, [mediaManager, peerManager]);
  
  const leaveMeeting = useCallback(() => {
    mediaManager.stopAllTracks();
    peerManager.close();
    signalingClient.disconnect();
  }, [mediaManager, peerManager, signalingClient]);
  
  return {
    localStream,
    participants: Array.from(participants.values()),
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    leaveMeeting
  };
};
```

---

## Error Handling

### Connection Failures

```typescript
class ConnectionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

async function handleConnectionFailure(error: Error): Promise<void> {
  if (error.name === 'NotAllowedError') {
    // Permission denied
    showPermissionDialog();
  } else if (error.message.includes('ICE')) {
    // ICE connection failed
    showNetworkErrorDialog();
  } else {
    // Generic error
    showErrorDialog(error.message);
  }
}
```

---

## Performance Monitoring

```typescript
// Monitor connection quality
setInterval(async () => {
  const stats = await peerConnection.getStats();
  
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      const packetsLost = report.packetsLost;
      const packetsReceived = report.packetsReceived;
      const lossRate = packetsLost / (packetsLost + packetsReceived);
      
      console.log('Packet loss rate:', lossRate);
      
      if (lossRate > 0.1) {
        // High packet loss, degrade quality
        consumer.setPreferredLayers({ spatialLayer: 0 });
      }
    }
  });
}, 5000);
```

---

## Summary

The WebRTC client handles:
- **Media Acquisition**: getUserMedia, getDisplayMedia
- **Device Management**: Mediasoup device initialization
- **Transport Management**: Send/receive WebRTC transports
- **Producer/Consumer**: Track publishing and consumption
- **Signaling**: Socket.IO integration
- **Error Handling**: Graceful failure recovery
- **Performance**: Quality adaptation based on network
