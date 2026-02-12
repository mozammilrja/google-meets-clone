# Mediasoup SFU Architecture - Quick Reference

## System Diagram

```
┌─────────────────────────────────── ExitMeet Platform ──────────────────────────────────┐
│                                                                                         │
│                  Control Plane (NestJS)              Media Plane (Mediasoup)           │
│  ┌──────────────────────────────────┐             ┌──────────────────────────────┐   │
│  │        Backend (port 4000)       │             │     SFU (port 5000)          │   │
│  ├──────────────────────────────────┤             ├──────────────────────────────┤   │
│  │  ✓ REST API (/api/v1)            │             │  ✓ Worker Pool (N workers)   │   │
│  │  ✓ Socket.IO Signaling (/ctrl)   │             │  ✓ Router per Room           │   │
│  │  ✓ Meeting Management            │    JWT      │  ✓ Transports / Producers    │   │
│  │  ✓ User Auth (JWT)               ├────────────→│  ✓ Consumers                 │   │
│  │  ✓ Audit Logs                    │             │  ✓ Stateless                 │   │
│  │  ✓ Rate Limiting (Redis)         │             │  ✓ Recording Hooks           │   │
│  │  ✓ Database: MongoDB             │             │  ✓ Statistics & Monitoring   │   │
│  │  ✓ Cache: Redis                  │             │                              │   │
│  └──────────────────────────────────┘             └──────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

| Principle | Backend | SFU |
|-----------|---------|-----|
| **State** | Persistent (MongoDB) | Ephemeral (memory) |
| **Scale** | Stateful (shared DB) | Stateless (horizontal) |
| **Auth** | Issues JWT | Verifies JWT |
| **Coordination** | Centralized | None (no cluster mode) |
| **Business Logic** | All rules | None (pure routing) |
| **Failover** | Automatic (shared DB) | Participants reconnect to any instance |

## Component Breakdown

### Backend (Control Plane)

```
backend/src/
├── main.ts                    # Bootstrap, /api/v1 prefix
├── app.module.ts              # Root module, imports all
│
├── auth/                      # User authentication
│   ├── auth.controller.ts     # POST /auth/register, /login
│   ├── auth.service.ts        # Password hashing, JWT issuance
│   ├── jwt.strategy.ts        # Passport JWT validation
│   └── dto/                   # RegisterDto, LoginDto
│
├── users/                     # User management
│   ├── users.controller.ts    # GET /users/me
│   ├── users.service.ts       # User CRUD
│   └── schemas/user.schema.ts # Email, name, roles, hash
│
├── meetings/                  # Meeting lifecycle
│   ├── meetings.controller.ts # CRUD endpoints
│   ├── meetings.service.ts    # Create, join, leave
│   └── schemas/
│       ├── meeting.schema.ts      # Title, code, host, status
│       └── participant.schema.ts # User tracking in meeting
│
├── signaling/                 # WebRTC control signaling
│   ├── signaling.gateway.ts  # Socket.IO namespace /signaling
│   ├── signaling.service.ts  # Presence tracking (ephemeral)
│   └── dto/signaling-events.dto.ts
│
├── audit/                     # Compliance logging
│   ├── audit.service.ts       # Write audit_logs
│   └── schemas/audit-log.schema.ts
│
├── redis/                     # Caching + pub/sub
│   ├── redis.service.ts       # Wrapper around ioredis
│   └── redis.module.ts
│
└── common/
    ├── guards/
    │   ├── jwt-auth.guard.ts     # Protect REST endpoints
    │   └── rate-limit.guard.ts   # Redis-backed rate limiting
    ├── decorators/
    │   └── rate-limit.decorator.ts
    ├── interfaces/
    └── utils/password.ts
```

### SFU (Media Plane)

```
media/src/
├── index.ts                   # Entry point
├── server.ts                  # MediaServer orchestrator
├── config.ts                  # Configuration from .env
│
├── mediasoup/
│   ├── worker-manager.ts      # Create/manage worker pool
│   └── router-manager.ts      # Rooms (router per room)
│
├── handlers/
│   ├── transport.handler.ts   # WebRTC transport lifecycle
│   ├── producer.handler.ts    # Producers (sending)
│   └── consumer.handler.ts    # Consumers (receiving)
│
├── services/
│   ├── auth.service.ts        # JWT verification
│   └── recording.service.ts   # Recording hooks
│
└── utils/
    └── logger.ts              # Structured logging (pino)
