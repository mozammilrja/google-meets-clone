# ExitMeet Media Server - SFU Architecture Guide

## Overview

The Media Server is a **stateless, production-ready Mediasoup SFU** (Selective Forwarding Unit) that handles real-time media routing using WebRTC. It operates independently from the control plane backend, communicating only via JWT tokens and WebSocket events.

## Architecture Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                      ExitMeet Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Control Plane (Backend)                Media Plane (SFU)      │
│  ├─ NestJS REST API                    ├─ Mediasoup Workers   │
│  ├─ Socket.IO Signaling                ├─ WebRTC Transports   │
│  ├─ Meeting Management                 ├─ Producer/Consumer   │
│  ├─ Audit Logs                         ├─ Recording Hooks     │
│  ├─ Rate Limiting (Redis)              └─ Statistics          │
│  └─ User Auth (JWT)                                            │
│                                                                 │
│  ┌─ Token Handoff ─────────────────────────────────────────┐   │
│  │ Backend issues JWT → Client sends JWT → SFU verifies    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Decisions

1. **Stateless SFU**: All state (participants, producers, consumers) is ephemeral
   - No database persistence
   - No replication needed
   - Easy horizontal scaling

2. **Token-Based Auth**: JWT handoff from backend prevents unauthorized access
   - Single source of truth: backend issues tokens
   - SFU only verifies signatures
   - Token expiry managed by backend

3. **Separation of Concerns**:
   - **Backend**: User management, meeting creation, audit logging
   - **SFU**: Media routing only (no business logic)

4. **Production-Ready**:
   - Worker pool for CPU load balancing
   - Graceful shutdown handling
   - Structured logging (pino)
   - Health checks and metrics

## Folder Structure

```
media/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MediaServer orchestrator
│   ├── config.ts                   # Configuration management
│   │
│   ├── mediasoup/
│   │   ├── worker-manager.ts       # Worker pool lifecycle
│   │   └── router-manager.ts       # Room/router state
│   │
│   ├── handlers/
│   │   ├── transport.handler.ts    # WebRTC transport lifecycle
│   │   ├── producer.handler.ts     # Media producers (sending)
│   │   └── consumer.handler.ts     # Media consumers (receiving)
│   │
│   ├── services/
│   │   ├── auth.service.ts         # JWT verification
│   │   └── recording.service.ts    # Recording hooks (no storage yet)
│   │
│   └── utils/
│       └── logger.ts               # Structured logging (pino)
│
├── package.json
├── tsconfig.json
├── .env.example
└── README.md                       # This file
```

## Mediasoup Worker Lifecycle

### Startup Sequence

```typescript
1. Application Start
   ↓
2. Create Worker Pool (N workers based on CPU count)
   ├─ Each worker is a separate Node.js process
   ├─ Handles RTC media processing
   └─ Listens on port range (40000-49999)
   ↓
3. Initialize RouterManager
   ├─ Empty room map
   └─ Ready to accept clients
   ↓
4. Start WebSocket Server (port 5000)
   ├─ Listen for JWT authentication
   ├─ Route events to handlers
   └─ Broadcast state changes
```

### Room Creation (On-Demand)

```typescript
Client connects to room "abc123"
   ↓
RouterManager.getOrCreateRoom("abc123")
   ├─ Check if room exists → reuse
   └─ If not, allocate new room:
      ├─ Pick next available worker (round-robin)
      ├─ Create Router on worker
      ├─ Configure media codecs
      └─ Store in room map
   ↓
Router ready for participants
```

### Participant Lifecycle

```typescript
1. Join Room
   ├─ Verify JWT token
   ├─ Create participant record
   ├─ Store in room.participants map
   └─ Notify others (participantJoined event)

2. Create Transport (send/recv)
   ├─ Create WebRtcTransport
   ├─ Return ICE/DTLS parameters
   └─ Store in participant.transports map

3. Connect Transport (after ICE handshake)
   ├─ Exchange DTLS parameters
   └─ Transport ready for media

4. Produce (send media)
   ├─ Create producer on send transport
   ├─ Notify others (newProducer event)
   └─ Others can consume this stream

5. Consume (receive media)
   ├─ Create consumer on recv transport
   ├─ Start paused
   └─ Client resumes after setup

6. Leave Room / Disconnect
   ├─ Close all transports
   ├─ Remove participant record
   ├─ Notify others (participantLeft event)
   └─ If room empty → schedule cleanup (30s delay)
```

