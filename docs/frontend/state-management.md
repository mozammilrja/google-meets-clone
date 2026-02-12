# State Management

> Comprehensive state management architecture for google -meets clone using Zustand and React Context.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ Meeting      │   │ Participants │   │    UI        │    │
│  │ Store        │   │ Store        │   │  Store       │    │
│  │ (Zustand)    │   │ (Zustand)    │   │ (Zustand)    │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             ▼                                │
│                  ┌──────────────────────┐                    │
│                  │  Persistence Layer   │                    │
│                  │  (localStorage)      │                    │
│                  └──────────────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**State Management Strategy:**
- **Zustand**: Global state for meeting, participants, chat
- **React Context**: Theme, auth, notifications
- **Local State**: Component-specific UI state
- **Server State**: React Query for API data

---

## Zustand Store Structure

### Meeting Store

```typescript
// stores/useMeetingStore.ts
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  localStream: MediaStream | null;
}

interface MeetingState {
  // Meeting info
  meetingId: string | null;
  meetingCode: string | null;
  title: string;
  startedAt: Date | null;
  endedAt: Date | null;
  status: 'idle' | 'joining' | 'active' | 'ended' | 'error';
  
  // Local participant
  participantId: string | null;
  role: 'host' | 'co-host' | 'participant' | 'guest';
  
  // Media state
  media: MediaState;
  
  // Settings
  settings: {
    waitingRoomEnabled: boolean;
    recordingEnabled: boolean;
    chatEnabled: boolean;
    locked: boolean;
  };
  
  // Recording
  recording: {
    isRecording: boolean;
    recordingId: string | null;
    startedAt: Date | null;
  };
  
  // Actions
  setMeetingId: (id: string) => void;
  setMeetingCode: (code: string) => void;
  setTitle: (title: string) => void;
  setStatus: (status: MeetingState['status']) => void;
  setRole: (role: MeetingState['role']) => void;
  
  // Media actions
  setLocalStream: (stream: MediaStream | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setScreenSharing: (enabled: boolean) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<MeetingState['settings']>) => void;
  
  // Recording actions
  startRecording: (recordingId: string) => void;
  stopRecording: () => void;
  
  // Reset
  reset: () => void;
}

const initialMediaState: MediaState = {
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  localStream: null
};

const initialMeetingState = {
  meetingId: null,
  meetingCode: null,
  title: '',
  startedAt: null,
  endedAt: null,
  status: 'idle' as const,
  participantId: null,
  role: 'participant' as const,
  media: initialMediaState,
  settings: {
    waitingRoomEnabled: false,
    recordingEnabled: false,
    chatEnabled: true,
    locked: false
  },
  recording: {
    isRecording: false,
    recordingId: null,
    startedAt: null
  }
};

export const useMeetingStore = create<MeetingState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialMeetingState,
        
        setMeetingId: (id) => set({ meetingId: id }),
        setMeetingCode: (code) => set({ meetingCode: code }),
        setTitle: (title) => set({ title }),
        setStatus: (status) => set({ status }),
        setRole: (role) => set({ role }),
        
        setLocalStream: (stream) => set((state) => ({
          media: { ...state.media, localStream: stream }
        })),
        
        toggleAudio: () => set((state) => ({
          media: {
            ...state.media,
            audioEnabled: !state.media.audioEnabled
          }
        })),
        
        toggleVideo: () => set((state) => ({
          media: {
            ...state.media,
            videoEnabled: !state.media.videoEnabled
          }
        })),
        
        setScreenSharing: (enabled) => set((state) => ({
          media: { ...state.media, screenSharing: enabled }
        })),
        
        updateSettings: (newSettings) => set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
        
        startRecording: (recordingId) => set({
          recording: {
            isRecording: true,
            recordingId,
            startedAt: new Date()
          }
        }),
        
        stopRecording: () => set({
          recording: {
            isRecording: false,
            recordingId: null,
            startedAt: null
          }
        }),
        
        reset: () => set(initialMeetingState)
      }),
      {
        name: 'meeting-storage',
        partialize: (state) => ({
          // Only persist certain fields
          settings: state.settings
        })
      }
    )
  )
);

// Selectors
export const selectIsHost = (state: MeetingState) => state.role === 'host';
export const selectCanRecord = (state: MeetingState) => 
  state.role === 'host' || state.role === 'co-host';
export const selectMediaState = (state: MeetingState) => state.media;
```

