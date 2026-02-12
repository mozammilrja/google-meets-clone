# Component Documentation

This document provides detailed documentation for all components in the MeetClone application.

## Table of Contents

- [Authentication Components](#authentication-components)
- [Meeting Components](#meeting-components)
- [UI Components](#ui-components)

---

## Authentication Components

Located in `src/components/auth/`

### LoginForm

A form component for user authentication.

**Props:**
```typescript
interface LoginFormProps {
  onForgotPassword: () => void;  // Callback when user clicks forgot password
  onSignup: () => void;          // Callback when user clicks signup
}
```

**Features:**
- Email and password input fields
- Show/hide password toggle
- Form validation using Zod schema
- Loading state during authentication
- Error handling via AuthContext

**Usage:**
```tsx
<LoginForm 
  onForgotPassword={() => setView('forgot-password')}
  onSignup={() => setView('signup')}
/>
```

---

### SignupForm

A registration form for new users.

**Props:**
```typescript
interface SignupFormProps {
  onLogin: () => void;  // Callback to switch to login view
}
```

**Fields:**
- Name (required)
- Email (required, valid email format)
- Password (required, minimum 8 characters)
- Confirm Password (must match password)

**Usage:**
```tsx
<SignupForm onLogin={() => setView('login')} />
```

---

### ForgotPasswordForm

Password recovery form.

**Props:**
```typescript
interface ForgotPasswordFormProps {
  onBack: () => void;  // Callback to return to login
}
```

**Features:**
- Email input for password reset
- Success/error feedback
- Loading state during submission

**Usage:**
```tsx
<ForgotPasswordForm onBack={() => setView('login')} />
```

---

## Meeting Components

Located in `src/components/meeting/`

### VideoGrid

Displays participant video feeds in an adaptive grid layout.

**Props:**
```typescript
interface VideoGridProps {
  participants: Participant[];           // Array of meeting participants
  localStream: MediaStream | null;       // Local user's video stream
  screenStream: MediaStream | null;      // Screen share stream
  screenSharingParticipant: Participant | null;  // Who is sharing screen
  spotlightParticipant: string | null;   // ID of spotlighted participant
  onSetSpotlight: (participantId: string | null) => void;
  isScreenSharing: boolean;              // Is local user screen sharing
}
```

**Layout Modes:**

| Participant Count | Layout |
|-------------------|--------|
| 1 | Full screen |
| 2 | Side by side |
| 3-4 | 2x2 grid |
| 5-6 | 2x3 grid |
| 7-9 | 3x3 grid |
| 10+ | 4xN grid |

**Special Modes:**
- **Screen Share Mode:** Shows shared screen as main view with participant thumbnails below
- **Spotlight Mode:** Shows spotlighted participant large with others in sidebar

**Usage:**
```tsx
<VideoGrid
  participants={meeting.participants}
  localStream={localStream}
  screenStream={screenStream}
  screenSharingParticipant={screenSharingParticipant}
  spotlightParticipant={spotlightId}
  onSetSpotlight={setSpotlight}
  isScreenSharing={isSharing}
/>
```

---

### VideoTile

Individual video tile displaying a participant's video feed.

**Props:**
```typescript
interface VideoTileProps {
  participant: Participant;      // Participant data
  stream: MediaStream | null;    // Video stream to display
  isLocal?: boolean;             // Is this the local user
  isSpotlight?: boolean;         // Is this participant spotlighted
  onClick?: () => void;          // Click handler for spotlight
  className?: string;            // Additional CSS classes
}
```

**Features:**
- Video display with fallback avatar
- Name label overlay
- Audio/video status indicators
- Hand raised indicator
- Reaction display
- Host badge

**Usage:**
```tsx
<VideoTile
  participant={participant}
  stream={videoStream}
  isLocal={participant.name === 'You'}
  isSpotlight={isSpotlighted}
  onClick={() => onSetSpotlight(participant.id)}
/>
```

---

### ScreenShareTile

Displays a screen share stream.

**Props:**
```typescript
interface ScreenShareTileProps {
  stream: MediaStream;       // Screen share media stream
  participantName: string;   // Name of person sharing
}
```

**Usage:**
```tsx
<ScreenShareTile 
  stream={screenStream} 
  participantName="John Doe" 
/>
```

---

### ActionBar

Meeting controls bar displayed at the bottom of the meeting room.

**Props:**
```typescript
interface ActionBarProps {
  isAudioEnabled: boolean;         // Microphone state
  isVideoEnabled: boolean;         // Camera state
  isScreenSharing: boolean;        // Screen share state
  hasRaisedHand: boolean;          // Hand raised state
  showChat: boolean;               // Chat panel visible
  showParticipants: boolean;       // Participants panel visible
  isHost: boolean;                 // Is current user the host
  onToggleAudio: () => void;       // Toggle microphone
  onToggleVideo: () => void;       // Toggle camera
  onToggleScreenShare: () => void; // Toggle screen share
  onToggleChat: () => void;        // Toggle chat panel
  onToggleParticipants: () => void;// Toggle participants panel
  onRaiseHand: () => void;         // Raise hand
  onLowerHand: () => void;         // Lower hand
  onLeaveMeeting: () => void;      // Leave/end meeting
  onSendReaction: (reaction: string) => void; // Send emoji reaction
  participantCount: number;        // Number of participants
  unreadMessageCount?: number;     // Unread chat messages
}
```

**Controls:**
| Button | Description |
|--------|-------------|
| 🎤 Microphone | Toggle audio on/off |
| 📹 Camera | Toggle video on/off |
| 🖥️ Screen Share | Start/stop screen sharing |
| 😊 Reactions | Open reaction picker |
| ✋ Raise Hand | Toggle hand raised |
| 💬 Chat | Toggle chat panel |
| 👥 Participants | Toggle participants list |
| 📞 Leave | Leave or end meeting |
| ⋮ More | Additional options menu |

**Usage:**
```tsx
<ActionBar
  isAudioEnabled={isAudioEnabled}
  isVideoEnabled={isVideoEnabled}
  isScreenSharing={isSharing}
  hasRaisedHand={hasRaisedHand}
  showChat={showChat}
  showParticipants={showParticipants}
  isHost={isHost}
  onToggleAudio={toggleAudio}
  onToggleVideo={toggleVideo}
  onToggleScreenShare={handleToggleScreenShare}
  onToggleChat={toggleChat}
  onToggleParticipants={toggleParticipantsPanel}
  onRaiseHand={raiseHand}
  onLowerHand={lowerHand}
  onLeaveMeeting={handleLeaveMeeting}
  onSendReaction={sendReaction}
  participantCount={participants.length}
/>
```

---

### ChatPanel

Side panel for in-call messaging.

**Props:**
```typescript
interface ChatPanelProps {
  messages: ChatMessage[];           // Array of chat messages
  onSendMessage: (message: string) => void;  // Send message callback
  currentUserId: string;             // Current user's ID
  isOpen: boolean;                   // Panel visibility
  onClose: () => void;               // Close panel callback
}
```

**Features:**
- Message list with timestamps
- Different styling for own vs others' messages
- System message support
- Auto-scroll to newest message
- Auto-focus input on open
- 500 character limit

**Message Types:**
- `text` - Regular user message
- `system` - System notification (e.g., "John joined the meeting")

**Usage:**
```tsx
<ChatPanel
  messages={chatMessages}
  onSendMessage={sendMessage}
  currentUserId={currentUserId}
  isOpen={showChat}
  onClose={toggleChat}
/>
```

---

### ParticipantsPanel

Side panel showing list of meeting participants.

**Props:**
```typescript
interface ParticipantsPanelProps {
  participants: Participant[];  // Array of participants
  currentUserId: string;        // Current user's ID
  isHost: boolean;              // Is current user host
  isOpen: boolean;              // Panel visibility
  onClose: () => void;          // Close panel callback
}
```

**Features:**
- Participant list with avatars
- Audio/video status indicators
- Host badge
- Raised hand indicator
- Host controls (mute/remove participants)

**Usage:**
```tsx
<ParticipantsPanel
  participants={meeting.participants}
  currentUserId={currentUserId}
  isHost={isHost}
  isOpen={showParticipants}
  onClose={toggleParticipantsPanel}
/>
```

---

## UI Components

Located in `src/components/ui/`

The application uses shadcn/ui components built on Radix UI primitives. Key components include:

### Button
```tsx
<Button variant="default" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`

**Sizes:** `default`, `sm`, `lg`, `icon`

---

### Input
```tsx
<Input 
  type="text" 
  placeholder="Enter text" 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

---

### Dialog
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

---

### DropdownMenu
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Custom Components

#### ThemeToggle
Toggles between light and dark theme.

**Location:** `src/components/ui/custom/ThemeToggle.tsx`

```tsx
<ThemeToggle />
```

---

#### Toast / ToastContainer
Displays notification toasts.

**Location:** `src/components/ui/custom/Toast.tsx`

```tsx
// Using the toast context
const { success, error, info, warning } = useToast();

success('Title', 'Optional description');
error('Error', 'Something went wrong');
```