### Shutdown Sequence

```typescript
1. SIGINT/SIGTERM received
   ↓
2. Stop accepting new connections
   ↓
3. Close all active rooms (cleanup transports)
   ↓
4. Close all workers
   ↓
5. Graceful exit
```

## Token-Based Auth Handoff

### Backend → SFU Token Flow

```
┌────────────┐                  ┌────────────┐                  ┌────────────┐
│   Client   │                  │  Backend   │                  │    SFU     │
│            │                  │            │                  │            │
│ 1. Login   │─────────────────→│            │                  │            │
│            │                  │            │                  │            │
│ 2. JWT ←───┼──────────────────│ issue JWT  │                  │            │
│            │                  │            │                  │            │
│ 3. Connect │                  │            │                  │            │
│    to SFU  │                  │            │                  │            │
│    + JWT   │─────────────────────────────────────────────────→│ verify JWT │
│            │                  │            │                  │ payload    │
│    OK ←───────────────────────────────────────────────────────│ Extract:   │
│            │                  │            │                  │ - userId   │
│            │                  │            │                  │ - email    │
│            │                  │            │                  │ - roles    │
└────────────┘                  └────────────┘                  └────────────┘

JWT Secret: Shared between backend and SFU (environment variable)
Expiry: 24 hours (can be set per-device)
```

### JWT Verification in SFU

```typescript
// /media/src/services/auth.service.ts

verifyToken(token: string): JwtPayload {
  // Verify signature using shared secret
  const payload = jwt.verify(token, JWT_SECRET);
  
  // Extract user info
  return {
    userId: payload.userId,
    email: payload.email,
    roles: payload.roles,
    iat: payload.iat,
    exp: payload.exp,
  };
}

// Result stored in socket.data for entire session
socket.data.userId = payload.userId;
socket.data.email = payload.email;
```

## WebSocket Events Specification

### Connection Life Cycle

#### `connection` (Automatic)
Client connects to `/media` namespace with JWT in auth header.

```javascript
// Client
const socket = io('http://localhost:5000', {
  path: '/media',
  auth: { token: 'your-jwt' },
});

// Server validates: If invalid → disconnect immediately
```

### Room Management

#### `getRouterRtpCapabilities` (Request-Response)
Client requests the router's media capabilities to validate codecs.

```javascript
// Client
socket.emit('getRouterRtpCapabilities', { roomId: 'abc123' }, (response) => {
  if (response.success) {
    console.log('Codecs:', response.rtpCapabilities);
  }
});

// Server Response
{
  success: true,
  rtpCapabilities: {
    codecs: [
      { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      { mimeType: 'video/VP8', clockRate: 90000 },
      { mimeType: 'video/h264', clockRate: 90000 },
    ],
    headerExtensions: [...],
    fecMechanisms: [],
  }
}
```

#### `joinRoom` (Request-Response)
Client joins a room (meeting).

```javascript
// Client
socket.emit('joinRoom', 
  { 
    roomId: 'abc123',
    participantId: 'participant-456'  // From backend Participant record
  },
  (response) => {
    if (response.success) {
      console.log('Joined room');
    }
  }
);

// Server Actions
// - Create/reuse room
// - Add participant to room
// - Join Socket.IO room for broadcasting
// - Broadcast 'participantJoined' to others
```

#### `participantJoined` (Server → Client Broadcast)
Notifies all participants when someone joins.

```javascript
// Server broadcasts to room
socket.to(roomId).emit('participantJoined', {
  participantId: 'participant-456',
  userId: 'user-123',
});
```

### Transport Management