---

### Participants Store

```typescript
// stores/useParticipantsStore.ts
import create from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Participant {
  id: string;
  userId: string | null;
  name: string;
  avatar?: string;
  role: 'host' | 'co-host' | 'participant' | 'guest';
  
  // Media state
  audio: boolean;
  video: boolean;
  screenSharing: boolean;
  
  // Streams
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  screenStream: MediaStream | null;
  
  // UI state
  isPinned: boolean;
  isSpotlighted: boolean;
  isSpeaking: boolean;
  isMutedByHost: boolean;
  isHandRaised: boolean;
  
  // Connection quality
  connectionScore: number; // 0-10
  
  // Metadata
  joinedAt: Date;
  isLocal: boolean;
}

interface ParticipantsState {
  participants: Map<string, Participant>;
  
  // Actions
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  
  // Media actions
  setParticipantAudio: (participantId: string, enabled: boolean) => void;
  setParticipantVideo: (participantId: string, enabled: boolean) => void;
  setParticipantStream: (participantId: string, type: 'audio' | 'video' | 'screen', stream: MediaStream | null) => void;
  
  // UI actions
  pinParticipant: (participantId: string) => void;
  unpinParticipant: (participantId: string) => void;
  spotlightParticipant: (participantId: string) => void;
  setParticipantSpeaking: (participantId: string, speaking: boolean) => void;
  raiseHand: (participantId: string) => void;
  lowerHand: (participantId: string) => void;
  
  // Bulk actions
  muteAll: () => void;
  clearAll: () => void;
}

export const useParticipantsStore = create<ParticipantsState>()(
  devtools((set, get) => ({
    participants: new Map(),
    
    addParticipant: (participant) => set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.set(participant.id, participant);
      return { participants: newParticipants };
    }),
    
    removeParticipant: (participantId) => set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(participantId);
      return { participants: newParticipants };
    }),
    
    updateParticipant: (participantId, updates) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, ...updates });
      }
      return { participants: newParticipants };
    }),
    
    setParticipantAudio: (participantId, enabled) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, audio: enabled });
      }
      return { participants: newParticipants };
    }),
    
    setParticipantVideo: (participantId, enabled) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, video: enabled });
      }
      return { participants: newParticipants };
    }),
    
    setParticipantStream: (participantId, type, stream) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        const key = `${type}Stream` as keyof Pick<Participant, 'audioStream' | 'videoStream' | 'screenStream'>;
        newParticipants.set(participantId, { ...participant, [key]: stream });
      }
      return { participants: newParticipants };
    }),
    
    pinParticipant: (participantId) => set((state) => {
      const newParticipants = new Map(state.participants);
      // Unpin all others
      newParticipants.forEach((p, id) => {
        if (p.isPinned) {
          newParticipants.set(id, { ...p, isPinned: false });
        }
      });
      // Pin target
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, isPinned: true });
      }
      return { participants: newParticipants };
    }),
    
    unpinParticipant: (participantId) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, isPinned: false });
      }
      return { participants: newParticipants };
    }),
    
    spotlightParticipant: (participantId) => set((state) => {
      const newParticipants = new Map(state.participants);
      // Remove spotlight from all others
      newParticipants.forEach((p, id) => {
        if (p.isSpotlighted) {
          newParticipants.set(id, { ...p, isSpotlighted: false });
        }
      });
      // Spotlight target
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, isSpotlighted: true });
      }
      return { participants: newParticipants };
    }),
    
    setParticipantSpeaking: (participantId, speaking) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, isSpeaking: speaking });
      }
      return { participants: newParticipants };
    }),
    
    raiseHand: (participantId) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, isHandRaised: true });
      }
      return { participants: newParticipants };
    }),
    
    lowerHand: (participantId) => set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(participantId);
      if (participant) {
        newParticipants.set(participantId, { ...participant, isHandRaised: false });
      }
      return { participants: newParticipants };
    }),
    
    muteAll: () => set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.forEach((p, id) => {
        if (!p.isLocal && p.role !== 'host') {
          newParticipants.set(id, { ...p, audio: false, isMutedByHost: true });
        }
      });
      return { participants: newParticipants };
    }),
    
    clearAll: () => set({ participants: new Map() })
  }))
);

// Selectors
export const selectAllParticipants = (state: ParticipantsState) => 
  Array.from(state.participants.values());

export const selectParticipantById = (id: string) => (state: ParticipantsState) =>
  state.participants.get(id);

export const selectPinnedParticipant = (state: ParticipantsState) =>
  Array.from(state.participants.values()).find(p => p.isPinned);

export const selectSpeakingParticipants = (state: ParticipantsState) =>
  Array.from(state.participants.values()).filter(p => p.isSpeaking);

export const selectParticipantCount = (state: ParticipantsState) =>
  state.participants.size;
```

