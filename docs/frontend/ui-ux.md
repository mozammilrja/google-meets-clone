# UI/UX Design System

> Comprehensive UI/UX guide for google -meets clone, covering component structure, responsive design, accessibility, and theming.

---

## Design Principles

1. **Clarity First**: Video content is primary, UI is minimal and contextual
2. **Accessible by Default**: WCAG 2.1 AA compliance, keyboard navigation
3. **Responsive**: Desktop, tablet, mobile support
4. **Performance**: 60fps animations, lazy loading, optimized renders

---

## Layout Architecture

### Main Meeting View

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Meeting Title | Timer | Participants (N) | Settings│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                     Video Grid (Main Area)                    │
│                                                               │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│   │Video 1 │  │Video 2 │  │Video 3 │  │Video 4 │           │
│   └────────┘  └────────┘  └────────┘  └────────┘           │
│   ┌────────┐  ┌────────┐                                    │
│   │Video 5 │  │Video 6 │                                    │
│   └────────┘  └────────┘                                    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Footer: [Mic] [Video] [Share] [Chat] [Participants] [Leave]│
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### Meeting Room

```tsx
// components/MeetingRoom.tsx
import React from 'react';
import { VideoGrid } from './VideoGrid';
import { ControlBar } from './ControlBar';
import { SidePanel } from './SidePanel';
import { MeetingHeader } from './MeetingHeader';

export const MeetingRoom: React.FC = () => {
  return (
    <div className="meeting-room h-screen flex flex-col bg-gray-900">
      <MeetingHeader />
      
      <div className="flex-1 flex overflow-hidden">
        <VideoGrid className="flex-1" />
        <SidePanel /> {/* Chat, Participants */}
      </div>
      
      <ControlBar />
    </div>
  );
};
```

---

### Video Grid

**Responsive grid layout:**

```tsx
// components/VideoGrid.tsx
import React from 'react';
import { VideoTile } from './VideoTile';
import { useParticipants } from '../hooks/useParticipants';

export const VideoGrid: React.FC = () => {
  const participants = useParticipants();
  
  // Calculate grid layout
  const gridCols = Math.ceil(Math.sqrt(participants.length));
  const gridRows = Math.ceil(participants.length / gridCols);
  
  return (
    <div
      className="grid gap-2 p-4"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`
      }}
    >
      {participants.map(p => (
        <VideoTile key={p.id} participant={p} />
      ))}
    </div>
  );
};
```

**Layout modes:**

| Mode | Description | Max Tiles | Use Case |
|------|-------------|-----------|----------|
| Grid | Equal-sized tiles | 49 (7×7) | Standard meetings |
| Spotlight | 1 large + thumbnails | 1 + 8 | Presentations |
| Active Speaker | Auto-switch large tile | 1 + 16 | Discussions |
| Gallery | Paginated grid | 16 per page | Large meetings |

---

### Video Tile

```tsx
// components/VideoTile.tsx
import React, { useRef, useEffect } from 'react';
import { Participant } from '../types';

interface Props {
  participant: Participant;
}

export const VideoTile: React.FC<Props> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);
  
  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`w-full h-full object-cover ${
          participant.video ? 'block' : 'hidden'
        }`}
      />
      
      {/* Avatar fallback */}
      {!participant.video && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
          <span className="text-4xl font-bold text-white">
            {participant.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      {/* Name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center gap-2">
          {!participant.audio && (
            <MicOffIcon className="w-4 h-4 text-red-400" />
          )}
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
          </span>
          {participant.isHost && (
            <span className="text-xs bg-blue-500 px-1 rounded">Host</span>
          )}
        </div>
      </div>
      
      {/* Connection quality indicator */}
      <div className="absolute top-2 right-2">
        <ConnectionQuality score={participant.connectionScore} />
      </div>
      
      {/* Speaking indicator */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 border-4 border-green-400 rounded-lg pointer-events-none" />
      )}
      
      {/* Pinned indicator */}
      {participant.isPinned && (
        <div className="absolute top-2 left-2">
          <PinIcon className="w-5 h-5 text-yellow-400" />
        </div>
      )}
    </div>
  );
};
```

---

### Control Bar

```tsx
// components/ControlBar.tsx
import React from 'react';
import { useMeeting } from '../hooks/useMeeting';

