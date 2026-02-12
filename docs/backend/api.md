# REST API Reference

> Complete HTTP API documentation for google -meets clone.

---

## Base Configuration

| Property | Value |
|----------|-------|
| Base URL | `/api/v1` |
| Protocol | HTTPS only |
| Content-Type | `application/json` |
| Auth | Bearer token in `Authorization` header |

---

## Authentication

### POST `/auth/register`

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "timezone": "America/New_York"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "u_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-02-09T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errors:**
- `400` - Invalid email format or weak password
- `409` - Email already registered

---

### POST `/auth/login`

Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "u_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://cdn.exithostg.meet/avatars/u_abc123.jpg"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Too many login attempts

---

### POST `/auth/refresh`

Refresh expired access token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:** `200 OK`
```json
{
  "token": "new_access_token",
  "expiresIn": 3600
}
```

---

### POST `/auth/logout`

Invalidate current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `204 No Content`

---

## Meetings

### POST `/meetings`

Create a new meeting.

**Request:**
```json
{
  "title": "Team Standup",
  "scheduledAt": "2026-02-10T15:00:00Z",
  "duration": 30,
  "participants": [
    { "email": "alice@example.com", "role": "host" },
    { "email": "bob@example.com", "role": "participant" }
  ],
  "settings": {
    "waitingRoomEnabled": true,
    "recordingEnabled": false,
    "allowGuestJoin": false,
    "maxParticipants": 50
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "m_xyz789",
  "code": "abc-defg-hij",
  "title": "Team Standup",
  "hostId": "u_abc123",
  "scheduledAt": "2026-02-10T15:00:00Z",
  "duration": 30,
  "status": "scheduled",
  "joinUrl": "https://meet.exithostg.com/m_xyz789",
  "settings": {
    "waitingRoomEnabled": true,
    "recordingEnabled": false,
    "allowGuestJoin": false,
    "maxParticipants": 50
  },
  "createdAt": "2026-02-09T10:00:00Z"
}
```

---

### GET `/meetings/{id}`

Get meeting details.

**Response:** `200 OK`
```json
{
  "id": "m_xyz789",
  "code": "abc-defg-hij",
  "title": "Team Standup",
  "host": {
    "id": "u_abc123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "participants": [
    {
      "id": "u_def456",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "role": "participant",
      "status": "invited"
    }
  ],
  "status": "scheduled",
  "scheduledAt": "2026-02-10T15:00:00Z",
  "startedAt": null,
  "endedAt": null,
  "joinUrl": "https://meet.exithostg.com/m_xyz789"
}
```

**Errors:**
- `404` - Meeting not found
- `403` - Not authorized to view meeting

---

### GET `/meetings`

List user's meetings.

**Query Parameters:**
- `status` - `scheduled | active | ended` (optional)
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)
- `sortBy` - `createdAt | scheduledAt` (default: scheduledAt)

**Response:** `200 OK`
```json
{
  "meetings": [
    {
      "id": "m_xyz789",
      "title": "Team Standup",
      "status": "scheduled",
      "scheduledAt": "2026-02-10T15:00:00Z",
      "participantCount": 5
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### POST `/meetings/{id}/join`

Join a meeting.

**Request:**
```json
{
  "name": "Guest User",
  "audio": true,
  "video": true
}
```

**Response:** `200 OK`
```json
{
  "meetingId": "m_xyz789",
  "participantId": "p_123",
  "role": "participant",
  "permissions": {
    "canShare": true,
    "canRecord": false,
    "canChat": true,
    "canMute": false
  },
  "iceServers": [
    {
      "urls": "stun:stun.exithostg.meet:3478"
    },
    {
      "urls": "turn:turn.exithostg.meet:3478",
      "username": "temp_user",
      "credential": "temp_pass"
    }
  ],
  "mediaServerUrl": "wss://media.exithostg.meet/m_xyz789"
}
```

**Errors:**
- `404` - Meeting not found
- `403` - Meeting locked or not allowed
- `423` - Waiting room enabled, awaiting host approval

---

### PATCH `/meetings/{id}`

Update meeting details.

**Request:**
```json
{
  "title": "Updated Title",
  "scheduledAt": "2026-02-10T16:00:00Z"
}
```

**Response:** `200 OK`
```json
{
  "id": "m_xyz789",
  "title": "Updated Title",
  "scheduledAt": "2026-02-10T16:00:00Z"
}
```

---

### POST `/meetings/{id}/lock`

Lock meeting to prevent new joins.

**Response:** `200 OK`
```json
{
  "locked": true
}
```

---

### POST `/meetings/{id}/end`

End the meeting.

**Response:** `200 OK`
```json
{
  "status": "ended",
  "endedAt": "2026-02-09T11:30:00Z",
  "duration": 1836
}
```

---

### DELETE `/meetings/{id}`

Delete a scheduled meeting.

**Response:** `204 No Content`

**Errors:**
- `400` - Cannot delete active meeting
- `403` - Only host can delete

---

## Participants

### GET `/meetings/{id}/participants`

List meeting participants.

**Response:** `200 OK`
```json
{
  "participants": [
    {
      "id": "p_123",
      "userId": "u_abc123",
      "name": "John Doe",
      "role": "host",
      "status": "connected",
      "audio": true,
      "video": true,
      "screenSharing": false,
      "joinedAt": "2026-02-09T10:00:00Z"
    }
  ]
}
```

---

### POST `/meetings/{id}/participants/{pid}/mute`

Mute a participant (host only).

**Response:** `200 OK`
```json
{
  "participantId": "p_456",
  "audio": false
}
```

---

### POST `/meetings/{id}/participants/{pid}/remove`

Remove a participant (host only).

**Response:** `204 No Content`

---

### POST `/meetings/{id}/participants/{pid}/spotlight`

Spotlight a participant (host only).

**Request:**
```json
{
  "enabled": true
}
```

**Response:** `200 OK`
```json
{
  "participantId": "p_456",
  "spotlighted": true
}
```

---

### PATCH `/meetings/{id}/participants/{pid}/role`

Update participant role.

**Request:**
```json
{
  "role": "co-host"
}
```

**Response:** `200 OK`
```json
{
  "participantId": "p_456",
  "role": "co-host"
}
```

---

## Chat

### GET `/meetings/{id}/messages`

Get chat messages.

**Query Parameters:**
- `limit` - Number of messages (default: 50, max: 200)
- `before` - Message ID for pagination

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "msg_1",
      "senderId": "u_abc123",
      "senderName": "John Doe",
      "text": "Hello everyone!",
      "timestamp": "2026-02-09T10:05:00Z"
    }
  ],
  "hasMore": false
}
```

