# Backend ↔ SFU Integration Specification

## Overview

This document defines the **contract** between the NestJS backend (control plane) and the Mediasoup SFU (media plane). They communicate through two channels:

1. **HTTP REST** (one-way): Backend issues tokens for client consumption
2. **JWT Validation** (one-way): SFU verifies tokens on connection
3. **Events/Logging** (optional): SFU notifies backend of media events

```
┌──────────────┐                ┌──────────────┐
│   Backend    │ --- Token --→  │    Client    │
│   (REST)     │  (REST/JWT)    │  (Browser)   │
└──────────────┘                └──────┬───────┘
                                       │
                                    Token
                                       │
                                       v
                              ┌──────────────┐
                              │     SFU      │
                              │ (Media Plane)│
                              └──────────────┘
```

## Token Issuance

### Backend Endpoint: `POST /api/v1/auth/login`

**Already Implemented** - Backend issues JWT after user authenticates.

```javascript
// Client Request
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

// Backend Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["participant"]
  }
}
```

### JWT Payload Structure

```typescript
{
  userId: "user-123",
  email: "user@example.com",
  roles: ["participant"],        // Guest, Participant, Host, Admin
  iat: 1707532800,               // Issued at
  exp: 1707619200                // Expires (24 hours later)
}
```

**Important**: Backend must use same `JWT_SECRET` in both services:
```bash
# backend/.env
JWT_SECRET=your-super-secret-key

# media/.env
JWT_SECRET=your-super-secret-key  # MUST match backend
```

## Client Connection Flow

### Step 1: Client Authenticates with Backend

```javascript
// Frontend (e.g., Next.js)
async function login(email, password) {
  const response = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  localStorage.setItem('token', data.accessToken);  // Store JWT
  return data.user;
}
```

### Step 2: Client Joins Meeting via Backend

```javascript
// Create or join meeting via backend
async function joinMeeting(meetingId) {
  const response = await fetch(`http://localhost:4000/api/v1/meetings/${meetingId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'John Doe' }),
  });

  const data = await response.json();
  return data.participantId;  // Gets participant record from backend
}
```

**Backend Response**:
```json
{
  "participantId": "participant-456",
  "meetingId": "meeting-abc123",
  "userId": "user-123",
  "name": "John Doe",
  "joinedAt": "2026-02-10T10:30:00Z"
}
```

### Step 3: Client Connects to SFU with JWT

```javascript
import { io } from 'socket.io-client';

// Get participant info from step 2
const { participantId } = await joinMeeting(meetingId);

// Connect to SFU with JWT
const mediaSocket = io('http://localhost:5000', {
  path: '/media',
  auth: {
    token: localStorage.getItem('token'),  // Same JWT from login
  },
});

mediaSocket.on('connect', () => {
  console.log('Connected to SFU');
  
  // Request router capabilities
  mediaSocket.emit('getRouterRtpCapabilities', { roomId: meetingId }, (response) => {
    if (response.success) {
      console.log('Codecs:', response.rtpCapabilities);
    }
  });

  // Join the media room
  mediaSocket.emit('joinRoom', { 
    roomId: meetingId,
    participantId: participantId,  // From backend join response
  });
});
```

### Step 4: SFU Validates Token

```typescript
// media/src/server.ts
io.on('connection', async (socket: Socket) => {
  const token = socket.handshake.auth?.token;

  try {
    const payload = this.authService.verifyToken(token);
    
    socket.data.userId = payload.userId;
    socket.data.email = payload.email;
    socket.data.roles = payload.roles;
    
    logger.info(`Client authenticated: ${payload.email}`);
  } catch (error) {
    logger.warn(`Auth failed: ${error.message}`);
    socket.disconnect();
  }
});
```

## Backend ↔ SFU Event Flow

### Signaling Coordination

The backend **signaling module** (Socket.IO namespace `/signaling`) communicates with the **media server** (WebSocket namespace `/media`) indirectly through participants. Here's the flow:

```
User A                Backend               SFU               User B
  │                     │                    │                 │
  ├─ Join Meeting ─────→ │                    │                 │
  │                      │                    │                 │
  │◄─ participantId ────│                    │                 │
  │                      │                    │                 │
  ├─ Connect to SFU ────────────────────────→│                 │
  │  (with JWT)          │                    │                 │
  │                      │                    │                 │
  │◄─────── Connected ───────────────────────│                 │
  │   (emit joinRoom)    │                    │                 │
  │                      │                    │                 │
  │◄─ Backend Notifies ──────────────────────│                 │
  │   (via ctrl plane)   │◄─ participantJoined                 │
  │                      │                    │                 │
  │◄──────────────────────────────────────────────────────────→│ Backend
  │                (WebRTC SDP Exchange)    │                  │ notifies
  │                                          │                  │ via
  │                                          │◄─ Join Meeting ─ Signaling
  │                                          │
  │                                          ├─ participantId
  │                                          │
  │                                          └─ Connect to SFU
  │                                             (with JWT)
  │
  └─ Media flowing via SFU ─ Media flowing via SFU ────────────→
