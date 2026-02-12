# ExitMeet Backend - Control Plane Implementation

## Overview

Production-ready NestJS backend for ExitMeet video conferencing platform with complete authentication, meeting management, real-time signaling, and audit logging.

## Architecture

```
backend/
├── src/
│   ├── main.ts                 # Bootstrap with /api/v1 prefix
│   ├── app.module.ts            # Root module
│   ├── auth/                    # JWT authentication + OAuth 2.0 (future)
│   │   ├── auth.controller.ts   # POST /auth/register, /auth/login
│   │   ├── auth.service.ts      # Password hashing, JWT issuance
│   │   ├── jwt.strategy.ts      # Passport JWT validation
│   │   └── dto/                 # RegisterDto, LoginDto
│   ├── users/                   # User management
│   │   ├── users.controller.ts  # GET /users/me
│   │   ├── users.service.ts     # CRUD operations
│   │   └── schemas/user.schema.ts
│   ├── meetings/                # Meeting lifecycle
│   │   ├── meetings.controller.ts  # POST /meetings, /meetings/:id/join, /leave
│   │   ├── meetings.service.ts     # Create, join, leave with audit logs
│   │   └── schemas/
│   │       ├── meeting.schema.ts     # title, code, hostId, status
│   │       └── participant.schema.ts # meetingId, userId, role, media state
│   ├── signaling/               # WebRTC signaling (Socket.IO)
│   │   ├── signaling.gateway.ts # WebSocket events: join, leave, offer, answer, ICE
│   │   ├── signaling.service.ts # Presence tracking (in-memory)
│   │   └── dto/signaling-events.dto.ts
│   ├── audit/                   # Compliance logging
│   │   ├── audit.service.ts     # Write audit_logs to MongoDB
│   │   └── schemas/audit-log.schema.ts
│   ├── redis/                   # Caching, pub/sub, rate limiting
│   │   ├── redis.service.ts     # ioredis wrapper (KV, sets, sorted sets, pub/sub)
│   │   └── redis.module.ts      # Global module
│   └── common/
│       ├── guards/
│       │   ├── jwt-auth.guard.ts   # Protect REST endpoints
│       │   └── rate-limit.guard.ts # Redis-backed rate limiting
│       ├── decorators/
│       │   └── rate-limit.decorator.ts
│       ├── interfaces/
│       │   └── request-user.interface.ts
│       └── utils/
│           └── password.ts         # bcrypt hash/verify
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

## Features Implemented

### ✅ Phase 1: Control Plane (Complete)

#### Authentication Module
- **User Registration**: Email + password with bcrypt hashing (10 salt rounds)
- **Login**: JWT issuance (3600s expiry) with audit logging
- **JWT Strategy**: Passport-based authentication for REST and WebSocket
- **Rate Limiting**: 
  - Register: 5 attempts per hour
  - Login: 10 attempts per 15 minutes (prevents brute force)

#### Users Module
- **User Schema**: Email (unique), name, passwordHash, roles[]
- **Endpoints**:
  - `GET /api/v1/users/me` - Get current user profile (JWT protected)

#### Meetings Module
- **Meeting Schema**: title, code (3-part auto-generated), hostId, scheduledAt, duration, status, settings
- **Participant Schema**: meetingId, userId, name, role, status, audio, video, screenSharing, joinedAt, leftAt
- **Endpoints**:
  - `POST /api/v1/meetings` - Create meeting (JWT protected)
  - `POST /api/v1/meetings/:id/join` - Join meeting (creates participant record)
  - `POST /api/v1/meetings/:id/leave/:participantId` - Leave meeting
- **Audit Integration**: All create/join/leave actions logged to audit_logs

#### Signaling Module (WebSocket)
- **Gateway**: Socket.IO `/signaling` namespace with JWT auth
- **Events**:
  - `join-meeting` - Add participant to room, broadcast presence
  - `leave-meeting` - Remove participant, notify others
  - `offer` / `answer` - Forward WebRTC SDP between peers
  - `ice-candidate` - Forward ICE candidates for NAT traversal
  - `media-state` - Audio/video/screen sharing toggle with broadcast
  - `meeting-state-sync` - Get current participant list
- **Presence Tracking**: In-memory participant state (audio, video, screenSharing)
- **Redis Adapter**: Socket.IO pub/sub for multi-instance deployments
- **Audit Logging**: Join/leave events written to audit_logs

#### Audit Module
- **Schema**: orgId (optional), actorId, actorIP, actorUserAgent, action, resource, resourceId, timestamp, metadata, success, errorMessage
- **Indexes**: orgId+timestamp, actorId+timestamp, action+timestamp
- **Usage**: All auth, meeting, and signaling actions logged for compliance

#### Redis Module
- **Client Wrapper**: ioredis with connection pooling and retry logic
- **Operations**:
  - Key-value caching with TTL
  - Hash operations (structured data)
  - Set/sorted set operations (membership, leaderboards)
  - Pub/sub for multi-instance coordination
  - Atomic operations (INCR, DECR for rate limiting)
- **Pub/Sub**: Separate publisher/subscriber clients for Socket.IO adapter
- **Rate Limiting**: Redis-backed sliding window counter

#### Rate Limiting
- **Guard**: `RateLimitGuard` with Redis storage
- **Decorator**: `@RateLimit({ limit, windowSeconds })`
- **Algorithm**: Sliding window with INCR + TTL
- **Fail-Open**: Allows requests if Redis is down (logs error)
- **Applied To**:
  - Auth register: 5 req/hour
  - Auth login: 10 req/15min

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10 (TypeScript)
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis 7+ (ioredis client)
- **WebSocket**: Socket.IO 4 with Redis adapter
- **Authentication**: JWT (passport-jwt), bcrypt
- **Validation**: class-validator, class-transformer

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your MongoDB and Redis URLs
nano .env
```

