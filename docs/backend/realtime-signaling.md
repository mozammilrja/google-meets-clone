# Real-time Signaling

> WebSocket-based signaling server for WebRTC peer negotiation and meeting state synchronization.

---

## Architecture Overview

```
┌─────────────┐      WSS        ┌──────────────────┐
│   Client    │ ◄──────────────► │  Socket.IO       │
│  (Browser)  │                  │  Signaling       │
└─────────────┘                  │  Server          │
                                 └──────────────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │   Redis Pub/Sub  │
                                 │  (Multi-instance)│
                                 └──────────────────┘
```

**Tech Stack:**
- Socket.IO 4.x for WebSocket communication
- Redis adapter for horizontal scaling
- JWT authentication on connection
- Room-based message routing

---

## Connection Flow

### 1. Initial Connection

**Client connects with authentication:**

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://signal.exithostg.meet', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
});
```

**Server validates token:**

```typescript
// Backend: Socket.IO middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = await verifyJWT(token);
    socket.data.userId = payload.userId;
    socket.data.name = payload.name;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

---

### 2. Join Meeting Room

**Client joins meeting:**

```typescript
socket.emit('meeting:join', {
  meetingId: 'm_xyz789',
  audio: true,
  video: true,
  name: 'John Doe'
}, (response) => {
  if (response.success) {
    console.log('Joined as participant:', response.participantId);
    console.log('Existing participants:', response.participants);
  } else {
    console.error('Failed to join:', response.error);
  }
});
```

**Server response:**

```json
{
  "success": true,
  "participantId": "p_123",
  "role": "participant",
  "participants": [
    {
      "id": "p_456",
      "userId": "u_def456",
      "name": "Alice Smith",
      "audio": true,
      "video": false,
      "screenSharing": false
    }
  ]
}
```

**Server broadcasts to room:**

```typescript
// Backend: New participant joined
socket.to(meetingId).emit('participant:joined', {
  participantId: 'p_123',
  userId: 'u_abc123',
  name: 'John Doe',
  audio: true,
  video: true,
  joinedAt: new Date().toISOString()
});
```

---

## WebRTC Signaling Events

### Offer/Answer Exchange

**Client sends offer:**

```typescript
// After creating RTCPeerConnection offer
socket.emit('webrtc:offer', {
  targetParticipantId: 'p_456',
  sdp: pc.localDescription
});
```

**Server relays to target:**

```typescript
// Backend: Relay offer to specific participant
io.to(targetSocketId).emit('webrtc:offer', {
  fromParticipantId: 'p_123',
  sdp: offerSdp
});
```

**Client handles incoming offer:**

```typescript
socket.on('webrtc:offer', async ({ fromParticipantId, sdp }) => {
  const pc = peerConnections.get(fromParticipantId);
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  
  socket.emit('webrtc:answer', {
    targetParticipantId: fromParticipantId,
    sdp: pc.localDescription
  });
});
```

---

### ICE Candidate Exchange

**Client sends ICE candidates:**

```typescript
pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('webrtc:ice-candidate', {
      targetParticipantId: 'p_456',
      candidate: event.candidate
    });
  }
};
```

**Client receives ICE candidates:**

```typescript
socket.on('webrtc:ice-candidate', async ({ fromParticipantId, candidate }) => {
  const pc = peerConnections.get(fromParticipantId);
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});
```

---

## Meeting Control Events

### Mute/Unmute Audio

**Client toggles audio:**

```typescript
socket.emit('participant:toggle-audio', {
  audio: false
});
```

**Server broadcasts state:**

```typescript
io.to(meetingId).emit('participant:audio-changed', {
  participantId: 'p_123',
  audio: false
});
```

---

### Toggle Video

```typescript
socket.emit('participant:toggle-video', {
  video: true
});
```

---

### Screen Sharing

**Start screen share:**

```typescript
socket.emit('screen-share:start');
```

**Server broadcasts:**

```typescript
io.to(meetingId).emit('screen-share:started', {
  participantId: 'p_123',
  participantName: 'John Doe'
});
```

**Stop screen share:**

```typescript
socket.emit('screen-share:stop');
```

---

### Host Controls

**Mute participant (host only):**

```typescript
socket.emit('host:mute-participant', {
  participantId: 'p_456'
});
```

**Server validates and broadcasts:**

```typescript
// Backend: Check if requester is host
if (socket.data.role === 'host') {
  io.to(targetSocketId).emit('host:muted-by-host');
  io.to(meetingId).emit('participant:audio-changed', {
    participantId: 'p_456',
    audio: false,
    mutedByHost: true
  });
}
```

**Remove participant:**

```typescript
socket.emit('host:remove-participant', {
  participantId: 'p_456'
});
```

---

## Chat Events

### Send Message

```typescript
socket.emit('chat:message', {
  text: 'Hello everyone!',
  recipientId: null // null = broadcast
});
```

**Server broadcasts:**

```typescript
const message = {
  id: 'msg_' + generateId(),
  senderId: socket.data.userId,
  senderName: socket.data.name,
  text: payload.text,
  timestamp: new Date().toISOString()
};

if (payload.recipientId) {
  // Private message
  io.to(recipientSocketId).emit('chat:message', message);
  socket.emit('chat:message', message); // Echo back
} else {
  // Broadcast to all
  io.to(meetingId).emit('chat:message', message);
}
```

---

## Reactions

**Send reaction:**

```typescript
socket.emit('reaction:send', {
  emoji: '👍'
});
```

**Server broadcasts (ephemeral):**

```typescript
io.to(meetingId).emit('reaction:received', {
  participantId: 'p_123',
  participantName: 'John Doe',
  emoji: '👍',
  timestamp: Date.now()
});
```

---

## Recording Events

**Host starts recording:**

