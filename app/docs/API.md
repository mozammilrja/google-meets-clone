# Hooks & API Documentation

This document provides detailed documentation for custom hooks, contexts, and utility functions.

## Table of Contents

- [Custom Hooks](#custom-hooks)
- [Context Providers](#context-providers)
- [Utility Functions](#utility-functions)

---

## Custom Hooks

Located in `src/hooks/`

### useWebRTC

Manages WebRTC media streams for capturing camera and microphone input.

**Import:**
```typescript
import { useWebRTC } from '@/hooks';
```

**Options:**
```typescript
interface UseWebRTCOptions {
  enabled: boolean;          // Whether to activate media capture
  audioEnabled?: boolean;    // Enable microphone (default: true)
  videoEnabled?: boolean;    // Enable camera (default: true)
}
```

**Return Value:**
```typescript
interface UseWebRTCReturn {
  stream: MediaStream | null;  // Active media stream
  error: string | null;        // Error message if failed
  isLoading: boolean;          // Loading state
  restartStream: () => Promise<void>;  // Restart media capture
  stopStream: () => void;      // Stop all tracks
}
```

**Usage:**
```typescript
function VideoPreview() {
  const { stream, error, isLoading, restartStream, stopStream } = useWebRTC({
    enabled: true,
    audioEnabled: true,
    videoEnabled: true,
  });

  if (isLoading) return <div>Loading camera...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <video 
      autoPlay 
      muted 
      playsInline
      ref={(el) => { if (el && stream) el.srcObject = stream; }}
    />
  );
}
```

**Behavior:**
- Automatically requests media when `enabled` becomes `true`
- Stops all tracks when `enabled` becomes `false`
- Updates track enabled states when `audioEnabled`/`videoEnabled` change
- Cleans up on unmount

**Video Constraints:**
```typescript
{
  width: { ideal: 1280 },
  height: { ideal: 720 }
}
```

---

### useScreenShare

Handles screen sharing functionality.

**Import:**
```typescript
import { useScreenShare } from '@/hooks';
```

**Return Value:**
```typescript
interface UseScreenShareReturn {
  stream: MediaStream | null;  // Screen share stream
  isSharing: boolean;          // Currently sharing
  error: string | null;        // Error message
  startShare: () => Promise<void>;  // Start screen share
  stopShare: () => void;       // Stop screen share
}
```

**Usage:**
```typescript
function ScreenShareButton() {
  const { stream, isSharing, startShare, stopShare } = useScreenShare();

  const handleToggle = async () => {
    if (isSharing) {
      stopShare();
    } else {
      await startShare();
    }
  };

  return (
    <button onClick={handleToggle}>
      {isSharing ? 'Stop Sharing' : 'Share Screen'}
    </button>
  );
}
```

**Behavior:**
- Requests screen capture permission
- Includes audio capture option
- Automatically stops when user clicks "Stop sharing" in browser UI
- Cleans up on unmount

---

### useMediaPermissions

Checks and monitors camera/microphone permissions.

**Import:**
```typescript
import { useMediaPermissions } from '@/hooks';
```

**Return Value:**
```typescript
interface UseMediaPermissionsReturn {
  hasCamera: boolean;      // Camera permission granted
  hasMicrophone: boolean;  // Microphone permission granted
  isChecking: boolean;     // Currently checking permissions
  checkPermissions: () => Promise<void>;  // Re-check permissions
}
```

**Usage:**
```typescript
function PermissionCheck() {
  const { hasCamera, hasMicrophone, isChecking } = useMediaPermissions();

  if (isChecking) return <div>Checking permissions...</div>;

  return (
    <div>
      <p>Camera: {hasCamera ? '✅' : '❌'}</p>
      <p>Microphone: {hasMicrophone ? '✅' : '❌'}</p>
    </div>
  );
}
```

**Behavior:**
- Checks permissions on mount
- Creates temporary streams to verify access
- Immediately stops test streams after verification

---

### useMobile

Detects mobile/tablet viewport.

**Import:**
```typescript
import { useMobile } from '@/hooks';
```

**Return Value:**
```typescript
function useMobile(): boolean  // true if mobile viewport
```

**Usage:**
```typescript
function ResponsiveComponent() {
  const isMobile = useMobile();

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
```

**Breakpoint:** `768px` (matches Tailwind's `md` breakpoint)

---

## Context Providers

Located in `src/contexts/`

### AuthContext

Manages user authentication state.

**Provider Setup:**
```tsx
import { AuthProvider } from '@/contexts';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

**Hook:**
```typescript
import { useAuth } from '@/contexts';

const { 
  user,           // Current user object or null
  isAuthenticated,// Boolean login state
  isLoading,      // Loading during auth operations
  error,          // Error message or null
  login,          // Login function
  signup,         // Signup function
  logout,         // Logout function
  forgotPassword, // Password reset function
  clearError,     // Clear error state
} = useAuth();
```

**Methods:**

#### login
```typescript
await login({ email: 'user@example.com', password: 'password123' });
```

#### signup
```typescript
await signup({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  confirmPassword: 'password123',
});
```

#### logout
```typescript
logout();  // Synchronous, clears user state
```

#### forgotPassword
```typescript
await forgotPassword('user@example.com');
```

**Development Credentials:**
- Email: `test@example.com`
- Password: `password`

---

### MeetingContext

Manages meeting state and actions.

**Provider Setup:**
```tsx
import { MeetingProvider } from '@/contexts';

function App() {
  return (
    <MeetingProvider>
      <YourApp />
    </MeetingProvider>
  );
}
```

**Hook:**
```typescript
import { useMeeting } from '@/contexts';

const {
  // State
  currentMeeting,      // Current meeting object or null
  isInMeeting,         // In active meeting
  isHost,              // Is user the host
  localStream,         // Local video stream
  screenStream,        // Screen share stream
  isAudioEnabled,      // Microphone enabled
  isVideoEnabled,      // Camera enabled
  isScreenSharing,     // Screen sharing active
  chatMessages,        // Array of chat messages
  showChat,            // Chat panel visible
  showParticipants,    // Participants panel visible
  spotlightParticipant,// ID of spotlight participant
  recentMeetings,      // Recent meeting history
  isLoading,           // Loading state
  error,               // Error message
  
  // Methods
  createMeeting,       // Create new meeting
  joinMeeting,         // Join existing meeting
  leaveMeeting,        // Leave meeting
  endMeeting,          // End meeting (host only)
  toggleAudio,         // Toggle microphone
  toggleVideo,         // Toggle camera
  startScreenShare,    // Start screen sharing
  stopScreenShare,     // Stop screen sharing
  sendMessage,         // Send chat message
  toggleChat,          // Toggle chat panel
  toggleParticipantsPanel, // Toggle participants panel
  raiseHand,           // Raise hand
  lowerHand,           // Lower hand
  sendReaction,        // Send emoji reaction
  setSpotlight,        // Set spotlight participant
  setLocalStream,      // Set local video stream
  clearError,          // Clear error state
} = useMeeting();
```

**Methods:**

#### createMeeting
```typescript
const meetingCode = await createMeeting('Team Standup');
// Returns: "abc-def-ghi"
```

#### joinMeeting
```typescript
await joinMeeting('abc-def-ghi');
```

#### sendMessage
```typescript
sendMessage('Hello everyone!');
```

#### sendReaction
```typescript
sendReaction('👍');  // Displays reaction bubble
```

---

### ThemeContext

Manages dark/light theme.

**Provider Setup:**
```tsx
import { ThemeProvider } from '@/contexts';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

**Hook:**
```typescript
import { useTheme } from '@/contexts';

const { 
  isDarkMode,   // Boolean, true if dark mode
  toggleTheme,  // Toggle between modes
  setTheme,     // Set specific mode
} = useTheme();
```

**Features:**
- Persists to localStorage
- Respects system preference if no stored value
- Listens for system preference changes
- Adds/removes `dark` class on `<html>` element

**Storage Key:** `google-meet-clone-theme`

---

### ToastContext

Manages toast notifications.

**Provider Setup:**
```tsx
import { ToastProvider } from '@/contexts';

function App() {
  return (
    <ToastProvider>
      <YourApp />
      <ToastContainerWrapper />
    </ToastProvider>
  );
}
```

**Hook:**
```typescript
import { useToast } from '@/contexts';

const { 
  toasts,      // Array of active toasts
  success,     // Show success toast
  error,       // Show error toast
  info,        // Show info toast
  warning,     // Show warning toast
  removeToast, // Remove specific toast
} = useToast();
```

**Methods:**
```typescript
// All methods: (title: string, description?: string) => void
success('Meeting created', 'Code: abc-def-ghi');
error('Connection failed', 'Please try again');
info('Screen sharing started');
warning('Low bandwidth detected');
```

**Toast Auto-dismiss:** 5 seconds (configurable)

---

## Utility Functions

Located in `src/utils/`

### Date Formatting

**Import:**
```typescript
import { formatDate, formatTime, formatRelativeTime, formatDuration } from '@/utils';
```

#### formatDate
Formats date as "MMM d, yyyy".
```typescript
formatDate(new Date());          // "Feb 12, 2026"
formatDate('2026-02-12');        // "Feb 12, 2026"
```

#### formatTime
Formats time as "h:mm a".
```typescript
formatTime(new Date());          // "2:30 PM"
```

#### formatRelativeTime
Formats time relative to now.
```typescript
formatRelativeTime(new Date());           // "Just now"
formatRelativeTime(fiveMinutesAgo);       // "5 minutes ago"
formatRelativeTime(twoHoursAgo);          // "2 hours ago"
formatRelativeTime(threeDaysAgo);         // "3 days ago"
formatRelativeTime(twoWeeksAgo);          // "Jan 29, 2026"
```

#### formatDuration
Formats seconds as duration string.
```typescript
formatDuration(65);       // "1:05"
formatDuration(3665);     // "1:01:05"
```

---

### Helper Functions

**Import:**
```typescript
import { 
  generateId, 
  generateMeetingCode, 
  copyToClipboard,
  getInitials,
  getAvatarColor,
} from '@/utils';
```

#### generateId
Generates random unique identifier.
```typescript
generateId();  // "k9m2x8p4q1w7n3"
```

#### generateMeetingCode
Generates meeting code in xxx-xxx-xxx format.
```typescript
generateMeetingCode();  // "abc-def-ghi"
```

#### copyToClipboard
Copies text to clipboard.
```typescript
const success = await copyToClipboard('text to copy');
// Returns: true if successful, false if failed
```

#### getInitials
Extracts initials from name.
```typescript
getInitials('John Doe');      // "JD"
getInitials('Alice');         // "A"
getInitials('John W. Smith'); // "JS"
```

#### getAvatarColor
Returns consistent Tailwind color class for a name.
```typescript
getAvatarColor('John');   // "bg-blue-500"
getAvatarColor('Jane');   // "bg-purple-500"
// Same name always returns same color
```

---

### Validation Schemas

Located in `src/utils/validation.ts`

**Import:**
```typescript
import { loginSchema, signupSchema, forgotPasswordSchema } from '@/utils/validation';
```

#### loginSchema
```typescript
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginSchema = z.infer<typeof loginSchema>;
```

#### signupSchema
```typescript
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});

type SignupSchema = z.infer<typeof signupSchema>;
```

#### forgotPasswordSchema
```typescript
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
```