---

### Chat Store

```typescript
// stores/useChatStore.ts
import create from 'zustand';
import { devtools } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isPrivate: boolean;
  recipientId?: string;
}

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isOpen: boolean;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  markAsRead: () => void;
  toggleChat: () => void;
  setOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  devtools((set) => ({
    messages: [],
    unreadCount: 0,
    isOpen: false,
    
    addMessage: (message) => set((state) => ({
      messages: [...state.messages, message],
      unreadCount: state.isOpen ? state.unreadCount : state.unreadCount + 1
    })),
    
    clearMessages: () => set({ messages: [], unreadCount: 0 }),
    
    markAsRead: () => set({ unreadCount: 0 }),
    
    toggleChat: () => set((state) => {
      const newIsOpen = !state.isOpen;
      return {
        isOpen: newIsOpen,
        unreadCount: newIsOpen ? 0 : state.unreadCount
      };
    }),
    
    setOpen: (open) => set({
      isOpen: open,
      unreadCount: open ? 0 : undefined
    })
  }))
);

// Selectors
export const selectRecentMessages = (limit: number) => (state: ChatState) =>
  state.messages.slice(-limit);
```

---

### UI Store

```typescript
// stores/useUIStore.ts
import create from 'zustand';
import { devtools } from 'zustand/middleware';

type ViewMode = 'grid' | 'spotlight' | 'active-speaker' | 'gallery';
type SidePanel = 'chat' | 'participants' | 'settings' | null;

interface UIState {
  // Layout
  viewMode: ViewMode;
  sidePanelOpen: boolean;
  activeSidePanel: SidePanel;
  isFullscreen: boolean;
  
  // Modals
  settingsModalOpen: boolean;
  inviteModalOpen: boolean;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }>;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  toggleSidePanel: (panel: SidePanel) => void;
  closeSidePanel: () => void;
  toggleFullscreen: () => void;
  
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  
  openInviteModal: () => void;
  closeInviteModal: () => void;
  
  addNotification: (type: UIState['notifications'][0]['type'], message: string) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools((set) => ({
    viewMode: 'grid',
    sidePanelOpen: false,
    activeSidePanel: null,
    isFullscreen: false,
    settingsModalOpen: false,
    inviteModalOpen: false,
    notifications: [],
    
    setViewMode: (mode) => set({ viewMode: mode }),
    
    toggleSidePanel: (panel) => set((state) => ({
      sidePanelOpen: state.activeSidePanel === panel ? !state.sidePanelOpen : true,
      activeSidePanel: panel
    })),
    
    closeSidePanel: () => set({ sidePanelOpen: false }),
    
    toggleFullscreen: () => set((state) => {
      if (!state.isFullscreen) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      return { isFullscreen: !state.isFullscreen };
    }),
    
    openSettingsModal: () => set({ settingsModalOpen: true }),
    closeSettingsModal: () => set({ settingsModalOpen: false }),
    
    openInviteModal: () => set({ inviteModalOpen: true }),
    closeInviteModal: () => set({ inviteModalOpen: false }),
    
    addNotification: (type, message) => set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now().toString(), type, message }
      ]
    })),
    
    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  }))
);
```

