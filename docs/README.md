# google -meets clone Documentation

> Production-ready architecture, system flow, and developer guides for google -meets clone.

---

## Documentation Structure

```
docs/
├── README.md                 # This file - documentation index
├── ARCHITECTURE.md           # ✅ System design (Phases 1-2)
├── INTEGRATION.md            # ✅ Backend ↔ SFU integration
├── features.md               # Feature breakdowns and flows
├── backend/
│   └── README.md             # ✅ Backend setup & deployment
├── frontend/
│   ├── README.md             # ▶️ UI architecture (coming soon)
│   ├── ui-ux.md              # UI and UX behavior
│   ├── webrtc-client.md      # Client WebRTC logic
│   └── state-management.md   # State structure
└── future/
    ├── README.md             # Planned enhancements
    └── enterprise.md         # RBAC, SSO, compliance
```

---

## Overview

google -meets clone is a secure, scalable, real-time video collaboration platform built for teams, enterprises, and education.

### Why it exists
To deliver reliable, low-latency, browser-native meetings with strong host controls, modern UI, and enterprise-grade security.

### Core Capabilities
- Multi-party video meetings with SFU routing
- Audio/video controls, screen sharing, reactions
- Real-time chat, participants roster, and host controls
- Meeting scheduling, links, and waiting room
- Server-side recording with object storage
- Role-based access control and audit trails
- Encrypted media transport (DTLS-SRTP)
- Light and dark themes

For feature flows and technical notes, see [docs/features.md](docs/features.md).

---

## Phase 0: Ground Rules ✅ COMPLETE

✅ Completed:
- Tech stack locked (Next.js, NestJS, Mediasoup, MongoDB, Redis)
- Core features frozen for v1
- Non-goals defined (no P2P mesh, no client-only recording)
- Repo structure: backend/, media/, frontend/, docs/, infra/

---

## Phase 1: Control Plane ✅ COMPLETE

**Backend (NestJS) - Production-Ready**

✅ **AuthModule**
- User registration + login
- bcrypt password hashing (10 salt rounds)
- JWT token issuance (24h expiry)
- Rate limiting (5 registrations/hour, 10 logins/15min)
- Audit logging for all auth events

✅ **UsersModule**
- User schema (email, name, passwordHash, roles[])
- GET /users/me endpoint (JWT protected)

✅ **MeetingsModule**
- Meeting creation with auto-generated 3-part codes
- Participant join/leave lifecycle
- Support for Guest/Participant/Host/Admin roles
- Audit logging for all meeting events

✅ **SignalingModule (Socket.IO)**
- WebRTC signaling (offer/answer/ICE candidates)
- Presence tracking (audio/video/screen state)
- Meeting room broadcasting
- JWT authentication on WebSocket connections
- Audit logging for join/leave events

✅ **AuditModule**
- MongoDB audit_logs collection
- Actor tracking (ID, IP, user agent)
- Indexed for compliance queries (orgId+timestamp, actorId+timestamp, action+timestamp)
- 180-day default retention

✅ **Redis Integration**
- Key-value caching with TTL
- Rate limiting (sliding window with INCR/TTL)
- Pub/sub for multi-instance coordination
- Socket.IO Redis adapter for horizontal scaling

