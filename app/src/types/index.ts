// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Meeting Types
export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  hasRaisedHand: boolean;
  reaction: string | null;
  joinedAt: Date;
}

export interface Meeting {
  id: string;
  code: string;
  title: string;
  hostId: string;
  participants: Participant[];
  isActive: boolean;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface ChatMessage {
  id: string;
  meetingId: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface MeetingState {
  currentMeeting: Meeting | null;
  isInMeeting: boolean;
  isHost: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  chatMessages: ChatMessage[];
  showChat: boolean;
  showParticipants: boolean;
  spotlightParticipant: string | null;
  isLoading: boolean;
  error: string | null;
}

// UI Types
export interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface UIState {
  toasts: Toast[];
  isSidebarOpen: boolean;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
}

// Recent Meeting
export interface RecentMeeting {
  id: string;
  code: string;
  title: string;
  date: Date;
  duration?: number;
  participantCount: number;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

// WebRTC Types
export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

// Props Types
export interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal?: boolean;
  isSpotlight?: boolean;
  onClick?: () => void;
}

export interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
}

export interface ParticipantsPanelProps {
  participants: Participant[];
  currentUserId: string;
  onToggleAudio: (participantId: string) => void;
  onToggleVideo: (participantId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  onMakeHost: (participantId: string) => void;
}
