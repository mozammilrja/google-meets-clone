# Meeting Feature - Production Architecture

A scalable, production-ready architecture for Google Meet-style video conferencing.

## Folder Structure

```
/features/meeting/
├── index.ts                    # Main entry point
├── components/
│   ├── index.ts               # Component exports
│   ├── MeetingLayout.tsx      # Main layout orchestrator
│   ├── VideoGrid.tsx          # Dynamic grid (1-16+ participants)
│   ├── VideoTile.tsx          # Remote participant video
│   ├── LocalVideoTile.tsx     # Local user video
│   ├── ControlBar.tsx         # Bottom controls (memoized)
│   ├── InviteCard.tsx         # Share meeting card
│   ├── ParticipantsDrawer.tsx # Participants panel (lazy)
│   ├── ChatPanel.tsx          # Chat panel (lazy)
│   ├── FloatingReactions.tsx  # Emoji reactions overlay
│   ├── CaptionsOverlay.tsx    # Live captions (Web Speech API)
│   └── MeetingLoader.tsx      # Loading state
├── stores/
│   ├── index.ts               # Store exports
│   ├── useMediaControlsStore.ts    # Mic, camera, screen share
│   ├── useUIPanelsStore.ts         # Panel visibility
│   ├── useReactionsStore.ts        # Reactions & hand raise
│   ├── useCaptionsStore.ts         # Captions state
│   └── useMeetingSessionStore.ts   # Meeting & participants
├── hooks/
│   ├── index.ts
│   └── useMeeting.ts          # Main meeting orchestration hook
├── pages/
│   ├── index.ts
│   └── MeetingPage.tsx        # Page component
└── styles/
    └── animations.css         # Smooth animations (200ms)
```

## Key Features

### 1. State Management (Zustand)
- **Isolated stores** prevent cascading re-renders
- **Selectors** for optimized subscriptions
- **subscribeWithSelector** middleware for fine-grained updates

```tsx
// Only re-renders when isAudioEnabled changes
const isAudioEnabled = useMediaControlsStore(state => state.isAudioEnabled)
```

### 2. Dynamic Video Grid
- Automatically adjusts for 1, 2, 4, 9, 16+ participants
- Uses CSS Grid with responsive columns
- Optimized tile aspect ratios

```tsx
// Grid layout calculation
if (totalParticipants <= 4) return 'grid-cols-2'
if (totalParticipants <= 9) return 'grid-cols-3'
if (totalParticipants <= 16) return 'grid-cols-4'
```

### 3. Performance Optimizations
- **React.memo** on all components
- **useCallback** for stable handlers
- **Lazy loading** for ChatPanel and ParticipantsDrawer
- **Ref tracking** prevents unnecessary srcObject updates

```tsx
// Prevent video blinking
if (stream !== lastStreamRef.current) {
  videoElement.srcObject = stream
  lastStreamRef.current = stream
}
```

### 4. Animations (200ms consistent)
- Smooth drawer slide animations
- Control bar hover effects
- Fade transitions for modals
- Floating reaction animations

```css
.panel-enter {
  animation: slide-in-from-right 200ms ease-out forwards;
}
```

### 5. Clean Event Handling
- Proper cleanup via refs
- No memory leaks
- Device change listeners cleaned up

```tsx
cleanupRef.current.push(() => {
  signalingService.off('participant-joined', handler)
})
```

## Usage

### Using the Refactored Page

```tsx
// In app/meeting/[id]/page.tsx
import { MeetingLayout, useMeeting } from '@/features/meeting'

export default function MeetingPage() {
  const { localVideoRef, localStream, onToggleAudio, ... } = useMeeting({ meetingId })
  
  return (
    <MeetingLayout
      meetingId={meetingId}
      localVideoRef={localVideoRef}
      localStream={localStream}
      onToggleAudio={onToggleAudio}
      ...
    />
  )
}
```

### Importing Stores

```tsx
import { useMediaControlsStore, useUIPanelsStore } from '@/features/meeting/stores'

// Toggle audio
useMediaControlsStore.getState().toggleAudio()

// Open chat panel
useUIPanelsStore.getState().setChatVisible(true)
```

## Migration Guide

1. The original `page.tsx` is preserved
2. A refactored version is at `page.refactored.tsx`
3. To switch: rename files as needed

## Z-Index Layering

| Layer | Z-Index | Component |
|-------|---------|-----------|
| Video Grid | 0 | Base layer |
| Floating Reactions | 30 | Above video |
| Captions | 30 | Above video |
| Side Panels | 40 | Chat, Participants |
| Invite Card | 50 | Bottom-left modal |
| Dropdown Menus | 50 | Control bar menus |
| Error Toast | 50 | Bottom-right |

## Performance Tips

1. **Use selectors**: Always use individual state selectors
2. **Avoid object returns**: Don't return objects from selectors
3. **Memoize callbacks**: Use useCallback for all handlers
4. **Lazy load panels**: Non-critical panels load on demand