#### `createTransport` (Request-Response)
Create a WebRTC transport (send or receive direction).

```javascript
// Client
socket.emit('createTransport',
  {
    roomId: 'abc123',
    participantId: 'participant-456',
    direction: 'send',  // or 'recv'
  },
  (response) => {
    if (response.success) {
      const transport = response.transport;
      // transport: { id, iceParameters, iceCandidates, dtlsParameters }
    }
  }
);

// Server Response
{
  success: true,
  transport: {
    id: 'transport-abc',
    iceParameters: {
      usernameFragment: 'xxx',
      password: 'yyy',
    },
    iceCandidates: [
      { candidate: 'candidate:...', sdpMLineIndex: 0, sdpMid: '0' },
    ],
    dtlsParameters: {
      role: 'auto',
      fingerprints: [
        { algorithm: 'sha-256', value: 'xxx' },
      ],
    },
  }
}
```

#### `connectTransport` (Request-Response)
Complete ICE/DTLS handshake after client gathers candidates.

```javascript
// Client (after client-side ICE gathering/DTLS parameter setup)
socket.emit('connectTransport',
  {
    transportId: 'transport-abc',
    dtlsParameters: { /* client's DTLS params */ },
  },
  (response) => {
    if (response.success) {
      console.log('Transport connected');
    }
  }
);
```

### Media Production (Sending)

#### `produce` (Request-Response)
Client sends media (audio/video/screen).

```javascript
// Client
socket.emit('produce',
  {
    transportId: 'transport-abc',
    kind: 'video',  // or 'audio'
    rtpParameters: { /* WebRTC RTP params */ },
    appData: {
      type: 'camera',  // or 'screen'
      label: 'HD Camera',
    },
  },
  (response) => {
    if (response.success) {
      console.log('Producer created:', response.producerId);
    }
  }
);

// Server Actions
// - Create Producer on transport
// - Store in participant.producers map
// - Start recording (if enabled)
// - Broadcast 'newProducer' to other participants
```

#### `newProducer` (Server → Client Broadcast)
Notifies others when a participant starts producing media.

```javascript
// Server broadcasts to room
socket.to(roomId).emit('newProducer', {
  participantId: 'participant-456',
  producerId: 'producer-xyz',
  kind: 'video',
  appData: { type: 'camera', label: 'HD Camera' },
});

// Other clients now decide if they want to consume this stream
```

#### `closeProducer` (Request-Response)
Client stops sending media (e.g., turns off camera).

```javascript
// Client
socket.emit('closeProducer',
  { producerId: 'producer-xyz' },
  (response) => {
    if (response.success) {
      console.log('Producer closed');
    }
  }
);

// Server Actions
// - Stop recording
// - Close producer
// - Broadcast 'producerClosed' to others
```

#### `producerClosed` (Server → Client Broadcast)
Notifies others when a producer stops.

```javascript
socket.to(roomId).emit('producerClosed', {
  participantId: 'participant-456',
  producerId: 'producer-xyz',
});
```

### Media Consumption (Receiving)

#### `consume` (Request-Response)
Client receives media from another participant.

```javascript
// Client
socket.emit('consume',
  {
    producerId: 'producer-xyz',  // From another participant
    rtpCapabilities: { /* client's RTP capabilities */ },
  },
  (response) => {
    if (response.success) {
      const consumer = response.consumer;
      // consumer: { id, producerId, kind, rtpParameters }
    }
  }
);

// Server Actions
// - Find producer (from any participant)
// - Check codec compatibility
// - Create Consumer on client's recv transport (starts paused)
// - Store in participant.consumers map
```

#### `resumeConsumer` (Request-Response)
Client indicates it's ready to receive and resumes consumer.

```javascript
// Client
socket.emit('resumeConsumer',
  { consumerId: 'consumer-abc' },
  (response) => {
    if (response.success) {
      console.log('Consumer resumed, media flowing');
    }
  }
);
```

### Connection Termination

#### `disconnect` (Automatic)
Socket.IO automatic event when client disconnects.

