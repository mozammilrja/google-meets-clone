import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { 
  Meeting, 
  Participant, 
  ChatMessage, 
  MeetingState,
  RecentMeeting 
} from '@/types';

interface MeetingContextType extends MeetingState {
  recentMeetings: RecentMeeting[];
  createMeeting: (title: string) => Promise<string>;
  joinMeeting: (code: string) => Promise<void>;
  leaveMeeting: () => void;
  endMeeting: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  sendMessage: (message: string) => void;
  toggleChat: () => void;
  toggleParticipantsPanel: () => void;
  raiseHand: () => void;
  lowerHand: () => void;
  sendReaction: (reaction: string) => void;
  setSpotlight: (participantId: string | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addRecentMeeting: (meeting: RecentMeeting) => void;
  clearError: () => void;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);
const generateMeetingCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 2) code += '-';
  }
  return code;
};

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MeetingState>({
    currentMeeting: null,
    isInMeeting: false,
    isHost: false,
    localStream: null,
    screenStream: null,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    chatMessages: [],
    showChat: false,
    showParticipants: false,
    spotlightParticipant: null,
    isLoading: false,
    error: null,
  });

  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const localParticipantId = useRef<string>(generateId());
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMeeting = useCallback(async (title: string): Promise<string> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const meetingCode = generateMeetingCode();
      const meetingId = generateId();
      
      const localParticipant: Participant = {
        id: localParticipantId.current,
        name: 'You',
        isAudioEnabled: state.isAudioEnabled,
        isVideoEnabled: state.isVideoEnabled,
        isScreenSharing: false,
        isHost: true,
        hasRaisedHand: false,
        reaction: null,
        joinedAt: new Date(),
      };
      
      const newMeeting: Meeting = {
        id: meetingId,
        code: meetingCode,
        title: title || 'Untitled Meeting',
        hostId: localParticipantId.current,
        participants: [localParticipant],
        isActive: true,
        createdAt: new Date(),
        startedAt: new Date(),
      };
      
      setState(prev => ({
        ...prev,
        currentMeeting: newMeeting,
        isInMeeting: true,
        isHost: true,
        isLoading: false,
      }));
      
      const recentMeeting: RecentMeeting = {
        id: meetingId,
        code: meetingCode,
        title: newMeeting.title,
        date: new Date(),
        participantCount: 1,
      };
      setRecentMeetings(prev => [recentMeeting, ...prev].slice(0, 10));
      
      return meetingCode;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create meeting',
      }));
      throw error;
    }
  }, [state.isAudioEnabled, state.isVideoEnabled]);

  const joinMeeting = useCallback(async (code: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const meetingId = generateId();
      
      const localParticipant: Participant = {
        id: localParticipantId.current,
        name: 'You',
        isAudioEnabled: state.isAudioEnabled,
        isVideoEnabled: state.isVideoEnabled,
        isScreenSharing: false,
        isHost: false,
        hasRaisedHand: false,
        reaction: null,
        joinedAt: new Date(),
      };
      
      const mockParticipants: Participant[] = [
        {
          id: generateId(),
          name: 'John Doe',
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
          isHost: true,
          hasRaisedHand: false,
          reaction: null,
          joinedAt: new Date(),
        },
        {
          id: generateId(),
          name: 'Jane Smith',
          isAudioEnabled: false,
          isVideoEnabled: true,
          isScreenSharing: false,
          isHost: false,
          hasRaisedHand: false,
          reaction: null,
          joinedAt: new Date(),
        },
      ];
      
      const newMeeting: Meeting = {
        id: meetingId,
        code,
        title: 'Team Standup',
        hostId: mockParticipants[0].id,
        participants: [...mockParticipants, localParticipant],
        isActive: true,
        createdAt: new Date(),
        startedAt: new Date(),
      };
      
      setState(prev => ({
        ...prev,
        currentMeeting: newMeeting,
        isInMeeting: true,
        isHost: false,
        isLoading: false,
      }));
      
      const recentMeeting: RecentMeeting = {
        id: meetingId,
        code,
        title: newMeeting.title,
        date: new Date(),
        participantCount: newMeeting.participants.length,
      };
      setRecentMeetings(prev => [recentMeeting, ...prev].slice(0, 10));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to join meeting',
      }));
      throw error;
    }
  }, [state.isAudioEnabled, state.isVideoEnabled]);

  const leaveMeeting = useCallback((): void => {
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
    }
    
    setState({
      currentMeeting: null,
      isInMeeting: false,
      isHost: false,
      localStream: null,
      screenStream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      chatMessages: [],
      showChat: false,
      showParticipants: false,
      spotlightParticipant: null,
      isLoading: false,
      error: null,
    });
  }, [state.localStream, state.screenStream]);

  const endMeeting = useCallback((): void => {
    leaveMeeting();
  }, [leaveMeeting]);

  const toggleAudio = useCallback((): void => {
    setState(prev => {
      const newAudioEnabled = !prev.isAudioEnabled;
      
      if (prev.localStream) {
        prev.localStream.getAudioTracks().forEach(track => {
          track.enabled = newAudioEnabled;
        });
      }
      
      if (prev.currentMeeting) {
        const updatedParticipants = prev.currentMeeting.participants.map(p =>
          p.id === localParticipantId.current
            ? { ...p, isAudioEnabled: newAudioEnabled }
            : p
        );
        
        return {
          ...prev,
          isAudioEnabled: newAudioEnabled,
          currentMeeting: {
            ...prev.currentMeeting,
            participants: updatedParticipants,
          },
        };
      }
      
      return { ...prev, isAudioEnabled: newAudioEnabled };
    });
  }, []);

  const toggleVideo = useCallback((): void => {
    setState(prev => {
      const newVideoEnabled = !prev.isVideoEnabled;
      
      if (prev.localStream) {
        prev.localStream.getVideoTracks().forEach(track => {
          track.enabled = newVideoEnabled;
        });
      }
      
      if (prev.currentMeeting) {
        const updatedParticipants = prev.currentMeeting.participants.map(p =>
          p.id === localParticipantId.current
            ? { ...p, isVideoEnabled: newVideoEnabled }
            : p
        );
        
        return {
          ...prev,
          isVideoEnabled: newVideoEnabled,
          currentMeeting: {
            ...prev.currentMeeting,
            participants: updatedParticipants,
          },
        };
      }
      
      return { ...prev, isVideoEnabled: newVideoEnabled };
    });
  }, []);

  const startScreenShare = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      setState(prev => ({
        ...prev,
        screenStream: stream,
        isScreenSharing: true,
      }));
    } catch (error) {
      console.error('Failed to start screen share:', error);
    }
  }, []);

  const stopScreenShare = useCallback((): void => {
    setState(prev => {
      if (prev.screenStream) {
        prev.screenStream.getTracks().forEach(track => track.stop());
      }
      
      return {
        ...prev,
        screenStream: null,
        isScreenSharing: false,
      };
    });
  }, []);

  const sendMessage = useCallback((message: string): void => {
    if (!message.trim() || !state.currentMeeting) return;
    
    const newMessage: ChatMessage = {
      id: generateId(),
      meetingId: state.currentMeeting.id,
      participantId: localParticipantId.current,
      participantName: 'You',
      message: message.trim(),
      timestamp: new Date(),
      type: 'text',
    };
    
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, newMessage],
    }));
  }, [state.currentMeeting]);

  const toggleChat = useCallback((): void => {
    setState(prev => ({
      ...prev,
      showChat: !prev.showChat,
      showParticipants: prev.showChat ? prev.showParticipants : false,
    }));
  }, []);

  const toggleParticipantsPanel = useCallback((): void => {
    setState(prev => ({
      ...prev,
      showParticipants: !prev.showParticipants,
      showChat: prev.showParticipants ? prev.showChat : false,
    }));
  }, []);

  const raiseHand = useCallback((): void => {
    setState(prev => {
      if (!prev.currentMeeting) return prev;
      
      const updatedParticipants = prev.currentMeeting.participants.map(p =>
        p.id === localParticipantId.current
          ? { ...p, hasRaisedHand: true }
          : p
      );
      
      return {
        ...prev,
        currentMeeting: {
          ...prev.currentMeeting,
          participants: updatedParticipants,
        },
      };
    });
  }, []);

  const lowerHand = useCallback((): void => {
    setState(prev => {
      if (!prev.currentMeeting) return prev;
      
      const updatedParticipants = prev.currentMeeting.participants.map(p =>
        p.id === localParticipantId.current
          ? { ...p, hasRaisedHand: false }
          : p
      );
      
      return {
        ...prev,
        currentMeeting: {
          ...prev.currentMeeting,
          participants: updatedParticipants,
        },
      };
    });
  }, []);

  const sendReaction = useCallback((reaction: string): void => {
    setState(prev => {
      if (!prev.currentMeeting) return prev;
      
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
      
      const updatedParticipants = prev.currentMeeting.participants.map(p =>
        p.id === localParticipantId.current
          ? { ...p, reaction }
          : p
      );
      
      reactionTimeoutRef.current = setTimeout(() => {
        setState(p => {
          if (!p.currentMeeting) return p;
          return {
            ...p,
            currentMeeting: {
              ...p.currentMeeting,
              participants: p.currentMeeting.participants.map(part =>
                part.id === localParticipantId.current
                  ? { ...part, reaction: null }
                  : part
              ),
            },
          };
        });
      }, 3000);
      
      return {
        ...prev,
        currentMeeting: {
          ...prev.currentMeeting,
          participants: updatedParticipants,
        },
      };
    });
  }, []);

  const setSpotlight = useCallback((participantId: string | null): void => {
    setState(prev => ({
      ...prev,
      spotlightParticipant: participantId,
    }));
  }, []);

  const setLocalStream = useCallback((stream: MediaStream | null): void => {
    setState(prev => ({ ...prev, localStream: stream }));
  }, []);

  const addRecentMeeting = useCallback((meeting: RecentMeeting): void => {
    setRecentMeetings(prev => [meeting, ...prev].slice(0, 10));
  }, []);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <MeetingContext.Provider
      value={{
        ...state,
        recentMeetings,
        createMeeting,
        joinMeeting,
        leaveMeeting,
        endMeeting,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        sendMessage,
        toggleChat,
        toggleParticipantsPanel,
        raiseHand,
        lowerHand,
        sendReaction,
        setSpotlight,
        setLocalStream,
        addRecentMeeting,
        clearError,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting(): MeetingContextType {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
}