```

## Key Concepts

### Token-Based Auth

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Backend    │ Issue   │   Client    │ Send    │     SFU     │
│   JWT       │────────→│   Storage   │────────→│   Verify    │
│             │         │  (localStorage)      │             │
└─────────────┘         └─────────────┘         └─────────────┘

JWT Payload:
{
  userId: "user-123",
  email: "user@example.com",
  roles: ["participant"],
  exp: 1707619200              // Token expires
}

Secret: MUST be identical in both .env files
```

### Room Architecture (On-Demand)

```
Meeting: "abc123"
   ↓
Room Created (first participant join)
   ├─ Allocate worker (round-robin)
   ├─ Create Router on worker
   ├─ Store room.participants map
   └─ Wait for participants
   
Multiple Participants Join:
   participant-1 ─┐
   participant-2  ├─→ Router (shared)
   participant-3  │   ├─ Codecs: VP8, H.264, Opus
   participant-N ─┘   └─ 1-1 producers/consumers

Room Cleanup:
   All participants leave
   ↓
   Wait 30 seconds (grace period)
   ↓
   Close router (if still empty)
```

### Producer/Consumer Path

```
Participant A (Camera)
     ↓
[Send Transport]
     ↓
[Producer] → Stored: participant-A.producers.get(id)
     ↓
[Router] → Routes to other participants
     ↓
[Consumer] ← Stored: participant-B.consumers.get(id)
     ↓
[Recv Transport]
     ↓
Participant B (Receives)

// Types
- Audio: opus codec, 48kHz
- Video: VP8/H.264, simulcast (three layers)
- Screen: Same codecs, usually higher bitrate
```

## Event Flow

### Join Meeting

```
1. Client: POST /api/v1/meetings/:id/join (Backend)
   ↓
2. Backend: Create Participant record in MongoDB
   ↓
3. Backend: Return { participantId, meetingId }
   ↓
4. Client: Connect to SFU with JWT + participantId
   ↓
5. SFU: Verify JWT
   ↓
6. Client: socket.emit('joinRoom', { roomId, participantId })
   ↓
7. SFU: Create room + add participant
   ↓
8. SFU: Broadcast 'participantJoined' event
   ↓
9. Others: Receive notification, may consume media
```

### Exchange Media

```
Participant A (Sending Video)
   ↓
1. Client: socket.emit('createTransport', { direction: 'send' })
   ↓
2. SFU: Create WebRtcTransport (send)
   ↓
3. SFU: Return transport params (ICE, DTLS)
   ↓
4. Client: Perform ICE gathering (browser side)
   ↓
5. Client: socket.emit('connectTransport', { dtlsParameters })
   ↓
6. SFU: Complete handshake
   ↓
7. Client: socket.emit('produce', { kind: 'video', rtpParameters })
   ↓
8. SFU: Create Producer, start recording
   ↓
9. SFU: Broadcast 'newProducer' to others
   
Participant B (Receiving Video)
   ↓
10. Client: Receives 'newProducer' from participant A
   ↓
11. Client: socket.emit('createTransport', { direction: 'recv' })
   ↓
12. SFU: Create WebRtcTransport (recv)
   ↓
13. Client: socket.emit('consume', { producerId, rtpCapabilities })
   ↓
14. SFU: Create Consumer (starts paused)
   ↓
15. Client: socket.emit('resumeConsumer', { consumerId })
   ↓
16. SFU: Resume consumer → media flows
```

## Configuration Checklist

### Backend (.env)

```bash
# Core
PORT=4000
MONGODB_URI=mongodb://localhost:27017/exitmeet
JWT_SECRET=your-super-secret-key

# Shared with SFU
JWT_SECRET=your-super-secret-key  # ← CRITICAL: Must match SFU

# Optional
CORS_ORIGINS=*
REDIS_URL=redis://localhost:6379
```

### SFU (.env)

```bash
# Core
PORT=5000
JWT_SECRET=your-super-secret-key  # ← CRITICAL: Must match Backend

# WebRTC
MEDIASOUP_NUM_WORKERS=4            # Auto-detect CPU count
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1   # ← Change in production!
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999

# CORS
CORS_ORIGINS=http://localhost:3000
```

## Deployment Patterns

### Single Instance (Dev/Test)

```bash
# Backend
PORT=4000 npm start --prefix backend

# SFU
PORT=5000 MEDIASOUP_ANNOUNCED_IP=localhost npm start --prefix media

# Client connects to localhost:3000
```

### Multi-Instance (Production)

```
Load Balancer (Sticky IP)
    ↓
┌───────────────┬───────────────┬───────────────┐
│               │               │               │
v               v               v               v
Backend-1    Backend-2      SFU-1   SFU-2   SFU-3
:4001        :4002         :5001   :5002   :5003
(MongoDB)    (MongoDB)      
 Shared      Shared       (Stateless - scale freely)
```

