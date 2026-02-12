# Frontend Architecture

> Next.js web client for google -meets clone with TypeScript and Tailwind.

---

## Overview

The frontend delivers the meeting experience, device controls, and real-time collaboration UI with light and dark theme support.

---

## Tech Stack (Approved)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js (React, TypeScript) | UI and routing |
| Styling | Tailwind CSS | Layout, tokens, themes |
| Real-time Media | WebRTC APIs | Media capture and playback |
| Signaling | Socket.IO client | WebSocket events |
| State | Zustand + React Context | Global client state |

---

## Key Modules

- Meeting lobby and device check
- Meeting room grid and spotlight
- Chat panel and reactions
- Participants roster and host controls
- Settings, devices, and theme

---

## State Management (logical)

- auth: user and token
- meeting: id, code, status
- participants: list and roles
- media: devices and tracks
- ui: panels, notifications, theme

Detailed notes: [docs/frontend/state-management.md](docs/frontend/state-management.md)

---

## Real-time Communication

- WebRTC media tracks for audio and video
- Socket.IO signaling for SDP and ICE

Client logic: [docs/frontend/webrtc-client.md](docs/frontend/webrtc-client.md)

---

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | (empty) | API base URL |
| NEXT_PUBLIC_WS_URL | (empty) | Signaling WebSocket URL |
| NEXT_PUBLIC_MEDIA_URL | (empty) | SFU media endpoint |

---

## Running

```
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm run start
```