```

### Meeting State Sync

Backend maintains the source of truth for meeting state. SFU has ephemeral state only.

```typescript
// Backend Meeting State (Persisted in MongoDB)
{
  _id: "meeting-abc123",
  title: "Team Standup",
  code: "ABC-123-XYZ",
  hostId: "user-123",
  status: "active",
  scheduledAt: "2026-02-10T10:00:00Z",
  duration: 3600,
  settings: { recording: true },
  participants: [
    {
      _id: "participant-456",
      userId: "user-123",
      name: "John",
      status: "active",
      audio: true,
      video: true,
    },
    {
      _id: "participant-789",
      userId: "user-124",
      name: "Jane",
      status: "active",
      audio: true,
      video: false,
    },
  ],
}

// SFU Room State (In-Memory, Ephemeral)
{
  roomId: "meeting-abc123",
  router: Router,
  participants: Map {
    "participant-456": {
      id: "participant-456",
      userId: "user-123",
      socketId: "socket-xyz",
      transports: Map { ... },
      producers: Map { ... },    // Audio, Video, Screen
      consumers: Map { ... },    // Receiving from others
      joinedAt: 2026-02-10T...,
    },
    "participant-789": { ... },
  },
}
```

## Integration Points

### 1. Backend Issues JWT for SFU Connection

**When**: User logs in or refreshes session

**Backend Action**:
```typescript
// backend/src/auth/auth.controller.ts
@Post('login')
async login(@Body() dto: LoginDto) {
  const user = await this.authService.login(dto.email, dto.password);
  
  // JWT valid for 24 hours (can be adjusted)
  const token = this.jwtService.sign({
    userId: user._id,
    email: user.email,
    roles: user.roles,
  });
  
  return { accessToken: token, user };
}
```

**Expected by SFU**:
- JWT can be verified with shared `JWT_SECRET`
- Contains `userId`, `email`, `roles`
- Expiry is checked at connection time

### 2. Backend Creates Meeting, SFU Accepts Participants

**When**: User creates or joins a meeting

**Backend Actions**:
```typescript
// backend/src/meetings/meetings.controller.ts
@Post(':id/join')
async joinMeeting(@Param('id') meetingId: string, @Body() dto: JoinMeetingDto) {
  // 1. Create Participant record in MongoDB
  const participant = await this.meetingsService.joinMeeting(meetingId, dto);
  
  // 2. Log audit event
  await this.auditService.log({
    actorId: userId,
    action: 'meeting.join',
    resource: 'meeting',
    resourceId: meetingId,
    metadata: { participantId: participant.id },
    success: true,
  });
  
  // 3. Notify via signaling (Socket.IO)
  this.signalingServer.to(meetingId).emit('userJoined', {
    participantId: participant.id,
    userId: participant.userId,
    name: participant.name,
  });
  
  // 4. Return participant info (client uses for SFU joinRoom)
  return participant;
}
```

**SFU Actions** (when client joins with JWT + participantId):
```typescript
// media/src/server.ts
socket.on('joinRoom', async ({ roomId, participantId }, callback) => {
  // 1. Verify JWT already done at connection
  // 2. Create router if needed (on-demand)
  const room = await this.routerManager.getOrCreateRoom(roomId);
  
  // 3. Add participant to room
  this.routerManager.addParticipant(roomId, {
    id: participantId,
    userId: socket.data.userId,  // From JWT
    socketId: socket.id,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
    joinedAt: new Date(),
  });
  
  // 4. Broadcast to others in the room
  socket.to(roomId).emit('participantJoined', {
    participantId,
    userId: socket.data.userId,
  });
  
  callback({ success: true });
});
```

### 3. Backend → Frontend: Notify of Media Events (Optional)

In future, SFU could push events **back to backend** for logging:

```typescript
// Future: SFU posts to backend webhooks
POST http://localhost:4000/events/media
{
  event: 'producer_created',
  roomId: 'meeting-abc123',
  participantId: 'participant-456',
  producerId: 'producer-xyz',
  kind: 'video',
  timestamp: '2026-02-10T...'
}

// Backend stores for analytics
```

**Not implemented in current version** - only needed if you want media analytics in MongoDB.

## Error Scenarios

### Invalid JWT

```
Client connects without token
  ↓
SFU rejects connection → socket.disconnect()
  ↓
Client should re-authenticate with backend
```

### Expired JWT

```
Client connects with expired token
  ↓
SFU verifies → jwt.verify() throws error
  ↓
SFU disconnects client
  ↓