**Load Balancer Config** (Nginx example):

```nginx
# Sticky sessions for WebSocket
upstream media_backend {
  hash $client_addr consistent;
  server backend-1:4000;
  server backend-2:4000;
}

upstream media_sfu {
  hash $client_addr consistent;
  server sfu-1:5000;
  server sfu-2:5000;
  server sfu-3:5000;
}

server {
  listen 443 ssl http2;
  
  location /api/v1/ {
    proxy_pass http://media_backend;
  }
  
  location /media {
    proxy_pass http://media_sfu;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Security Checklist

- [ ] JWT_SECRET is strong (use `openssl rand -base64 32`)
- [ ] JWT_SECRET is **identical** in backend and SFU .env
- [ ] SFU MEDIASOUP_ANNOUNCED_IP is **not localhost** in production
- [ ] Port range 40000-49999 is **not exposed** to internet directly
- [ ] CORS_ORIGINS is **restricted** (not *)
- [ ] Rate limiting enabled on `/auth/login` (10 req/15min)
- [ ] MongoDB has **authentication** enabled
- [ ] Redis has **password** authentication
- [ ] Firewall blocks direct access to ports 4000, 5000
- [ ] Only load balancer is publicly accessible

## Performance Tuning

| Setting | Value | Notes |
|---------|-------|-------|
| Workers | CPU count | `os.cpus().length` |
| Min Port | 40000 | Start of range |
| Max Port | 49999 | ~10k concurrent |
| Codec | VP8, H.264, Opus | Hardware accelerated |
| Bitrate (send) | 1 Mbps | Initial available |
| Bitrate (recv) | 1.5 Mbps | Max incoming |
| SCTP | 256 KB | Datachannel size |
| RTC Timeout | 15s | ICE gathering |

## Monitoring & Observability

### Health Checks

```bash
# Backend
curl http://localhost:4000/health

# SFU
curl http://localhost:5000/health
curl http://localhost:5000/stats  # Room info, participant count
```

### Logs

```bash
# Backend logs
tail -f logs/backend.log

# SFU logs (structured JSON)
tail -f logs/media.log | jq '.'

# Search for errors
grep "ERROR" logs/media.log
```

### Metrics (For Future)

```
Prometheus targets:
- Backend: /metrics (NestJS)
- SFU: /metrics (custom)

Key metrics:
- Participants active
- Producers/consumers count
- Media bitrate (in/out)
- Codec distribution
- Connection errors
```

## Testing

### Unit Tests

```bash
# Backend
cd backend && npm test

# SFU
cd media && npm test
```

### Integration Tests

```bash
node test-integration.js

# Expected output:
# ✓ Logged in
# ✓ Created meeting
# ✓ Joined meeting
# ✓ Connected to SFU
# ✓ Got router capabilities
# ✓ Joined room
# Integration test PASSED ✓
```

### Load Testing (Future)

```bash
# Simulate 100 participants
k6 run load-test.js -u 100 -d 60s
```

## Deployment Readiness

### Code

- [ ] Backend compiles: `npm run build --prefix backend`
- [ ] SFU compiles: `npm run build --prefix media`
- [ ] No TypeScript errors: `npm run lint`
- [ ] All tests pass: `npm test`

### Infrastructure

- [ ] MongoDB running and accessible
- [ ] Redis running and accessible
- [ ] Port 40000-49999 available for WebRTC
- [ ] Load balancer configured with sticky sessions
- [ ] SSL certificates configured
- [ ] DNS records pointing to load balancer

### Configuration

- [ ] JWT_SECRET set in both .env files (and identical)
- [ ] MEDIASOUP_ANNOUNCED_IP set to public IP
- [ ] CORS_ORIGINS set correctly
- [ ] Database credentials configured
- [ ] Rate limiting thresholds set

### Monitoring

- [ ] Logging aggregation setup (ELK/Splunk/etc)
- [ ] Alerting rules configured
- [ ] Health checks monitoring
- [ ] Performance dashboards setup

---

## Quick Start Commands

```bash
# Setup
git clone ...
cd exitmeet

# Install
npm install --prefix backend
npm install --prefix media

# Start (Dev)
npm run start:dev --prefix backend &
npm run start:dev --prefix media &

# Build (Prod)
npm run build --prefix backend
npm run build --prefix media

# Test Integration
node test-integration.js

# Monitor
curl http://localhost:5000/stats | jq '.'
```

---

**Status**: ✅ Mediasoup SFU fully designed and implemented. Ready for frontend integration and production deployment.

**Next**: Frontend scaffolding with Next.js + WebRTC client