export const ControlBar: React.FC = () => {
  const {
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    leaveMeeting
  } = useMeeting();
  
  return (
    <div className="h-20 bg-gray-900 border-t border-gray-700 flex items-center justify-center gap-4 px-4">
      {/* Mic Toggle */}
      <ControlButton
        icon={audioEnabled ? <MicIcon /> : <MicOffIcon />}
        label={audioEnabled ? 'Mute' : 'Unmute'}
        active={audioEnabled}
        onClick={toggleAudio}
        shortcut="Ctrl+D"
      />
      
      {/* Video Toggle */}
      <ControlButton
        icon={videoEnabled ? <VideoIcon /> : <VideoOffIcon />}
        label={videoEnabled ? 'Stop Video' : 'Start Video'}
        active={videoEnabled}
        onClick={toggleVideo}
        shortcut="Ctrl+E"
      />
      
      {/* Screen Share */}
      <ControlButton
        icon={<ScreenShareIcon />}
        label="Share Screen"
        onClick={startScreenShare}
      />
      
      {/* Chat Toggle */}
      <ControlButton
        icon={<ChatIcon />}
        label="Chat"
        badge={unreadCount > 0 ? unreadCount : undefined}
        onClick={toggleChat}
      />
      
      {/* Participants */}
      <ControlButton
        icon={<PeopleIcon />}
        label="Participants"
        badge={participantCount}
        onClick={toggleParticipants}
      />
      
      {/* More Options */}
      <ControlButton
        icon={<MoreIcon />}
        label="More"
        onClick={openMoreMenu}
      />
      
      {/* Leave Meeting */}
      <button
        onClick={leaveMeeting}
        className="ml-auto px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition"
      >
        Leave
      </button>
    </div>
  );
};
```

**Control button component:**

```tsx
interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  shortcut?: string;
  onClick: () => void;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  label,
  active,
  badge,
  shortcut,
  onClick
}) => {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        title={shortcut ? `${label} (${shortcut})` : label}
        className={`
          flex flex-col items-center gap-1 px-4 py-2 rounded-lg
          transition-colors duration-200
          ${active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }
        `}
      >
        <div className="relative">
          {icon}
          {badge !== undefined && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs">{label}</span>
      </button>
      
      {/* Tooltip with shortcut */}
      {shortcut && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {label} <kbd className="ml-1 px-1 bg-gray-700 rounded">{shortcut}</kbd>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### Side Panel

**Chat and Participants tabs:**

```tsx
// components/SidePanel.tsx
import React, { useState } from 'react';
import { Chat } from './Chat';
import { ParticipantsList } from './ParticipantsList';

export const SidePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const isOpen = useSidePanelStore(s => s.isOpen);
  
  if (!isOpen) return null;
  
  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 font-medium ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-3 font-medium ${
            activeTab === 'participants'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400'
          }`}
        >
          Participants
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'participants' && <ParticipantsList />}
      </div>
    </div>
  );
};
```

---

## Responsive Breakpoints

**Tailwind configuration:**

```js
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px'  // Ultra-wide
    }
  }
};
```

**Responsive adjustments:**

| Breakpoint | Video Grid | Controls | Side Panel |
|------------|-----------|----------|------------|
| Mobile (<640px) | 1×1 (full screen) | Bottom drawer | Full overlay |
| Tablet (640-1024px) | 2×2 | Bottom bar | Slide-in |
| Desktop (>1024px) | Dynamic grid | Bottom bar | Fixed panel |

---

### Mobile Layout

```tsx
// components/MobileMeetingRoom.tsx
export const MobileMeetingRoom: React.FC = () => {
  return (
    <div className="h-screen flex flex-col">
      {/* Full-screen video */}
      <div className="flex-1 relative">
        <VideoTile participant={activeParticipant} />
        
        {/* Thumbnail strip */}
        <div className="absolute bottom-20 left-0 right-0 flex gap-2 px-4 overflow-x-auto">
          {otherParticipants.map(p => (
            <div key={p.id} className="w-24 h-24 flex-shrink-0">
              <VideoTile participant={p} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom drawer */}
      <div className="h-16 bg-gray-900 flex items-center justify-around">
        <IconButton icon={<MicIcon />} />
        <IconButton icon={<VideoIcon />} />
        <IconButton icon={<MoreIcon />} />
        <IconButton icon={<LeaveIcon />} />
      </div>
    </div>
  );
};
```

---

## Theming System

### Color Palette

```tsx
// theme.ts
export const colors = {
  light: {
    primary: '#3B82F6',      // Blue
    secondary: '#8B5CF6',    // Purple
    success: '#10B981',       // Green
    warning: '#F59E0B',       // Amber
    danger: '#EF4444',        // Red
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280'
  },
  dark: {
    primary: '#60A5FA',
    secondary: '#A78BFA',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF'
  }
};
```

**Theme context:**

```tsx
// contexts/ThemeContext.tsx
import React, { createContext, useState, useContext } from 'react';

type Theme = 'light' | 'dark' | 'auto';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'dark', setTheme: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  
  useEffect(() => {
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

---

## Accessibility

### Keyboard Navigation

**Global shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Ctrl+D` | Toggle microphone |
| `Ctrl+E` | Toggle video |
| `Ctrl+Shift+E` | Start screen share |
| `Ctrl+/` | Show shortcuts |
| `Esc` | Close modals |
| `Tab` | Navigate controls |
| `Space` | Push-to-talk (when muted) |

**Implementation:**

```tsx
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { useMeeting } from './useMeeting';

export const useKeyboardShortcuts = () => {
  const { toggleAudio, toggleVideo } = useMeeting();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleAudio();
      }
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        toggleVideo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAudio, toggleVideo]);
};
```

---

### ARIA Labels

```tsx
<button
  onClick={toggleAudio}
  aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
  aria-pressed={audioEnabled}
>
  {audioEnabled ? <MicIcon /> : <MicOffIcon />}
</button>
```

---

### Screen Reader Announcements

```tsx
// components/Announcer.tsx
export const Announcer: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  
  useParticipantJoined((participant) => {
    setAnnouncement(`${participant.name} joined the meeting`);
  });
  
  return (
    <div className="sr-only" role="status" aria-live="polite">
      {announcement}
    </div>
  );
};
```

---

## Animations

### Smooth Transitions

```css
/* styles/transitions.css */
.video-tile {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.video-tile:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

/* Fade in animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.participant-joined {
  animation: fadeIn 0.3s ease-in;
}
```

---

### Loading States

```tsx
// components/LoadingSpinner.tsx
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
        <span className="mt-4 text-white">Joining meeting...</span>
      </div>
    </div>
  );
};
```

---

## Error States

```tsx
// components/ErrorScreen.tsx
export const ErrorScreen: React.FC<{ error: Error }> = ({ error }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
      <AlertIcon className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Unable to join meeting</h1>
      <p className="text-gray-400 mb-6">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
      >
        Try Again
      </button>
    </div>
  );
};
```

---

## Performance Optimizations

### Virtualized Video Grid

**For large meetings:**

```tsx
import { FixedSizeGrid } from 'react-window';

export const VirtualizedVideoGrid: React.FC = () => {
  const participants = useParticipants();
  
  return (
    <FixedSizeGrid
      columnCount={4}
      columnWidth={320}
      height={window.innerHeight}
      rowCount={Math.ceil(participants.length / 4)}
      rowHeight={240}
      width={window.innerWidth}
    >
      {({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * 4 + columnIndex;
        const participant = participants[index];
        return participant ? (
          <div style={style}>
            <VideoTile participant={participant} />
          </div>
        ) : null;
      }}
    </FixedSizeGrid>
  );
};
```

---

### Lazy Loading Components

```tsx
import { lazy, Suspense } from 'react';

const Chat = lazy(() => import('./Chat'));
const Settings = lazy(() => import('./Settings'));

export const MeetingRoom: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Chat />
      <Settings />
    </Suspense>
  );
};
```

---

## Design Tokens

```ts
// design-tokens.ts
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem'     // 48px
};

export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px'
};

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace'
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem'
  }
};
```

---

## Figma Integration

**Design → Code workflow:**

1. Designers create components in Figma
2. Export design tokens using Figma API
3. Generate TypeScript types from Figma components
4. Sync styles automatically

```bash
npx figma-export-styles --token=<figma-token> --file=<file-id>
```

---

## Summary

The UI/UX system provides:
- **Component Library**: Reusable, accessible components
- **Responsive Layouts**: Mobile-first design
- **Theming**: Light/dark mode support
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Optimized rendering and lazy loading
- **Animations**: Smooth, 60fps transitions
