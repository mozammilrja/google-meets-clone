# MeetClone - Video Meeting Application

A Google Meet clone built with React, TypeScript, and Vite. This is a modern, full-featured video conferencing application with real-time communication capabilities.

## Features

### Authentication
- User login and signup
- Password recovery
- Session management
- Mock authentication for development

### Video Meetings
- Create new meetings with unique codes
- Join meetings via code
- Real-time video/audio streaming
- Screen sharing support
- Camera and microphone controls

### In-Meeting Features
- Video grid with adaptive layouts (1-16+ participants)
- Participant spotlight mode
- Screen sharing with picture-in-picture layout
- Raise hand functionality
- Emoji reactions (👍 ❤️ 😂 😮 🎉 👏 🔥 💯)
- In-call chat messaging
- Participant list panel
- Host controls (end meeting for all)

### UI/UX
- Dark/light theme toggle with system preference detection
- Responsive design (mobile-friendly)
- Toast notifications
- Recent meetings history

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | React 19, TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **UI Components** | Radix UI primitives, shadcn/ui |
| **State Management** | React Context, Zustand |
| **Forms** | React Hook Form, Zod validation |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Real-time** | Socket.IO Client |
| **Date Utils** | date-fns |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Credentials

For testing, use these mock credentials:
- **Email:** `test@example.com`
- **Password:** `password`

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication forms
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   ├── meeting/         # Meeting-related components
│   │   ├── ActionBar.tsx      # Meeting controls bar
│   │   ├── ChatPanel.tsx      # In-call messaging
│   │   ├── ParticipantsPanel.tsx
│   │   ├── VideoGrid.tsx      # Participant video layout
│   │   └── VideoTile.tsx      # Individual video display
│   └── ui/              # Base UI components (shadcn/ui)
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       └── ...
├── contexts/            # React Context providers
│   ├── AuthContext.tsx       # Authentication state
│   ├── MeetingContext.tsx    # Meeting state & actions
│   ├── ThemeContext.tsx      # Theme preferences
│   └── ToastContext.tsx      # Notification system
├── hooks/               # Custom React hooks
│   ├── useWebRTC.ts          # WebRTC stream management
│   └── use-mobile.ts         # Mobile detection
├── pages/               # Page components
│   ├── LoginPage.tsx         # Auth page
│   ├── DashboardPage.tsx     # Home/landing
│   ├── LobbyPage.tsx         # Pre-meeting setup
│   └── MeetingRoomPage.tsx   # Active meeting
├── types/               # TypeScript definitions
│   └── index.ts
├── utils/               # Utility functions
│   ├── helpers.ts            # Date formatting, etc.
│   └── validation.ts         # Zod schemas
├── lib/                 # Library configuration
│   └── utils.ts              # Tailwind utilities
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## Architecture

### Application Flow

```
App.tsx
  └── ThemeProvider
        └── AuthProvider
              └── MeetingProvider
                    └── ToastProvider
                          └── AppContent (routing logic)
                                ├── LoginPage (unauthenticated)
                                ├── DashboardPage (authenticated)
                                ├── LobbyPage (pre-meeting)
                                └── MeetingRoomPage (in-meeting)
```

### State Management

The app uses React Context for global state:

| Context | Purpose |
|---------|---------|
| `AuthContext` | User authentication, login/logout |
| `MeetingContext` | Meeting state, participants, chat, media controls |
| `ThemeContext` | Dark/light mode toggle |
| `ToastContext` | Notification display |

### Key Hooks

#### `useWebRTC`
Manages WebRTC media streams for video calls:
```typescript
const { stream, error, isLoading, restartStream, stopStream } = useWebRTC({
  enabled: true,
  audioEnabled: true,
  videoEnabled: true,
});
```

#### `useScreenShare`
Handles screen sharing functionality:
```typescript
const { stream, isSharing, error, startShare, stopShare } = useScreenShare();
```

#### `useMediaPermissions`
Checks camera/microphone permissions:
```typescript
const { hasCamera, hasMicrophone, isChecking, checkPermissions } = useMediaPermissions();
```

## Components

### Meeting Components

#### `VideoGrid`
Adaptive video layout supporting:
- Single participant (full screen)
- 2-4 participants (2x2 grid)
- 5-9 participants (3x3 grid)
- 10+ participants (4xN grid)
- Screen share mode (main + thumbnails)
- Spotlight mode (featured + sidebar)

#### `ActionBar`
Meeting controls including:
- Microphone toggle
- Camera toggle
- Screen share
- Reactions picker
- Raise hand
- Chat toggle
- Participants toggle
- Leave/End meeting

#### `ChatPanel`
Side panel with:
- Message history
- Real-time messaging
- System notifications
- Auto-scroll to latest

### Auth Components

#### `LoginForm`
- Email/password fields
- Show/hide password toggle
- Form validation with Zod
- Loading states

#### `SignupForm`
- Name, email, password fields
- Password confirmation
- Validation feedback

## Types

### Core Types

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

interface Participant {
  id: string;
  name: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  hasRaisedHand: boolean;
  reaction: string | null;
  joinedAt: Date;
}

interface Meeting {
  id: string;
  code: string;
  title: string;
  hostId: string;
  participants: Participant[];
  isActive: boolean;
  createdAt: Date;
  startedAt?: Date;
}

interface ChatMessage {
  id: string;
  meetingId: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system';
}
```

## Utilities

### Date Formatting
```typescript
formatDate(date)         // "Feb 12, 2026"
formatTime(date)         // "2:30 PM"
formatRelativeTime(date) // "5 minutes ago"
formatDuration(seconds)  // "1:23:45"
```

### Helper Functions
```typescript
generateId()             // Random unique ID
generateMeetingCode()    // "abc-def-ghi" format
copyToClipboard(text)    // Copy to clipboard
getInitials(name)        // "John Doe" → "JD"
getAvatarColor(name)     // Consistent color from name
```

## Configuration

### Path Aliases
The project uses `@/` as an alias for the `src/` directory:
```typescript
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
```

### Tailwind CSS
Custom configuration with:
- Dark mode (class-based)
- Custom color palette
- Extended animations
- shadcn/ui integration

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

WebRTC features require HTTPS in production.

## License

MIT