---

## React Context

### Auth Context

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Load token from localStorage
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      // Fetch user profile
      fetchUserProfile(savedToken);
    }
  }, []);
  
  const fetchUserProfile = async (authToken: string) => {
    const res = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const userData = await res.json();
    setUser(userData);
  };
  
  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) throw new Error('Login failed');
    
    const { user, token } = await res.json();
    setUser(user);
    setToken(token);
    localStorage.setItem('auth_token', token);
  };
  
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };
  
  const register = async (email: string, password: string, name: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    
    if (!res.ok) throw new Error('Registration failed');
    
    const { user, token } = await res.json();
    setUser(user);
    setToken(token);
    localStorage.setItem('auth_token', token);
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## React Query Integration

### API Queries

```typescript
// hooks/useQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useMyMeetings = () => {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });
};

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/v1/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate meetings list
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    }
  });
};
```

---

## State Synchronization

### Sync with WebSocket

```typescript
// hooks/useSyncState.ts
import { useEffect } from 'react';
import { useParticipantsStore } from '../stores/useParticipantsStore';
import { useChatStore } from '../stores/useChatStore';

export const useSyncState = (signalingClient: SignalingClient) => {
  const addParticipant = useParticipantsStore(s => s.addParticipant);
  const removeParticipant = useParticipantsStore(s => s.removeParticipant);
  const updateParticipant = useParticipantsStore(s => s.updateParticipant);
  const addMessage = useChatStore(s => s.addMessage);
  
  useEffect(() => {
    signalingClient.on('participant-joined', (data) => {
      addParticipant({
        id: data.participantId,
        userId: data.userId,
        name: data.name,
        role: data.role,
        audio: data.audio,
        video: data.video,
        screenSharing: false,
        audioStream: null,
        videoStream: null,
        screenStream: null,
        isPinned: false,
        isSpotlighted: false,
        isSpeaking: false,
        isMutedByHost: false,
        isHandRaised: false,
        connectionScore: 10,
        joinedAt: new Date(),
        isLocal: false
      });
    });
    
    signalingClient.on('participant-left', ({ participantId }) => {
      removeParticipant(participantId);
    });
    
    signalingClient.on('audio-changed', ({ participantId, audio }) => {
      updateParticipant(participantId, { audio });
    });
    
    signalingClient.on('chat-message', (message) => {
      addMessage(message);
    });
  }, [signalingClient]);
};
```

---

## DevTools Integration

**Zustand DevTools in browser:**

```typescript
// Enable Redux DevTools Extension
const useMeetingStore = create<MeetingState>()(
  devtools(
    (set) => ({
      // ... state
    }),
    { name: 'MeetingStore' }
  )
);
```

**Access in browser console:**

```javascript
// Get current state
window.__REDUX_DEVTOOLS_EXTENSION__
```

---

## Performance Optimization

### Shallow Equality

```typescript
// Only re-render when specific fields change
const audioEnabled = useMeetingStore(
  state => state.media.audioEnabled,
  shallow
);
```

### Selectors Memoization

```typescript
import { useMemo } from 'react';

const useActiveSpeakers = () => {
  const participants = useParticipantsStore(selectAllParticipants);
  
  return useMemo(
    () => participants.filter(p => p.isSpeaking),
    [participants]
  );
};
```

---

## Summary

State management provides:
- **Global State**: Zustand stores for meeting, participants, chat, UI
- **Context**: React Context for auth, theme, notifications
- **Server State**: React Query for API data caching
- **Synchronization**: WebSocket events sync with stores
- **DevTools**: Redux DevTools integration
- **Performance**: Optimized selectors and shallow comparison
