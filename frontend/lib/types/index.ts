// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  id: string
  email: string
  name: string
  roles: string[]
  token: string
}

export interface User {
  id: string
  email: string
  name: string
  roles: string[]
}

// Meeting types
export interface Meeting {
  id: string
  code: string
  title: string
  hostId: string
  scheduledAt?: string
  duration?: number
  status: 'pending' | 'active' | 'completed'
  settings?: MeetingSettings
}

export interface MeetingSettings {
  allowAudio: boolean
  allowVideo: boolean
  allowScreenShare: boolean
  allowRecording: boolean
}

export interface Participant {
  id: string
  meetingId: string
  userId: string
  name: string
  role: 'guest' | 'participant' | 'host' | 'admin'
  status: 'pending' | 'joined' | 'left'
  audio: boolean
  video: boolean
  screenSharing: boolean
  joinedAt: string
  leftAt?: string
}

// WebRTC types
export interface RTCCapabilities {
  audio: RtpCodecParameters[]
  video: RtpCodecParameters[]
}

export interface RtpCodecParameters {
  kind?: 'audio' | 'video'
  mimeType: string
  clockRate: number
  channels?: number
  preferredPayloadType?: number
  parameters?: Record<string, any>
  rtcpFeedback?: RtcpFeedback[]
}

export interface RtcpFeedback {
  type: string
  parameter?: string
}

export interface TransportOptions {
  id: string
  iceParameters: IceParameters
  iceCandidates: IceCandidate[]
  dtlsParameters: DtlsParameters
  sctpParameters?: SctpParameters
}

export interface IceParameters {
  usernameFragment: string
  password: string
}

export interface IceCandidate {
  candidate: string
  sdpMLineIndex: number
  sdpMid: string
}

export interface DtlsParameters {
  role: 'auto' | 'client' | 'server'
  fingerprints: DtlsFingerprint[]
}

export interface DtlsFingerprint {
  algorithm: string
  value: string
}

export interface SctpParameters {
  port: number
  OS: number
  MIS: number
  maxMessageSize: number
}

export interface ProducerOptions {
  id: string
  kind: 'audio' | 'video' | 'screen'
  rtpParameters: RtpSendParameters
}

export interface RtpSendParameters {
  mid?: string
  codecs: RtpCodecParameters[]
  headerExtensions: RtpHeaderExtensionParameters[]
  encodings: RtpEncodingParameters[]
  rtcp?: RtcpParameters
}

export interface RtpHeaderExtensionParameters {
  uri: string
  id: number
  encrypt?: boolean
  parameters?: Record<string, any>
}

export interface RtpEncodingParameters {
  rid?: string
  codecPayloadType?: number
  dtx?: boolean
  ssrc?: number
  maxBitrate?: number
  maxFramerate?: number
  maxSpatialLayer?: number
  scalabilityMode?: string
  scaleResolutionDownBy?: number
}

export interface RtcpParameters {
  cname?: string
  reducedSize?: boolean
  mux?: boolean
}

export interface ConsumerOptions {
  id: string
  producerId: string
  kind: 'audio' | 'video'
  rtpParameters: RtpReceiveParameters
}

export interface RtpReceiveParameters {
  mid?: string
  codecs: RtpCodecParameters[]
  headerExtensions: RtpHeaderExtensionParameters[]
  encodings: RtpEncodingParameters[]
  rtcp?: RtcpParameters
}

// Video element tracking
export interface VideoElement {
  id: string
  participantId: string
  element: HTMLVideoElement
  kind: 'audio' | 'video' | 'screen'
}

export interface VideoTrack {
  id: string
  participantId: string
  kind: 'audio' | 'video' | 'screen'
  track: MediaStreamTrack
  enabled: boolean
}

// Connection state
export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'

export interface ConnectionInfo {
  state: ConnectionState
  bitrate: number
  framerate: number
  resolution: { width: number; height: number }
  packetLoss?: number
  latency?: number
}

// Meeting state types
export interface MeetingState {
  meetingId: string
  participants: Participant[]
  localParticipant?: {
    id: string
    audio: boolean
    video: boolean
    screenSharing: boolean
  }
  producers: Map<string, any>
  consumers: Map<string, any>
  videoElements: Map<string, VideoElement>
  videoTracks: Map<string, VideoTrack>
}

// Socket.IO event types
export interface SignalingMessage {
  from: string
  to?: string
  type: string
  data: any
}

export interface MediaMessage {
  from: string
  to?: string
  type: string
  data: any
}

// Error types
export interface APIError {
  status: number
  message: string
  code?: string
}

// Device types (for mediasoup-client)
export interface DeviceCapabilities {
  canSend: {
    audio: boolean
    video: boolean
  }
  canReceive: {
    audio: boolean
    video: boolean
  }
}