## Environment Variables

```dotenv
PORT=4000
MONGODB_URI=mongodb://localhost:27017/exitmeet
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=3600s
CORS_ORIGINS=*
CLIENT_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

## Running the Application

```bash
# Development with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
  - Body: `{ email, password, name }`
  - Rate limit: 5/hour
- `POST /api/v1/auth/login` - Login
  - Body: `{ email, password }`
  - Rate limit: 10/15min
  - Returns: `{ accessToken, user }`

### Users
- `GET /api/v1/users/me` - Get current user (requires JWT)

### Meetings
- `POST /api/v1/meetings` - Create meeting (requires JWT)
  - Body: `{ title, scheduledAt?, duration?, settings? }`
  - Returns: Meeting with auto-generated code
- `POST /api/v1/meetings/:id/join` - Join meeting (requires JWT)
  - Body: `{ name, role? }`
  - Returns: Participant record
- `POST /api/v1/meetings/:id/leave/:participantId` - Leave meeting (requires JWT)

### WebSocket (Socket.IO)
- **Namespace**: `/signaling`
- **Auth**: Pass JWT in handshake: `{ auth: { token: 'your-jwt' } }`
- **Events**:
  - Emit: `join-meeting`, `leave-meeting`, `offer`, `answer`, `ice-candidate`, `media-state`, `meeting-state-sync`
  - Listen: `participant-joined`, `participant-left`, `participant-updated`, `offer`, `answer`, `ice-candidate`, `meeting-state`

## WebSocket Client Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/signaling', {
  auth: { token: 'your-jwt-token' }
});

// Join a meeting
socket.emit('join-meeting', {
  meetingId: '507f1f77bcf86cd799439011',
  participantId: '507f1f77bcf86cd799439012'
});

// Listen for other participants joining
socket.on('participant-joined', (data) => {
  console.log('New participant:', data);
});

// Send WebRTC offer to another peer
socket.emit('offer', {
  meetingId: 'meeting-id',
  participantId: 'your-participant-id',
  targetParticipantId: 'peer-participant-id',
  sdp: rtcPeerConnection.localDescription
});

// Receive WebRTC offer from another peer
socket.on('offer', async ({ participantId, sdp }) => {
  await rtcPeerConnection.setRemoteDescription(sdp);
  const answer = await rtcPeerConnection.createAnswer();
  await rtcPeerConnection.setLocalDescription(answer);
  
  socket.emit('answer', {
    meetingId: 'meeting-id',
    participantId: 'your-participant-id',
    targetParticipantId: participantId,
    sdp: answer
  });
});
```

## MongoDB Indexes (Manual Setup)

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true });

// Meetings collection
db.meetings.createIndex({ code: 1 }, { unique: true });
db.meetings.createIndex({ hostId: 1 });

// Participants collection
db.participants.createIndex({ meetingId: 1 });
db.participants.createIndex({ userId: 1 });

// Audit logs collection
db.audit_logs.createIndex({ orgId: 1, timestamp: -1 });
db.audit_logs.createIndex({ actorId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1, timestamp: -1 });
```

## Multi-Instance Deployment

The backend is ready for horizontal scaling:

1. **Redis Adapter**: Socket.IO uses Redis pub/sub to sync events across instances
2. **Stateless REST**: All session state in JWT or Redis
3. **Distributed Rate Limiting**: Redis-backed counters shared across instances

Example with 3 instances:
```bash
# Instance 1
PORT=4001 npm run start:prod

# Instance 2
PORT=4002 npm run start:prod

# Instance 3
PORT=4003 npm run start:prod

# Nginx load balancer
# Use sticky sessions (ip_hash) for WebSocket connections
```

## Security Features

- **JWT Authentication**: All sensitive endpoints protected
- **Password Hashing**: bcrypt with 10 salt rounds
- **Rate Limiting**: Redis-backed to prevent abuse
- **Audit Logging**: All critical actions logged with actor, IP, user agent
- **CORS**: Configurable origins (default: *)
- **Validation**: DTOs with class-validator for input sanitization
- **WebSocket Auth**: JWT verification before allowing Socket.IO connections

## Next Steps (Phase 2: Media Plane)

- [ ] Mediasoup SFU integration (separate media server)
- [ ] STUN/TURN server configuration
- [ ] Recording service (save to S3/MinIO)
- [ ] Frontend Next.js application with WebRTC client
- [ ] Chat module (WebSocket + MongoDB)
- [ ] Screen sharing coordination
- [ ] Kubernetes deployment manifests
- [ ] Prometheus metrics + Grafana dashboards

## License

Private - ExitMeet Project
