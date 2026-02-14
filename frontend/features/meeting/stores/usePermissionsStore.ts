'use client'

import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'

// =============================================================================
// ROLE & PERMISSION TYPES
// =============================================================================

export type ParticipantRole = 'host' | 'co-host' | 'participant' | 'viewer'

export interface MeetingPermissions {
  // Meeting moderation
  canScreenShare: boolean
  canUnmute: boolean
  canEnableVideo: boolean
  canSendReactions: boolean
  canRaiseHand: boolean
  
  // Chat moderation
  canSendMessages: boolean
  canSendPrivateMessages: boolean
  
  // Host-only features
  canManageParticipants: boolean
  canMuteOthers: boolean
  canRemoveParticipants: boolean
  canEndMeeting: boolean
  canRecord: boolean
  canStartBreakoutRooms: boolean
  canCreatePolls: boolean
  canManageQA: boolean
  canPinMessages: boolean
  canDeleteMessages: boolean
  canTransferHost: boolean
}

export interface RolePermissions {
  host: MeetingPermissions
  'co-host': MeetingPermissions
  participant: MeetingPermissions
  viewer: MeetingPermissions
}

// Default permission matrices
const DEFAULT_HOST_PERMISSIONS: MeetingPermissions = {
  canScreenShare: true,
  canUnmute: true,
  canEnableVideo: true,
  canSendReactions: true,
  canRaiseHand: true,
  canSendMessages: true,
  canSendPrivateMessages: true,
  canManageParticipants: true,
  canMuteOthers: true,
  canRemoveParticipants: true,
  canEndMeeting: true,
  canRecord: true,
  canStartBreakoutRooms: true,
  canCreatePolls: true,
  canManageQA: true,
  canPinMessages: true,
  canDeleteMessages: true,
  canTransferHost: true,
}

const DEFAULT_COHOST_PERMISSIONS: MeetingPermissions = {
  canScreenShare: true,
  canUnmute: true,
  canEnableVideo: true,
  canSendReactions: true,
  canRaiseHand: true,
  canSendMessages: true,
  canSendPrivateMessages: true,
  canManageParticipants: true,
  canMuteOthers: true,
  canRemoveParticipants: false,
  canEndMeeting: false,
  canRecord: true,
  canStartBreakoutRooms: true,
  canCreatePolls: true,
  canManageQA: true,
  canPinMessages: true,
  canDeleteMessages: true,
  canTransferHost: false,
}

const DEFAULT_PARTICIPANT_PERMISSIONS: MeetingPermissions = {
  canScreenShare: true,
  canUnmute: true,
  canEnableVideo: true,
  canSendReactions: true,
  canRaiseHand: true,
  canSendMessages: true,
  canSendPrivateMessages: true,
  canManageParticipants: false,
  canMuteOthers: false,
  canRemoveParticipants: false,
  canEndMeeting: false,
  canRecord: false,
  canStartBreakoutRooms: false,
  canCreatePolls: false,
  canManageQA: false,
  canPinMessages: false,
  canDeleteMessages: false,
  canTransferHost: false,
}

const DEFAULT_VIEWER_PERMISSIONS: MeetingPermissions = {
  canScreenShare: false,
  canUnmute: false,
  canEnableVideo: false,
  canSendReactions: true,
  canRaiseHand: true,
  canSendMessages: false,
  canSendPrivateMessages: false,
  canManageParticipants: false,
  canMuteOthers: false,
  canRemoveParticipants: false,
  canEndMeeting: false,
  canRecord: false,
  canStartBreakoutRooms: false,
  canCreatePolls: false,
  canManageQA: false,
  canPinMessages: false,
  canDeleteMessages: false,
  canTransferHost: false,
}

// =============================================================================
// GLOBAL MEETING SETTINGS (host-controlled)
// =============================================================================

export interface GlobalMeetingSettings {
  // Meeting moderation
  allowScreenShare: boolean
  allowUnmute: boolean
  allowVideo: boolean
  allowReactions: boolean
  allowRaiseHand: boolean
  
  // Chat moderation
  allowChat: boolean
  allowPrivateMessages: boolean
  