```javascript
// Server automatically handles:
// - Remove participant from room
// - Close all transports
// - Close all producers/consumers
// - Broadcast 'participantLeft' to others
// - Schedule room cleanup if empty
```

#### `participantLeft` (Server → Client Broadcast)
Notifies others when a participant leaves.

```javascript
socket.to(roomId).emit('participantLeft', {
  participantId: 'participant-456',
});
```

## Error Handling

### JWT Errors
```typescript
// Invalid token → Immediate disconnect
socket.disconnect();

// Expired token → Emit error, client must re-authenticate
{
  success: false,
  error: 'Token expired',
}
```

### Media Errors
```typescript
// Codec mismatch → Cannot consume
{
  success: false,
  error: 'Cannot consume this producer - incompatible capabilities',
}

// Transport not found → General network error
{
  success: false,
  error: 'Transport not found',
}
```

## Recording Integration

### Current Status: **Placeholder Hooks**

```typescript
// When producer is created
await recordingService.startRecording(producerId, {
  roomId,
  participantId,
  userId,
  kind: 'audio' | 'video' | 'screen',
});

// When producer is stopped
await recordingService.stopRecording(producerId);

// Returns metadata
{
  roomId,
  participantId,
  userId,
  kind,
  startedAt,
  stoppedAt,
  filePath,  // Will be set after storage integration
}
```

### Future Implementation

1. **Create PlainTransport** for recording
2. **Pipe Producer** to PlainTransport
3. **Launch FFmpeg** to consume RTP
4. **Transcode** to H.264/AAC/MP4
5. **Upload to S3/MinIO**
6. **Store metadata** in MongoDB

## Configuration

### Environment Variables

```dotenv
# Server
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

# JWT (must match backend)
JWT_SECRET=your-secret-key-change-in-prod

# Mediasoup Workers
MEDIASOUP_NUM_WORKERS=4          # Auto: CPU count
MEDIASOUP_WORKER_LOG_LEVEL=warn  # info, warn, error
MEDIASOUP_WORKER_LOG_TAGS=info,ice,dtls,rtp,srtp,rtcp

# WebRTC Configuration
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1  # Set to public IP in production
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999

# CORS
CORS_ORIGINS=http://localhost:3000,https://exitmeet.com

# Recording
RECORDING_ENABLED=false
RECORDING_PATH=/tmp/recordings
```

## Installation & Deployment

### Install Dependencies

```bash
cd media
npm install
```

### Development

```bash
npm run start:dev    # Hot reload with ts-node-dev
```

### Production Build

```bash
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled JavaScript
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Docker Deployment (Example)

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

```bash
# Build image
docker build -t exitmeet-media:latest .

# Run container
docker run -d \
  -p 5000:5000 \
  -e JWT_SECRET=your-secret \
  -e MEDIASOUP_ANNOUNCED_IP=media-server.example.com \
  exitmeet-media:latest
```

## Health Checks & Monitoring

### Health Endpoint

```bash
curl http://localhost:5000/health
# Response: { "status": "ok", "timestamp": "2026-02-10T..." }
```

### Statistics Endpoint

```bash
curl http://localhost:5000/stats
# Response:
# {
#   "workers": 4,
#   "rooms": {
#     "totalRooms": 2,
#     "rooms": [
#       { "id": "abc123", "participantCount": 3, "createdAt": "..." },
#       { "id": "def456", "participantCount": 1, "createdAt": "..." }
#     ]
#   }
# }
```

### Logging

```typescript
// All events logged with pino (structured JSON)
[INFO] Client authenticated { socketId: 'xxx', userId: 'user-123' }
[DEBUG] Producer score { producerId: 'producer-xyz', score: [...] }
[ERROR] Error in produce { error: 'Transport not found' }
```

## Multi-Instance Deployment

### Load Balancing Strategy

```
┌─────────────────┐
│   Load Balancer │
│  (sticky IP)    │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │          │          │          │
    v          v          v          v
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ SFU 1 │ │ SFU 2 │ │ SFU 3 │ │ SFU 4 │
│:5001  │ │:5002  │ │:5003  │ │:5004  │
└───────┘ └───────┘ └───────┘ └───────┘
```

**Important**: Use **sticky sessions** (IP hash) for WebSocket connections so clients reconnect to the same SFU instance.

### Scaled Deployment

```bash
# Instance 1
PORT=5001 START_PORT_RANGE=40000 npm start

