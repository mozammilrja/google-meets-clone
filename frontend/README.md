# ExitMeet Frontend - Next.js Client Application

**Production-ready Next.js 14 frontend with JWT authentication, WebSocket signaling, and WebRTC media streaming**

---

## Architecture Overview

The frontend follows a layered architecture for clean separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│  Pages (React Components)                               │
│  ├─ /auth/login, /auth/signup                           │
│  ├─ /meeting/lobby                                      │
│  └─ /meeting/[id]                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Hooks (Custom React Hooks)                             │
│  ├─ useAuth() - Authentication flow                     │
│  ├─ useSignaling() - Signaling connection               │
│  ├─ useMedia() - Media connection                       │
│  └─ useWebRTC() - WebRTC peer connection               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Services (Core Business Logic)                         │
│  ├─ api.ts - HTTP client (REST endpoints)              │
│  ├─ signaling.ts - Socket.IO /signaling namespace      │
│  ├─ media.ts - Socket.IO /media namespace             │
│  └─ webrtc.ts - RTCPeerConnection management          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Context & Store (State Management with Zustand)       │
│  ├─ auth.ts - User + JWT token state                   │
│  └─ meeting.ts - Meeting + participants state          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  External APIs                                          │
│  ├─ Backend REST API (http://localhost:3000/api/v1)   │
│  ├─ Backend Signaling (ws://localhost:3000/signaling)  │
│  └─ SFU Media (ws://localhost:5000/media)             │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
frontend/
├── app/                              # Next.js app directory
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   ├── globals.css                  # Global styles
│   ├── auth/
│   │   ├── login/page.tsx           # Login page
│   │   └── signup/page.tsx          # Signup page
│   ├── meeting/
│   │   ├── lobby/page.tsx           # Meeting lobby
│   │   └── [id]/page.tsx            # Meeting room
│   └── components/                  # Shared components (future)
│
├── lib/
│   ├── hooks/
│   │   ├── useAuth.ts               # Authentication hook
│   │   ├── useSignaling.ts          # Signaling hook
│   │   └── useMedia.ts              # Media + WebRTC hooks
│   ├── services/
│   │   ├── api.ts                   # REST client
│   │   ├── signaling.ts             # Signaling service
│   │   ├── media.ts                 # Media service
│   │   └── webrtc.ts                # WebRTC client
│   ├── context/
│   │   ├── auth.ts                  # Auth store (Zustand)
│   │   └── meeting.ts               # Meeting store (Zustand)
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   └── utils/
│       └── helpers.ts               # Utility functions
│
├── next.config.js                   # Next.js configuration
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts               # Tailwind CSS config
├── postcss.config.mjs               # PostCSS config
├── package.json                     # Dependencies
├── .env.example                     # Environment template
└── .gitignore                       # Git ignore rules
```

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend running on `http://localhost:3000`
- Mediasoup SFU running on `http://localhost:5000`

### Installation

```bash
cd frontend
npm install
```

### Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your settings
# NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
# NEXT_PUBLIC_SIGNALING_URL=http://localhost:3000
# NEXT_PUBLIC_MEDIA_URL=http://localhost:5000
```

### Development Server

```bash
npm run dev
# Visit http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

---

## Authentication Flow

### 1. Registration

```
User → Signup Form
  ↓
useAuth().register()
  ↓
apiClient.register(email, password, name)
  ↓
Backend: POST /api/v1/auth/register
  ↓
Response: { id, email, name, roles[], token }
  ↓
loginUser() → Store JWT in Zustand + cookies
  ↓
Redirect to /meeting/lobby
```

### 2. Login

```
User → Login Form
  ↓
useAuth().login()
  ↓
apiClient.login(email, password)
  ↓
Backend: POST /api/v1/auth/login
  ↓
Response: { id, email, name, roles[], token }
  ↓
loginUser() → Store JWT in Zustand + cookies
  ↓
Redirect to /meeting/lobby
```

### 3. Token Management

- **Storage**: JWT stored in Zustand store + cookie
- **Cookie Settings**: `secure`, `httpOnly` (when available), `sameSite=strict`, 24h expiry
- **Expiry**: JWT expires after 24 hours (backend enforced)
- **Refresh**: On 401 response, auto-logout and redirect to /auth/login
- **Header**: All REST requests include `Authorization: Bearer <token>`

---

## Meeting Flow

### Step 1: Lobby (Create or Join)

**File**: `app/meeting/lobby/page.tsx`

```
Home Page
  ↓
Lobby Page
  ├─ Create Meeting Button
  │  ├─ apiClient.createMeeting()
  │  ├─ Response: { id, code, ... }
  │  └─ Navigate to /meeting/[id]
  │
  └─ Join Meeting Input
     ├─ Enter meeting code
     ├─ Navigate to /meeting/[code]
     └─ Backend looks up meeting by code
```

### Step 2: Initialize Media & Signaling

**File**: `app/meeting/[id]/page.tsx`

```
Meeting Page Loads
  ↓
useSignaling() Hook
  ├─ Connect to /signaling namespace with JWT
  ├─ signalingService.connect()
  └─ Event: 'signaling:connected'

useMedia() Hook
  ├─ Connect to /media namespace with JWT
  ├─ mediaService.connect()
  ├─ webRTCClient.initialize()
  └─ Event: 'media:capabilities'

useWebRTC() Hook
  ├─ getUserMedia() → local stream
  ├─ Display in <video ref={localVideoRef} />
  └─ Ready to produce (send media)

Backend Join
  ├─ apiClient.joinMeeting(meetingId, name)
  ├─ Backend creates participant record
  ├─ Broadcast 'participant-joined' to other clients
  └─ Response: { participantId, ... }

Signaling Join
  ├─ signalingService.joinMeeting(meetingId, userId, participantId)
  └─ Announce presence on /signaling namespace

Media Join
  ├─ mediaService.joinRoom(meetingId, userId)
  └─ Join SFU room (media state)
```

### Step 3: WebRTC Peer Exchange

**Manual SDP/ICE Handshake via Signaling**

```
For Each Participant:
  ├─ webRTCClient.createPeerConnection(participantId)
  ├─ Create offer: await peerConnection.createOffer()
  ├─ Set local: await peerConnection.setLocalDescription(offer)
  ├─ Send via signaling: signalingService.sendOffer({ to, offer })
  │
  └─ Receive offer (from signaling):
     ├─ Create peer connection
     ├─ Set remote: await peerConnection.setRemoteDescription(offer)
     ├─ Create answer: await peerConnection.createAnswer()
     ├─ Set local: await peerConnection.setLocalDescription(answer)
     └─ Send via signaling: signalingService.sendAnswer({ to, answer })

  ├─ Exchange ICE candidates:
     ├─ On icecandidate: signalingService.sendIceCandidate({ to, candidate })
     └─ On received: peerConnection.addIceCandidate(candidate)

  ├─ OnTrack event:
     ├─ Receive remote media stream
     ├─ Display in <video> element
     └─ Update UI
```

### Step 4: Media Routing via SFU

```
SFU Media Exchange (via WebSocket /media):

1. Get Router Capabilities
   ├─ mediaService.getRouterRtpCapabilities()
   └─ Response: { audio: [...], video: [...] }

2. Create Send Transport
   ├─ mediaService.createSendTransport()
   └─ Response: { id, iceParameters, dtlsParameters, iceCandidates }

3. Connect Send Transport (DTLS Handshake)
   ├─ Complete ICE + exchange DTLS params
   └─ mediaService.connectTransport(transportId, dtlsParameters)

4. Produce (Send Audio/Video)
   ├─ mediaService.produce(transportId, 'audio', rtpParameters)
   ├─ mediaService.produce(transportId, 'video', rtpParameters)
   └─ SFU broadcasts 'newProducer' to room

5. Receive: Create Recv Transport (same process)

6. Consume (Receive from each participant)
   ├─ mediaService.consume(producerId, rtpCapabilities)
   ├─ Create RTCRtpReceiver
   ├─ mediaService.resumeConsumer(consumerId)
   └─ Receive remote track via ontrack
```

---

## Key Services

### 1. API Service (`lib/services/api.ts`)

REST client for backend communication.

```typescript
import { apiClient } from '@/lib/services/api'

// Auth
await apiClient.register({ email, password, name })
await apiClient.login({ email, password })
await apiClient.getProfile()

// Meetings
await apiClient.createMeeting(title, duration)
await apiClient.getMeeting(meetingId)
await apiClient.joinMeeting(meetingId, name)
await apiClient.leaveMeeting(meetingId, participantId)
```

**Features**:
- Automatic token injection in headers
- 401 auto-logout on expired token
- Axios interceptors for error handling

### 2. Signaling Service (`lib/services/signaling.ts`)

Socket.IO client for `/signaling` namespace (WebRTC signaling + events).

```typescript
import { signalingService } from '@/lib/services/signaling'

// Connection
await signalingService.connect(url, token)
signalingService.disconnect()

// Meeting events
signalingService.joinMeeting(meetingId, userId, participantId)
signalingService.leaveMeeting(meetingId, participantId)

// WebRTC signaling
signalingService.sendOffer({ to, offer })
signalingService.sendAnswer({ to, answer })
signalingService.sendIceCandidate({ to, candidate })

// Media state
signalingService.updateMediaState({ 
  meetingId, participantId, audio, video, screenSharing 
})

// Listeners
signalingService.on('participant-joined', callback)
signalingService.on('offer', callback)
```

### 3. Media Service (`lib/services/media.ts`)

Socket.IO client for `/media` namespace (SFU media routing).

```typescript
import { mediaService } from '@/lib/services/media'

// Connection
await mediaService.connect(url, token)
mediaService.disconnect()

// Room & transports
await mediaService.initializeDevice()
await mediaService.joinRoom(roomId, userId)
await mediaService.createSendTransport()
await mediaService.createRecvTransport()
await mediaService.connectTransport(transportId, dtlsParameters)

// Media producers/consumers
await mediaService.produce(transportId, kind, rtpParameters)
await mediaService.consume(producerId, rtpCapabilities)
await mediaService.resumeConsumer(consumerId)
await mediaService.closeProducer(producerId)

// Listeners
mediaService.on('media:room-joined', callback)
mediaService.on('media:producer', callback)
mediaService.on('media:consumer', callback)
```

### 4. WebRTC Client (`lib/services/webrtc.ts`)

Manages RTCPeerConnection objects and WebRTC lifecycle.

```typescript
import { webRTCClient } from '@/lib/services/webrtc'

// Initialization
await webRTCClient.initialize()

// Local media
const stream = await webRTCClient.getLocalStream({ audio: true, video: true })

// Peer connections
const pc = webRTCClient.createPeerConnection(peerId)
const offer = await webRTCClient.createOffer(peerId)
await webRTCClient.handleOffer({ from, offer })
await webRTCClient.handleAnswer({ from, answer })
await webRTCClient.handleIceCandidate({ from, candidate })

// Cleanup
webRTCClient.closePeerConnection(peerId)
webRTCClient.closeAll()

// Listeners
webRTCClient.on('rtc:remote-track', callback)
webRTCClient.on('rtc:connection-state', callback)
```

---

## Custom Hooks

### `useAuth()`

Manages authentication state and operations.

```typescript
const { 
  user,              // Current user object
  token,             // JWT token
  isLoading,         // Loading state
  isAuthenticated,   // Boolean
  error,             // Error message
  register,          // async (data) => void
  login,             // async (data) => void
  logout             // () => void
} = useAuth()
```

### `useSignaling()`

Manages signaling WebSocket connection.

```typescript
const { 
  isConnected,       // Boolean
  error,             // Error message
  disconnect         // () => void
} = useSignaling()
```

### `useMedia()`

Manages media WebSocket connection and WebRTC initialization.

```typescript
const { 
  isConnected,       // Boolean
  error,             // Error message
  disconnect         // () => void
} = useMedia()

// Listeners
useMediaListener('media:room-joined', (data) => { ... })
```

### `useWebRTC()`

Manages WebRTC peer connections and local media.

```typescript
const { 
  isInitialized,     // Boolean
  localStream,       // MediaStream
  error,             // Error message
  getLocalStream,    // async (constraints?) => MediaStream
  stopLocalStream    // () => void
} = useWebRTC()

// Listeners
useWebRTCListener('rtc:remote-track', ({ peerId, track, stream }) => { ... })
```

---

## State Management (Zustand)

### Auth Store

```typescript
import { useAuthStore } from '@/lib/context/auth'

const { 
  user, token, isLoading, error,
  setUser, setToken, logout, clear
} = useAuthStore()
```

### Meeting Store

```typescript
import { useMeetingStore } from '@/lib/context/meeting'

const { 
  meetingId, meetingCode, participants, localParticipant,
  setMeeting, addParticipant, removeParticipant, updateParticipant,
  reset
} = useMeetingStore()
```

---

## Pages & Components

### Home Page (`app/page.tsx`)

- Banner and feature showcase
- Login / Signup buttons
- Redirects to lobby if authenticated

### Login Page (`app/auth/login/page.tsx`)

- Email + password form
- useAuth().login() integration
- Error handling
- Link to signup

### Signup Page (`app/auth/signup/page.tsx`)

- Name + email + password form
- Password confirmation
- useAuth().register() integration
- Error handling
- Link to login

### Meeting Lobby (`app/meeting/lobby/page.tsx`)

- User greeting
- Create Meeting button
- Join Meeting input (by meeting code)
- Getting started guide
- Logout button

### Meeting Room (`app/meeting/[id]/page.tsx`)

**Key Components**:

1. **Header**
   - Meeting participant count
   - Leave button

2. **Video Grid**
   - Local video (always visible)
   - Remote video placeholders
   - Participant name + audio state
   
3. **Controls Bar**
   - Mute/unmute audio button
   - Camera on/off button
   - Screen share button
   - Leave meeting button

**Features**:
- Real-time local media display
- Participant tracking
- Media state sync
- Error notification
- Loading state during initialization

---

## WebRTC Implementation Details

### RTCPeerConnection Lifecycle

```typescript
// 1. Create peer connection
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN serversif needed
  ]
})

// 2. Setup event handlers
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    signalingService.sendIceCandidate({ ...event.candidate })
  }
}

peerConnection.ontrack = (event) => {
  // Display remote video
  remoteVideoRef.current.srcObject = event.streams[0]
}

// 3. Exchange SDP
const offer = await peerConnection.createOffer()
await peerConnection.setLocalDescription(offer)
signalingService.sendOffer(offer)

// 4. Receive answer
const answer = await signalingService.waitForAnswer()
await peerConnection.setRemoteDescription(answer)

// 5. ICE candidates (ongoing)
await peerConnection.addIceCandidate(candidate)

// 6. Cleanup
peerConnection.close()
```

### Media Constraints

```typescript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  }
}

const stream = await navigator.mediaDevices.getUserMedia(constraints)
```

---

## Error Handling

### Network Errors

- **Signaling Connection Failed**: Auto-retry with exponential backoff
- **Media Connection Failed**: Display error, suggest browser reload
- **WebRTC Connection Failed**: Check firewall, STUN/TURN configuration

### Permission Errors

- **Microphone Denied**: Show settings prompt
- **Camera Denied**: Show settings prompt
- **Screen Share Denied**: Show notification and allow later

### Application Errors

- **Meeting Not Found**: Redirect to lobby
- **Unauthorized (401)**: Auto-logout, redirect to login
- **Server Error (5xx)**: Show error banner and retry option

---

## Utilities

### Token Management

```typescript
import { getTokenFromCookie, setTokenCookie, removeTokenCookie } from '@/lib/utils/helpers'

const token = getTokenFromCookie('token')
setTokenCookie(token, 86400) // 24 hours
removeTokenCookie('token')
```

### Meeting Utilities

```typescript
import { generateMeetingCode, parseMeetingCode } from '@/lib/utils/helpers'

const code = generateMeetingCode() // "ABC-DEF-GHI"
const parts = parseMeetingCode(code) // ["ABC", "DEF", "GHI"]
```

### Media Utilities

```typescript
import { getMediaDevices } from '@/lib/utils/helpers'

const { audioDevices, videoDevices } = await getMediaDevices()
```

---

## Environment Variables

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# WebSocket URLs
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3000
NEXT_PUBLIC_MEDIA_URL=http://localhost:5000

# Feature flags
NEXT_PUBLIC_ENABLE_RECORDING=false
NEXT_PUBLIC_ENABLE_CHAT=false
NEXT_PUBLIC_ENABLE_SCREEN_SHARE=true

# Analytics (optional)
NEXT_PUBLIC_GA_ID=
```

---

## Production Deployment

### Build

```bash
npm run build
```

### Configuration

1. **Update environment variables**
   - `NEXT_PUBLIC_API_URL`: Production backend URL
   - `NEXT_PUBLIC_SIGNALING_URL`: Production backend URL
   - `NEXT_PUBLIC_MEDIA_URL`: Production SFU URL

2. **Enable security headers**
   - Content-Security-Policy
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff

3. **Enable HTTPS only**
   - Cookies must have `secure` flag
   - CORS must match production domains

### Deployment Options

**Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Vercel** (Recommended for Next.js):
```bash
npm install -g vercel
vercel --prod
```

**Kubernetes**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exitmeet-frontend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: frontend
        image: exitmeet-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: https://api.example.com/api/v1
        - name: NEXT_PUBLIC_SIGNALING_URL
          value: https://api.example.com
        - name: NEXT_PUBLIC_MEDIA_URL
          value: https://media.example.com
```

---

## Known Limitations (MVP)

- ⚠️ **Video Grid**: Placeholder only, no actual remote video streaming yet
- ⚠️ **Screen Share**: Coordinated via signaling, not captured/streamed
- ⚠️ **Chat**: Not implemented
- ⚠️ **Recording UI**: No recording controls (backend has hooks)
- ⚠️ **Mobile**: Limited mobile UI (phase 3.1 improvement)
- ⚠️ **Accessibility**: No a11y enhancements yet (phase 3.2)

---

## Next Steps (Phase 3.1+)

### Video Streaming Implementation

1. Integrate mediasoup-client library
2. Implement actual RTCRtpReceiver for remote video
3. Update video grid with live remote streams
4. Add bitrate/quality controls

### Screen Sharing

1. Capture screen stream with getDisplayMedia()
2. Create separate producer for screen track
3. Handle screen share in video grid
4. Add stop screen share button

### Chat

1. Add Socket.IO namespace `/chat`
2. Create chat sidebar component
3. Store messages in MongoDB
4. Real-time message delivery

### Performance Tuning

1. Optimize re-renders with React.memo
2. Implement media throttling
3. Add bandwidth adaptation
4. Virtualize large participant lists

---

**Last Updated**: February 10, 2026

**Framework**: Next.js 14 + React 18 + TypeScript

**Status**: ✅ Phase 3 Frontend Scaffold Complete - Ready for media streaming implementation