  // Recording & streaming
  isRecording: boolean
  isLiveStreaming: boolean
  
  // Meeting state
  isMeetingLocked: boolean
  waitingRoomEnabled: boolean
}

const DEFAULT_GLOBAL_SETTINGS: GlobalMeetingSettings = {
  allowScreenShare: true,
  allowUnmute: true,
  allowVideo: true,
  allowReactions: true,
  allowRaiseHand: true,
  allowChat: true,
  allowPrivateMessages: true,
  isRecording: false,
  isLiveStreaming: false,
  isMeetingLocked: false,
  waitingRoomEnabled: false,
}

// =============================================================================
// STORE STATE
// =============================================================================

interface PermissionsState {
  // Current user's role
  currentRole: ParticipantRole
  
  // Role permission matrices (can be modified by host)
  rolePermissions: RolePermissions
  
  // Global meeting settings
  globalSettings: GlobalMeetingSettings
  
  // Computed effective permissions for current user
  effectivePermissions: MeetingPermissions
  
  // Host ID for this meeting
  hostId: string | null
  
  // Co-host IDs
  coHostIds: Set<string>
  
  // Actions
  setCurrentRole: (role: ParticipantRole) => void
  setHostId: (hostId: string) => void
  addCoHost: (participantId: string) => void
  removeCoHost: (participantId: string) => void
  
  // Global settings actions (host only)
  updateGlobalSetting: <K extends keyof GlobalMeetingSettings>(
    key: K, 
    value: GlobalMeetingSettings[K]
  ) => void
  updateGlobalSettings: (settings: Partial<GlobalMeetingSettings>) => void
  
  // Role permission actions (host only)
  updateRolePermission: <K extends keyof MeetingPermissions>(
    role: ParticipantRole,
    permission: K,
    value: boolean
  ) => void
  
  // Bulk updates from server
  syncPermissions: (data: {
    role: ParticipantRole
    globalSettings: GlobalMeetingSettings
    rolePermissions?: Partial<RolePermissions>
  }) => void
  
  // Permission checks
  can: (permission: keyof MeetingPermissions) => boolean
  isHost: () => boolean
  isCoHost: () => boolean
  isHostOrCoHost: () => boolean
  
  // Reset
  reset: () => void
}

// =============================================================================
// PERMISSION COMPUTATION
// =============================================================================

function computeEffectivePermissions(
  role: ParticipantRole,
  rolePermissions: RolePermissions,
  globalSettings: GlobalMeetingSettings
): MeetingPermissions {
  const basePermissions = rolePermissions[role]
  
  // Apply global restrictions (host settings override role permissions)
  return {
    ...basePermissions,
    canScreenShare: basePermissions.canScreenShare && globalSettings.allowScreenShare,
    canUnmute: basePermissions.canUnmute && globalSettings.allowUnmute,
    canEnableVideo: basePermissions.canEnableVideo && globalSettings.allowVideo,
    canSendReactions: basePermissions.canSendReactions && globalSettings.allowReactions,
    canRaiseHand: basePermissions.canRaiseHand && globalSettings.allowRaiseHand,
    canSendMessages: basePermissions.canSendMessages && globalSettings.allowChat,
    canSendPrivateMessages: basePermissions.canSendPrivateMessages && globalSettings.allowPrivateMessages,
  }
}

// =============================================================================
// STORE
// =============================================================================

const initialRolePermissions: RolePermissions = {
  host: DEFAULT_HOST_PERMISSIONS,
  'co-host': DEFAULT_COHOST_PERMISSIONS,
  participant: DEFAULT_PARTICIPANT_PERMISSIONS,
  viewer: DEFAULT_VIEWER_PERMISSIONS,
}