# Instance 2
PORT=5002 START_PORT_RANGE=41000 npm start

# Instance 3
PORT=5003 START_PORT_RANGE=42000 npm start

# Configure Nginx upstream
upstream media_servers {
  hash $client_addr consistent;  # Sticky sessions
  server localhost:5001;
  server localhost:5002;
  server localhost:5003;
}

server {
  listen 5000;
  location / {
    proxy_pass http://media_servers;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Performance Tuning

### Worker Pool

```typescript
// Default: CPU count (optimal)
// For I/O-bound: Can exceed CPU count
// For compute-bound: Keep at CPU count

MEDIASOUP_NUM_WORKERS=8  // For 8+ core machine
```

### Port Range

```typescript
// Default: 40000-49999 (10,000 ports)
// Supports: ~5,000 concurrent participants per instance
// Scale across instances for more participants

MEDIASOUP_MAX_PORT=59999  // Larger range if needed
```

### Bitrate Limits

```typescript
// Send (upload from client)
initialAvailableOutgoingBitrate: 1000000  // 1 Mbps

// Receive (download to client)
maxIncomingBitrate: 1500000  // 1.5 Mbps
```

## Security Considerations

1. **JWT Secret**: Must be identical between backend and SFU
   ```bash
   # Generate strong secret
   openssl rand -base64 32
   ```

2. **Network**: SFU should be on private network
   ```bash
   # Only expose via load balancer
   MEDIASOUP_LISTEN_IP=127.0.0.1
   ```

3. **DTLS-SRTP**: Automatic encryption for all media
   - No need for additional TLS/HTTPS on media streams

4. **Token Expiry**: Should match or be shorter than server timeout
   ```typescript
   // Backend (auth)
   signOptions: { expiresIn: '24h' }
   
   // SFU will verify expiry at connection time
   ```

## Development Workflow

### 1. Make Code Changes
```bash
npm run start:dev
# Auto-recompiles on save
```

### 2. Test Locally
```typescript
// client.js
const { io } = require('socket.io-client');

const socket = io('http://localhost:5000', {
  path: '/media',
  auth: { token: 'test-jwt' },
});

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('getRouterRtpCapabilities', { roomId: 'test' }, console.log);
});
```

### 3. Build for Production
```bash
npm run build
# Output: dist/ folder
```

### 4. Verify Build
```bash
node dist/index.js
# Should start without errors
```

## Troubleshooting

### "Worker died" error
```
→ Usually out of memory or port exhaustion
→ Increase available ports or add instance
```

### JWT verification failed
```
→ JWT_SECRET mismatch between backend and SFU
→ Verify both have same secret in .env
```

### Codec incompatibility
```
→ Client RTP capabilities don't match router codecs
→ Ensure client browser supports VP8/H.264/Opus
```

### High latency
```
→ Check MEDIASOUP_ANNOUNCED_IP (must be reachable)
→ May need STUN/TURN server configuration
→ Check network between client and SFU
```

## Next Steps

1. **Wire Backend Signaling → SFU**
   - Backend signals participant.room transitions
   - SFU receives join/leave events
   - Validates tokens

2. **Frontend Client**
   - Authenticate with backend
   - Get JWT token
   - Connect to SFU with token
   - Implement WebRTC client

3. **Recording Pipeline**
   - Implement FFmpeg integration
   - Add S3/MinIO support
   - Store metadata in MongoDB

4. **Monitoring & Observability**
   - Prometheus metrics (RTP stats, participant count)
   - Grafana dashboards
   - Loki log aggregation

---

**Architecture Review**: ✅ Stateless, scalable, production-ready SFU with token-based auth and clean separation from control plane.
