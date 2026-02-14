// Re-export all meeting feature stores
export { 
  useMediaControlsStore, 
  selectIsAudioEnabled, 
  selectIsVideoEnabled, 
  selectIsScreenSharing, 
  selectHasVideoTrack 
} from './useMediaControlsStore'

export { 
  useUIPanelsStore, 
  selectIsChatVisible, 
  selectIsParticipantsPanelVisible, 
  selectIsInfoPanelVisible,
  selectIsActivitiesPanelVisible,
  selectIsHostControlsVisible,
  selectIsInviteCardVisible, 
  selectShowMeetingReadyModal,
  selectAnyRightPanelOpen,
  selectActivePanel,
  type ActivePanelType,
} from './useUIPanelsStore'

export { 
  useReactionsStore, 
  selectFloatingReactions, 
  selectIsHandRaised, 
  selectParticipantHandsRaised, 
  type FloatingReaction 
} from './useReactionsStore'

export { useCaptionsStore } from './useCaptionsStore'

export { 
  useMeetingSessionStore, 
  selectParticipants, 
  selectParticipantCount, 
  selectMeetingCode, 
  selectIsLoading, 
  selectError 
} from './useMeetingSessionStore'

// Permissions & Roles
export {
  usePermissionsStore,
  selectCurrentRole,
  selectGlobalSettings,
  selectEffectivePermissions,
  selectIsHost,
  selectIsHostOrCoHost,
  selectCanScreenShare,
  selectCanUnmute,
  selectCanEnableVideo,
  selectCanSendMessages,
  selectCanRecord,
  selectCanManageParticipants,
  type ParticipantRole,
  type MeetingPermissions,
  type GlobalMeetingSettings,
} from './usePermissionsStore'

// Chat with moderation
export {
  useChatStore,
  selectMessages,
  selectVisibleMessages,
  selectPinnedMessage,
  selectUnreadCount,
  selectIsChatEnabled,
  type ChatMessage,
  type MessageType,
} from './useChatStore'

// Meeting tools (Timer, Polls, Q&A, Recording, Breakout Rooms)
export {
  useMeetingToolsStore,
  selectTimer,
  selectPolls,
  selectActivePoll,
  selectQuestions,
  selectQAQuestions,
  selectVisibleQuestions,
  selectRecording,
  selectIsRecording,
  selectBreakoutRooms,
  selectBreakoutRoomsState,
  selectIsInBreakoutRoom,
  selectQAEnabled,
  type MeetingTimer,
  type Poll,
  type PollOption,
  type QAQuestion,
  type RecordingState,
  type BreakoutRoom,
  type BreakoutRoomsState,
} from './useMeetingToolsStore'