---

### POST `/meetings/{id}/messages`

Send a chat message.

**Request:**
```json
{
  "text": "Hello everyone!",
  "recipientId": null
}
```

**Response:** `201 Created`
```json
{
  "id": "msg_2",
  "senderId": "u_abc123",
  "senderName": "John Doe",
  "text": "Hello everyone!",
  "timestamp": "2026-02-09T10:06:00Z"
}
```

---

## Recordings

### GET `/meetings/{id}/recordings`

List meeting recordings.

**Response:** `200 OK`
```json
{
  "recordings": [
    {
      "id": "rec_1",
      "meetingId": "m_xyz789",
      "startedAt": "2026-02-09T10:00:00Z",
      "endedAt": "2026-02-09T10:30:00Z",
      "duration": 1800,
      "size": 125829120,
      "status": "available",
      "url": "https://cdn.exithostg.meet/recordings/rec_1.mp4",
      "thumbnailUrl": "https://cdn.exithostg.meet/recordings/rec_1_thumb.jpg"
    }
  ]
}
```

---

### POST `/meetings/{id}/record/start`

Start recording (host only).

**Response:** `200 OK`
```json
{
  "recordingId": "rec_2",
  "status": "recording",
  "startedAt": "2026-02-09T10:10:00Z"
}
```

---

### POST `/meetings/{id}/record/stop`

Stop recording.

**Response:** `200 OK`
```json
{
  "recordingId": "rec_2",
  "status": "processing",
  "stoppedAt": "2026-02-09T10:40:00Z"
}
```

---

### GET `/recordings/{id}`

Get recording details.

**Response:** `200 OK`
```json
{
  "id": "rec_1",
  "meetingId": "m_xyz789",
  "meetingTitle": "Team Standup",
  "duration": 1800,
  "size": 125829120,
  "status": "available",
  "url": "https://cdn.exithostg.meet/recordings/rec_1.mp4",
  "downloadUrl": "https://cdn.exithostg.meet/recordings/rec_1.mp4?download=true",
  "createdAt": "2026-02-09T10:30:00Z"
}
```

---

### DELETE `/recordings/{id}`

Delete a recording.

**Response:** `204 No Content`

---

## User Profile

### GET `/users/me`

Get current user profile.

**Response:** `200 OK`
```json
{
  "id": "u_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://cdn.exithostg.meet/avatars/u_abc123.jpg",
  "timezone": "America/New_York",
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "autoJoinAudio": true
  }
}
```

---

### PATCH `/users/me`

Update user profile.

**Request:**
```json
{
  "name": "John Smith",
  "timezone": "Europe/London",
  "preferences": {
    "theme": "light"
  }
}
```

**Response:** `200 OK`

---

## Error Responses

All errors follow a standard format:

```json
{
  "error": {
    "code": "ERR_UNAUTHORIZED",
    "message": "Invalid or expired token",
    "traceId": "trace_abc123",
    "timestamp": "2026-02-09T10:00:00Z",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ERR_UNAUTHORIZED` | 401 | Invalid or expired authentication |
| `ERR_FORBIDDEN` | 403 | Insufficient permissions |
| `ERR_NOT_FOUND` | 404 | Resource not found |
| `ERR_VALIDATION` | 400 | Request validation failed |
| `ERR_CONFLICT` | 409 | Resource conflict |
| `ERR_RATE_LIMIT` | 429 | Too many requests |
| `ERR_INTERNAL` | 500 | Internal server error |

---

## Rate Limiting

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/auth/login` | 5 requests | 15 minutes |
| `/auth/register` | 3 requests | 1 hour |
| `/meetings` (POST) | 10 requests | 1 minute |
| `/meetings/{id}/*` | 100 requests | 1 minute |
| All other endpoints | 1000 requests | 1 hour |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1707476400
```
