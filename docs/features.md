# Feature Breakdown

> Detailed descriptions, user flows, and technical notes for core features.

---

## Feature Index

| Feature | Summary | Notes |
|--------|---------|-------|
| Video conferencing | 1:1 and group meetings | Adaptive bitrate and grid layout |
| Audio controls | Mute and noise suppression | Track-level control |
| Camera controls | Toggle and device switch | Live track replacement |
| Screen sharing | Tab, window, full screen | Separate display track |
| Live chat | In-meeting messages | Real-time delivery |
| Meeting links | Unique join URLs | Optional scheduling |
| Waiting room | Join approval | Host admission flow |
| Participant management | Mute, remove, spotlight | Role-based actions |
| Recording | Cloud recording | Consent and banner |
| Captions | Live subtitles | Speech-to-text pipeline |
| Reactions | Emoji and hand raise | Low-latency events |
| Host controls | Roles and permissions | Per-meeting policy |
| Security | Encryption and meeting lock | DTLS-SRTP | 
| Cross-device | Web and mobile support | Responsive UI |
| Themes | Dark and light mode | Stored preference |

---

## Video Conferencing (1:1 and Group)

### Purpose
Deliver low-latency meetings with adaptive quality and active speaker layouts.

### User flow
- Create or join a meeting link
- Pre-join device check and preview
- Join meeting and connect to media server
- Grid view with active speaker highlighting

### Technical notes
- WebRTC with SFU routing
- Simulcast for multi-resolution streams
- Adaptive bitrate based on network conditions

### Edge cases
- Fallback to audio-only on constrained networks
- Graceful reconnect on transient disconnects

---

## Audio Controls (Mute and Noise Suppression)

### Purpose
Give participants control over microphone state and background noise.

### User flow
- Toggle mute from the control bar
- Host can request mute for participants

### Technical notes
- Disable upstream audio track on mute
- Optional noise suppression via WebRTC or DSP service

### Edge cases
- Respect browser-level permission changes
- Preserve mute state across reconnects

---

## Camera Controls

### Purpose
Let users toggle camera and switch devices without leaving the meeting.

### User flow
- Toggle camera in bottom controls
- Select camera device from settings panel

### Technical notes
- Replace video track without renegotiation
- Store device preference per user

### Edge cases
- Handle camera busy or permission denied
- Fallback to avatar tile when video is off

---

## Screen Sharing (Tab, Window, Full Screen)

### Purpose
Share content from a specific surface with meeting participants.

### User flow
- Click Share
- Select source
- Confirm and start sharing

### Technical notes
- getDisplayMedia for capture
- Separate WebRTC track for shared content
- Auto-stop on permission revoke

### Edge cases
- Revert to camera on share end
- Reduce resolution on low bandwidth

---

## Live Chat During Meetings

### Purpose
Provide text communication alongside audio and video.

### User flow
- Open chat panel
- Send message
- Messages appear for all participants

### Technical notes
- WebSocket events for real-time delivery
- Persisted in MongoDB with timestamps

### Edge cases
- Throttle message rate per user
- Notify on unread messages

---

## Meeting Links and Scheduling

### Purpose
Create unique meeting links for ad-hoc or scheduled sessions.

### User flow
- Create meeting
- Copy or share link
- Optional scheduled time and invite list

### Technical notes
- Unique meeting code with configurable TTL
- Calendar integrations are optional

### Edge cases
- Expired or invalid links
- Host-only meetings when locked

---

## Waiting Room and Join Approval

### Purpose
Allow hosts to review and admit participants.

### User flow
- Participant requests access
- Host admits or denies
- Approved participants join the room

### Technical notes
- Server-side waiting state
- Admission event broadcast to all clients

### Edge cases
- Host disconnect during waiting
- Auto-admit for trusted domains (optional)

---

## Participant Management (Mute, Remove, Spotlight)

### Purpose
Give hosts tools to manage the roster and meeting focus.

### User flow
- Host opens participants panel
- Selects user and action

### Technical notes
- RBAC checks on host actions
- SFU or client updates for spotlight

### Edge cases
- Prevent mute abuse by non-hosts
- Keep spotlight state on reconnect

---

## Meeting Recording

### Purpose
Capture meetings for later review.

### User flow
- Host starts recording
- Banner shown to all
- Host stops recording

### Technical notes
- SFU recording pipeline
- Metadata stored in MongoDB
- Recording storage on object bucket

### Edge cases
- Auto-stop recording if host leaves
- Storage quota enforcement

---

## Captions and Live Subtitles

### Purpose
Improve accessibility with live transcription.

### User flow
- Enable captions from controls
- Captions display in video area

### Technical notes
- Speech-to-text service
- Time-synced to audio stream

### Edge cases
- Language selection per meeting
- Fallback if transcription service is unavailable

---

## Reactions (Emoji, Hand Raise)

### Purpose
Enable lightweight feedback without interrupting speakers.

### User flow
- Click reaction or raise hand
- Status appears in participant list and grid

### Technical notes
- Low-latency WebSocket events
- Server throttling to prevent spam

### Edge cases
- Auto-clear hand raise on speaker selection

---

## Host Controls and Role-Based Permissions

### Purpose
Control who can share, record, or admit users.

### User flow
- Host assigns roles
- Permissions update immediately

### Technical notes
- RBAC stored per meeting
- Permission changes broadcast via WebSocket

### Edge cases
- Host transfer on disconnect
- Role downgrade when permissions removed

---

## Security Features (Encryption, Meeting Lock)

### Purpose
Protect media streams and prevent unauthorized joins.

### User flow
- Host locks meeting
- New join requests are blocked

### Technical notes
- DTLS-SRTP for media encryption
- Optional end-to-end mode for smaller meetings

### Edge cases
- Lock state persisted across host reconnect

---

## Cross-Device Support (Web and Mobile)

### Purpose
Provide a consistent experience on desktop and mobile.

### User flow
- Join from browser or mobile app
- Responsive UI adapts to screen size

### Technical notes
- WebRTC on web and native SDKs on mobile
- Adaptive layouts for small screens

### Edge cases
- Reduced grid sizes on small screens
- Prefer audio-only on cellular networks

---

## Dark Mode and Light Mode UI

### Purpose
Allow users to choose a comfortable theme.

### User flow
- Toggle theme in settings
- Preference saved per user

### Technical notes
- CSS variables with system preference fallback
- Theme stored in user profile

### Edge cases
- Respect system theme on first load
