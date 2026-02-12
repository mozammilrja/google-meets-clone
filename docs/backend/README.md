# Backend Architecture

> Node.js control plane for google -meets clone, built with NestJS.

---

## Overview

The backend provides REST APIs, signaling coordination, meeting orchestration, and access control for the media plane.

---

## Tech Stack (Approved)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js | API runtime |
| Framework | NestJS (TypeScript) | REST APIs and services |
| Database | MongoDB | users, meetings, participants, messages, recordings, audit_logs |
| Real-time | Socket.IO | Signaling and event sync |
| Media | Mediasoup SFU | Media routing and recording handoff |
| Cache/Coordination | Redis | presence, scaling, throttling |
| Auth | JWT, OAuth (Google optional) | identity and session control |

---

## Core Modules

- Auth module: JWT issuance, token validation, OAuth login
- Meetings module: create, schedule, join, lock, end
- Participants module: roster, roles, permissions
- Messages module: chat history and delivery
- Recordings module: lifecycle and metadata
- Audit module: compliance logs for sensitive actions
- Signaling gateway: SDP/ICE exchange and meeting state

---

## Request Flow

1. Client authenticates and receives JWT
2. Client joins meeting via REST, permissions validated
3. WebSocket establishes signaling channel
4. Media flows through Mediasoup SFU
5. Events persisted to MongoDB and audit_logs

---

## API Surface (summary)

See [docs/backend/api.md](docs/backend/api.md) for full details.

- Auth: `/api/v1/auth/*`
- Meetings: `/api/v1/meetings/*`
- Participants: `/api/v1/meetings/:id/participants/*`
- Chat: `/api/v1/meetings/:id/messages`
- Recordings: `/api/v1/meetings/:id/record/*`
- Users: `/api/v1/users/*`

---

## Real-time Channels

- Signaling: [docs/backend/realtime-signaling.md](docs/backend/realtime-signaling.md)
- Media routing: [docs/backend/media-sfu.md](docs/backend/media-sfu.md)

---

## Data Models

Database schema details live in [docs/backend/data-models.md](docs/backend/data-models.md).

---

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | API server port |
| DB_URI | mongodb://localhost:27017/exithostg | MongoDB connection |
| JWT_SECRET | change-me | Token signing secret |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| STUN_URLS | stun:stun.l.google.com:19302 | STUN server list |
| TURN_URLS | turn:turn.example.com:3478 | TURN server list |
| LOG_LEVEL | info | Log verbosity |

---

## Running

```
# Development
npm run dev

# Production build
npm run build
npm run start
```