Frontend should get new token from backend
```

### Participant Not Found in Backend

```
Client sends joinRoom with fake participantId
  ↓
SFU creates ephemeral participant record (no validation)
  ↓
Backend tracks the real participant separately
  ↓
If inconsistency detected → Audit log captures it
```

**Note**: SFU trusts the JWT. If backend issued a valid token, the participant exists.

### Room Cleanup

```
Last participant leaves room
  ↓
SFU waits 30 seconds (grace period for reconnect)
  ↓
If still empty → Delete room and close router
  ↓
Backend may have slightly stale participant list
  ↓
On next meeting query → Backend syncs from MongoDB
```

## Scaling Considerations

### Single Instance

```
Backend (port 4000)  ←→  SFU (port 5000)
  (1 instance)           (1 instance)
  - Auth                 - 4 workers
  - Meetings             - Room per meeting
  - Audit Logs
  - Rate Limiting
```

### Multiple Instances

```
┌─────────────┐         ┌─────────────┐
│  Backend 1  │         │  SFU 1      │
│  (port      |         │  (port      │
│   4000)     │         │   5000)     │
│             │         │             │
│  - Redis    │         │  - Workers  │
│  - Sessions │         │  - Rooms    │
└─────────────┘         └─────────────┘
       ↕                       ↕
┌─────────────┐         ┌─────────────┐
│  Backend 2  │         │  SFU 2      │
│  (port      │         │  (port      │
│   4001)     │         │   5001)     │
└─────────────┘         └─────────────┘
       ↕                       ↕
┌─────────────┐         ┌─────────────┐
│   MongoDB   │         │  SFU N      │
│             │         │             │
│  Shared     │         │  Stateless  │
│  Source of  │         │  Load       │
│  Truth      │         │  Balanced   │
└─────────────┘         └─────────────┘
```

**Key Points**:
- Backend instances share MongoDB (single source of truth)
- SFU instances are stateless (can scale independently)
- Client doesn't care which SFU instance it connects to
- Use sticky sessions (ip_hash) in load balancer

## Testing the Integration

### Manual Test Flow

```bash
# Terminal 1: Start Backend
cd backend
npm run start:dev

# Terminal 2: Start SFU
cd media
npm run start:dev
```

### Test Script

```javascript
// test-integration.js
const axios = require('axios');
const { io } = require('socket.io-client');

const BACKEND_URL = 'http://localhost:4000';
const SFU_URL = 'http://localhost:5000';

async function testIntegration() {
  try {
    // 1. Login to backend
    const loginRes = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'test@example.com',
      password: 'password',
    });
    
    const token = loginRes.data.accessToken;
    console.log('✓ Logged in, token:', token.substring(0, 20) + '...');

    // 2. Create meeting
    const meetingRes = await axios.post(
      `${BACKEND_URL}/api/v1/meetings`,
      { title: 'Test Meeting' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const meetingId = meetingRes.data._id;
    console.log('✓ Created meeting:', meetingId);

    // 3. Join meeting
    const joinRes = await axios.post(
      `${BACKEND_URL}/api/v1/meetings/${meetingId}/join`,
      { name: 'Test User' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const participantId = joinRes.data.participantId;
    console.log('✓ Joined meeting, participantId:', participantId);

    // 4. Connect to SFU
    const socket = io(SFU_URL, {
      path: '/media',
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('✓ Connected to SFU');

      // 5. Request router capabilities
      socket.emit('getRouterRtpCapabilities', { roomId: meetingId }, (res) => {
        if (res.success) {
          console.log('✓ Got router capabilities');
          
          // 6. Join room
          socket.emit('joinRoom', { roomId: meetingId, participantId }, (res) => {
            if (res.success) {
              console.log('✓ Joined room successfully!');
              console.log('Integration test PASSED ✓');
              process.exit(0);
            }
          });
        }
      });
    });

    socket.on('error', (err) => {
      console.error('✗ Error:', err);
      process.exit(1);
    });

    setTimeout(() => {
      console.error('✗ Timeout');
      process.exit(1);
    }, 5000);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

testIntegration();
```

Run:
```bash
node test-integration.js
```

## Deployment Checklist

- [ ] Backend and SFU have **identical JWT_SECRET**
- [ ] SFU `MEDIASOUP_ANNOUNCED_IP` set to **public IP** or **domain**
- [ ] `CORS_ORIGINS` includes **frontend domain**
- [ ] Backend `/auth/login` returns **valid JWT**
- [ ] SFU verifies JWT on connection
- [ ] SFU has adequate **port range** (40000-49999)
- [ ] Load balancer uses **sticky sessions** for SFU
- [ ] **Firewall** allows WebRTC ports (40000-49999)
- [ ] Monitoring logs from both services
- [ ] Health checks: `GET /health` on both services

---

**Status**: ✅ Integration contract fully specified. Frontend implementation ready to proceed.