**Documentation**: See [backend/README.md](backend/README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Phase 2: Media Plane ✅ COMPLETE

**Mediasoup SFU - Production-Ready**

✅ **Worker Management**
- Worker pool scaled to CPU count
- Round-robin load balancing
- Graceful shutdown on SIGINT/SIGTERM

✅ **Router Management**
- One router per meeting (room)
- On-demand room creation
- Codec configuration (Opus audio, VP8/H.264 video)
- Auto-cleanup for empty rooms (30s grace period)

✅ **Transport Lifecycle**
- WebRTC transports for send/receive
- ICE/DTLS handshake completion
- Bitrate limits (1 Mbps send, 1.5 Mbps recv)
- Statistics collection

✅ **Producers & Consumers**
- Media producers (audio/video/screen) with recording hooks
- Media consumers (receiving from any producer)
- Codec compatibility checking
- Simulcast/SVC layer support
- Pause/resume functionality

✅ **Token-Based Auth**
- JWT verification on WebSocket connection
- Shared secret between backend and SFU
- Token expiry validation
- Immediate disconnect on auth failure

✅ **Recording Hooks (Placeholder)**
- Metadata tracking (roomId, participantId, userId, kind)
- Ready for FFmpeg + S3 integration

**Documentation**: See [media/README.md](media/README.md), [docs/INTEGRATION.md](docs/INTEGRATION.md)

---

---

## Technology Stack

### Frontend

- Next.js (React, TypeScript)
- Tailwind CSS
- WebRTC Browser APIs
- Socket.IO Client
- Web Audio / Media Devices API
- Dark and Light Theme (CSS variables)

### Backend (Control Plane)

- Node.js
- NestJS (TypeScript)
- REST APIs
- WebSockets (Socket.IO)
- JWT Authentication
- OAuth 2.0 (Google Sign-In)

### Real-Time Media (Media Plane)

- WebRTC
- SFU Architecture
- Mediasoup
- STUN / TURN Servers
- DTLS-SRTP (Media Encryption)

### Database and Caching

- MongoDB
- Redis (sessions, signaling helpers, rate limiting)

---

## Architecture Overview

google -meets clone separates the control plane (REST + signaling) from the media plane (SFU). This keeps API traffic predictable and media routing scalable.

### Stack (Approved)

| Layer | Technology | Purpose |
|------|------------|---------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS | UI, routing, theming |
| Backend Control Plane | Node.js, NestJS, TypeScript | REST APIs, orchestration |
| Real-time Signaling | Socket.IO (WebSockets) | SDP/ICE exchange, state sync |
| Media Plane | WebRTC + Mediasoup SFU | Media transport and routing |
| NAT Traversal | STUN/TURN | Connectivity and fallbacks |
| Database | MongoDB | users, meetings, participants, messages, recordings, audit_logs |
| Background Services | Go (Rust optional) | recording jobs, media tasks, cleanup |
| Cache/Coordination | Redis | caching, signaling scaling, presence |
| Observability | Prometheus, Grafana, Loki | metrics, dashboards, logs |
| Infra | Docker, Kubernetes, Nginx | containerization, orchestration, ingress |
| Security | JWT, OAuth (Google optional), RBAC | auth, access control |

---

## Complete System Flow (Phase 1-2)

```
1) Authentication (Backend)
   Client → POST /api/v1/auth/login
   ← JWT token (24h expiry, userId/email/roles)

2) Meeting Creation (Backend)
   Client → POST /api/v1/meetings (JWT protected)
   ← Meeting with auto-generated code + MongoDB persist
   ├─ Broadcast via Socket.IO /signaling namespace
   └─ Audit log recorded

3) Join Meeting (Backend)
   Client → POST /api/v1/meetings/:id/join (JWT protected)
   ← Participant record + MongoDB persist
   ├─ Backend broadcasts via Socket.IO
   └─ Audit log recorded

4) Connect to SFU (Media Plane)
   Client → WebSocket /media namespace with JWT
   SFU verifies token (same secret as backend)
   ← On success: Extract userId, email, roles
   ← On failure: Disconnect immediately

5) Join Media Room (SFU)
   Client → emit 'joinRoom' { roomId, participantId }
   SFU:
   ├─ Create router (if needed, assign to worker)
   ├─ Add participant to room
   ├─ Store ephemeral participant state
   └─ Broadcast 'participantJoined' to others

6) Media Exchange (SFU)
   Client:
   ├─ Create send/recv transports
   ├─ Exchange ICE candidates
   ├─ Complete DTLS-SRTP handshake
   └─ Produce media (start recording hooks)
   
   SFU:
   ├─ Broadcast 'newProducer' to others
   ├─ Others create consumers
   ├─ Media routed via SFU (selective forwarding)
   └─ Bitrate adaptation + statistics

7) State Synchronization (Backend)
   Backend Socket.IO broadcasts:
   ├─ Mute/unmute audio/video
   ├─ Screen sharing start/stop
   ├─ Chat messages → MongoDB persist
   ├─ Participant roster updates
   └─ All events → audit_logs

8) Recording (SFU Hooks - Placeholder)
   On producer creation:
   ├─ recordingService.startRecording()
   ├─ Metadata: roomId, participantId, userId, kind
   └─ Ready for FFmpeg/S3 integration
   
   On producer close:
   ├─ recordingService.stopRecording()
   └─ Available: duration, timestamps for analysis

9) Session End (Cleanup)
   Participant disconnects:
   ├─ SFU: Close all transports
   ├─ SFU: Broadcast 'participantLeft'
   ├─ SFU: If room empty → 30s grace → close router
   └─ Backend: Update meeting status + audit log
```

---

## Next Phase: Frontend (Phase 3)

Ready for Next.js scaffolding with:
- Login/signup flows
- Meeting lobby and join interface
- WebRTC client (offer/answer/ICE handling)
- Real-time state UI (participants, mute, screen share)
- Integration with both backend signaling and SFU

See [docs/frontend/README.md](frontend/README.md) (coming soon)

---

## Technology Usage and Rationale

### Next.js (Frontend)
- Server-rendered routing and auth-aware pages
- Type-safe UI with React + TypeScript
- Tailwind CSS for theme and responsive layouts

### NestJS (Backend)
- Structured modules for auth, meetings, chat, recordings
- REST APIs for control plane operations
- Socket.IO gateway for signaling events

### Mediasoup SFU
- Efficient forwarding of streams without server mixing
- Simulcast support for adaptive quality
- Scales horizontally with multiple workers

### STUN/TURN
- Handles NAT traversal and connectivity failures
- Ensures media connectivity for restrictive networks

### MongoDB
- Flexible schemas for meeting and participant data
- Fast queries for active session state
- Audit logs for compliance

### Go Workers (Rust optional)
- Reliable background jobs for recording, exports, cleanup
- Rust only for performance-critical media tasks

### Redis
- Shared state for signaling at scale
- Caching for meeting metadata and presence

### Observability
- Prometheus collects API/SFU metrics
- Grafana dashboards for QoS and usage
- Loki aggregates logs for incident response

---

## Configuration

### Backend Environment (typical)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | API server port |
| DB_URI | mongodb://localhost:27017/exithostg | MongoDB connection |
| JWT_SECRET | change-me | Token signing secret |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| STUN_URLS | stun:stun.l.google.com:19302 | STUN server list |
| TURN_URLS | turn:turn.example.com:3478 | TURN server list |
| LOG_LEVEL | info | Log verbosity |

### Frontend Environment (typical)

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | (empty) | API base URL |
| NEXT_PUBLIC_WS_URL | (empty) | Signaling WebSocket URL |
| NEXT_PUBLIC_MEDIA_URL | (empty) | SFU media endpoint |

---

## Deployment Summary

- Build Docker images for API, signaling, SFU, and workers
- Deploy to Kubernetes with Nginx ingress
- Provision MongoDB, Redis, and object storage
- Configure STUN/TURN for global connectivity
- Enable Prometheus + Grafana + Loki

---

## Additional Resources
- Feature breakdowns: [docs/features.md](docs/features.md)
- Backend overview: [docs/backend/README.md](docs/backend/README.md)
- Frontend overview: [docs/frontend/README.md](docs/frontend/README.md)
- Future roadmap: [docs/future/README.md](docs/future/README.md)

---

## Troubleshooting (Quick)

- Camera not detected: check browser permissions
- No audio: verify input device and mute state
- Signaling disconnect: confirm WS URL and Nginx upgrade headers
- Media fails to connect: verify STUN/TURN and SFU reachability