```typescript
socket.emit('recording:start');
```

**Server broadcasts:**

```typescript
io.to(meetingId).emit('recording:started', {
  recordingId: 'rec_1',
  startedAt: new Date().toISOString()
});
```

**Stop recording:**

```typescript
socket.emit('recording:stop');
```

---

## Disconnect Handling

**Client disconnect:**

```typescript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  // attempt reconnection
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});
```

**Server cleanup:**

```typescript
// Backend: On disconnect
socket.on('disconnect', async () => {
  const { participantId, meetingId } = socket.data;
  
  // Remove from meeting
  await removeParticipant(meetingId, participantId);
  
  // Broadcast to others
  io.to(meetingId).emit('participant:left', {
    participantId,
    leftAt: new Date().toISOString()
  });
  
  // Cleanup peer connections
  await cleanupMediaResources(participantId);
});
```

---

## Complete Event Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `meeting:join` | `{ meetingId, audio, video, name }` | Join a meeting |
| `meeting:leave` | `{}` | Leave current meeting |
| `webrtc:offer` | `{ targetParticipantId, sdp }` | Send WebRTC offer |
| `webrtc:answer` | `{ targetParticipantId, sdp }` | Send WebRTC answer |
| `webrtc:ice-candidate` | `{ targetParticipantId, candidate }` | Send ICE candidate |
| `participant:toggle-audio` | `{ audio }` | Toggle own audio |
| `participant:toggle-video` | `{ video }` | Toggle own video |
| `screen-share:start` | `{}` | Start screen sharing |
| `screen-share:stop` | `{}` | Stop screen sharing |
| `chat:message` | `{ text, recipientId? }` | Send chat message |
| `reaction:send` | `{ emoji }` | Send reaction |
| `host:mute-participant` | `{ participantId }` | Mute participant (host) |
| `host:remove-participant` | `{ participantId }` | Remove participant (host) |
| `host:lock-meeting` | `{}` | Lock meeting (host) |
| `recording:start` | `{}` | Start recording (host) |
| `recording:stop` | `{}` | Stop recording (host) |

---

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `participant:joined` | `{ participantId, name, audio, video }` | New participant joined |
| `participant:left` | `{ participantId, leftAt }` | Participant left |
| `participant:audio-changed` | `{ participantId, audio }` | Audio state changed |
| `participant:video-changed` | `{ participantId, video }` | Video state changed |
| `webrtc:offer` | `{ fromParticipantId, sdp }` | Received WebRTC offer |
| `webrtc:answer` | `{ fromParticipantId, sdp }` | Received WebRTC answer |
| `webrtc:ice-candidate` | `{ fromParticipantId, candidate }` | Received ICE candidate |
| `screen-share:started` | `{ participantId, participantName }` | Screen share started |
| `screen-share:stopped` | `{ participantId }` | Screen share stopped |
| `chat:message` | `{ id, senderId, senderName, text, timestamp }` | New chat message |
| `reaction:received` | `{ participantId, emoji, timestamp }` | Reaction received |
| `host:muted-by-host` | `{}` | You were muted by host |
| `host:removed-from-meeting` | `{ reason }` | You were removed |
| `meeting:locked` | `{}` | Meeting was locked |
| `meeting:ended` | `{ endedAt }` | Meeting ended by host |
| `recording:started` | `{ recordingId, startedAt }` | Recording started |
| `recording:stopped` | `{ recordingId, stoppedAt }` | Recording stopped |

---

## Scalability: Redis Adapter

**Multi-instance deployment:**

```typescript
// Backend: Socket.IO with Redis adapter
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new Server(server);

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

This allows multiple signaling server instances to communicate through Redis pub/sub, enabling horizontal scaling.

---

## Connection State Management

### Heartbeat/Ping-Pong

Socket.IO automatically handles heartbeats:

```typescript
// Backend config
const io = new Server(server, {
  pingInterval: 25000,
  pingTimeout: 20000
});
```

### Reconnection Strategy

```typescript
// Client reconnection logic
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  
  // Rejoin meeting
  socket.emit('meeting:rejoin', {
    meetingId: currentMeetingId,
    participantId: currentParticipantId
  });
});

socket.on('reconnect_failed', () => {
  alert('Connection lost. Please refresh.');
});
```

---

## Security

1. **JWT Authentication**: Token verified on connection
2. **Room Isolation**: Participants can only emit to their meeting room
3. **Role Validation**: Host-only actions require role check
4. **Rate Limiting**: Socket.IO middleware limits event frequency
5. **WSS Only**: Encrypted WebSocket connections in production

---

## Error Handling

**Standard error response:**

```typescript
socket.emit('meeting:join', payload, (response) => {
  if (!response.success) {
    console.error(response.error); // { code, message }
  }
});
```

**Common error codes:**
- `ERR_NOT_FOUND` - Meeting not found
- `ERR_UNAUTHORIZED` - Action not permitted
- `ERR_MEETING_LOCKED` - Cannot join locked meeting
- `ERR_MEETING_FULL` - Max participants reached

---

## Testing Signaling

**Development client example:**

```typescript
// Test script
const socket = io('ws://localhost:3001', {
  auth: { token: TEST_TOKEN }
});

socket.on('connect', () => {
  socket.emit('meeting:join', {
    meetingId: 'test_meeting',
    audio: true,
    video: false,
    name: 'Test User'
  }, (res) => {
    console.log('Join response:', res);
  });
});

socket.on('participant:joined', (data) => {
  console.log('New participant:', data);
});
```

---

## Summary

The signaling server handles:
- WebSocket connections with JWT auth
- WebRTC SDP/ICE exchange
- Meeting state synchronization
- Real-time chat and reactions
- Host controls and permissions
- Horizontal scaling via Redis