export const usePermissionsStore = create<PermissionsState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      currentRole: 'participant' as ParticipantRole,
      rolePermissions: initialRolePermissions,
      globalSettings: DEFAULT_GLOBAL_SETTINGS,
      effectivePermissions: DEFAULT_PARTICIPANT_PERMISSIONS,
      hostId: null,
      coHostIds: new Set<string>(),
      
      setCurrentRole: (role) => {
        set((state) => ({
          currentRole: role,
          effectivePermissions: computeEffectivePermissions(
            role,
            state.rolePermissions,
            state.globalSettings
          ),
        }))
      },
      
      setHostId: (hostId) => set({ hostId }),
      
      addCoHost: (participantId) => {
        set((state) => ({
          coHostIds: new Set(state.coHostIds).add(participantId),
        }))
      },
      
      removeCoHost: (participantId) => {
        set((state) => {
          const newSet = new Set(state.coHostIds)
          newSet.delete(participantId)
          return { coHostIds: newSet }
        })
      },
      
      updateGlobalSetting: (key, value) => {
        set((state) => {
          const newSettings = { ...state.globalSettings, [key]: value }
          return {
            globalSettings: newSettings,
            effectivePermissions: computeEffectivePermissions(
              state.currentRole,
              state.rolePermissions,
              newSettings
            ),
          }
        })
      },
      
      updateGlobalSettings: (settings) => {
        set((state) => {
          const newSettings = { ...state.globalSettings, ...settings }
          return {
            globalSettings: newSettings,
            effectivePermissions: computeEffectivePermissions(
              state.currentRole,
              state.rolePermissions,
              newSettings
            ),
          }
        })
      },
      
      updateRolePermission: (role, permission, value) => {
        set((state) => {
          const newRolePermissions = {
            ...state.rolePermissions,
            [role]: {
              ...state.rolePermissions[role],
              [permission]: value,
            },
          }
          return {
            rolePermissions: newRolePermissions,
            effectivePermissions: computeEffectivePermissions(
              state.currentRole,
              newRolePermissions,
              state.globalSettings
            ),
          }
        })
      },
      
      syncPermissions: (data) => {
        set((state) => {
          const newRolePermissions = data.rolePermissions 
            ? { ...state.rolePermissions, ...data.rolePermissions }
            : state.rolePermissions
            
          return {
            currentRole: data.role,
            globalSettings: data.globalSettings,
            rolePermissions: newRolePermissions,
            effectivePermissions: computeEffectivePermissions(
              data.role,
              newRolePermissions,
              data.globalSettings
            ),
          }
        })
      },
      
      can: (permission) => {
        const state = get()
        return state.effectivePermissions[permission]
      },
      
      isHost: () => get().currentRole === 'host',
      
      isCoHost: () => get().currentRole === 'co-host',
      
      isHostOrCoHost: () => {
        const role = get().currentRole
        return role === 'host' || role === 'co-host'
      },
      
      reset: () => {
        set({
          currentRole: 'participant',
          rolePermissions: initialRolePermissions,
          globalSettings: DEFAULT_GLOBAL_SETTINGS,
          effectivePermissions: DEFAULT_PARTICIPANT_PERMISSIONS,
          hostId: null,
          coHostIds: new Set(),
        })
      },
    })),
    { name: 'permissions-store' }
  )
)

// =============================================================================
// SELECTORS (for optimized re-renders)
// =============================================================================

export const selectCurrentRole = (state: PermissionsState) => state.currentRole
export const selectGlobalSettings = (state: PermissionsState) => state.globalSettings
export const selectEffectivePermissions = (state: PermissionsState) => state.effectivePermissions
export const selectIsHost = (state: PermissionsState) => state.currentRole === 'host'
export const selectIsHostOrCoHost = (state: PermissionsState) => 
  state.currentRole === 'host' || state.currentRole === 'co-host'

// Individual permission selectors
export const selectCanScreenShare = (state: PermissionsState) => 
  state.effectivePermissions.canScreenShare
export const selectCanUnmute = (state: PermissionsState) => 
  state.effectivePermissions.canUnmute
export const selectCanEnableVideo = (state: PermissionsState) => 
  state.effectivePermissions.canEnableVideo
export const selectCanSendMessages = (state: PermissionsState) => 
  state.effectivePermissions.canSendMessages
export const selectCanRecord = (state: PermissionsState) => 
  state.effectivePermissions.canRecord
export const selectCanManageParticipants = (state: PermissionsState) => 
  state.effectivePermissions.canManageParticipants
