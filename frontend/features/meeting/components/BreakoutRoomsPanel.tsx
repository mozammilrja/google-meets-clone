'use client'

import React, { memo, useState, useCallback } from 'react'
import { 
  X, Plus, Users, Clock, Play, Square, ArrowRight, 
  Shuffle, Settings2, ChevronDown, ChevronUp 
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMeetingToolsStore, selectBreakoutRooms, type BreakoutRoom } from '../stores'
import { usePermissionsStore, selectIsHostOrCoHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'

interface Participant {
  id: string
  name: string
  avatar?: string
}

interface BreakoutRoomsPanelProps {
  meetingId: string
  participants: Participant[]
  currentParticipantId: string
  onClose: () => void
}

/**
 * Breakout Rooms Panel - Create and manage breakout rooms
 */
export const BreakoutRoomsPanel = memo(function BreakoutRoomsPanel({
  meetingId,
  participants,
  currentParticipantId,
  onClose,
}: BreakoutRoomsPanelProps) {
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  const rooms = useMeetingToolsStore(selectBreakoutRooms)
  const createBreakoutRooms = useMeetingToolsStore(state => state.createBreakoutRooms)
  const startBreakoutRooms = useMeetingToolsStore(state => state.startBreakoutRooms)
  const endBreakoutRooms = useMeetingToolsStore(state => state.endBreakoutRooms)
  const moveToBreakoutRoom = useMeetingToolsStore(state => state.moveToBreakoutRoom)
  const moveToMainRoom = useMeetingToolsStore(state => state.moveToMainRoom)
  
  const [numRooms, setNumRooms] = useState(2)
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto')
  const [timerMinutes, setTimerMinutes] = useState(15)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  
  // Check if breakout rooms are active
  const areRoomsActive = rooms.length > 0 && rooms.some(r => r.isActive)
  
  const handleCreateRooms = useCallback(() => {
    const roomNames = Array.from({ length: numRooms }, (_, i) => `Room ${i + 1}`)
    
    // Auto-assign participants to rooms
    let assignments: Record<string, string[]> = {}
    if (assignMode === 'auto') {
      roomNames.forEach(name => {
        assignments[name] = []
      })
      
      // Distribute participants evenly (excluding host)
      const eligibleParticipants = participants.filter(p => p.id !== currentParticipantId)
      eligibleParticipants.forEach((p, index) => {
        const roomIndex = index % numRooms
        const roomName = roomNames[roomIndex]
        assignments[roomName].push(p.id)
      })
    }
    
    createBreakoutRooms(meetingId, roomNames, assignments)
    
    signalingService.emit('breakout-rooms-created', {
      meetingId,
      rooms: roomNames,
      assignments,
    })
  }, [numRooms, assignMode, participants, currentParticipantId, meetingId, createBreakoutRooms])
  
  const handleStartRooms = useCallback(() => {
    const timerSeconds = timerMinutes > 0 ? timerMinutes * 60 : undefined
    startBreakoutRooms(timerSeconds)
    
    signalingService.emit('breakout-rooms-started', {
      meetingId,
      timer: timerSeconds,
    })
  }, [timerMinutes, meetingId, startBreakoutRooms])
  
  const handleEndRooms = useCallback(() => {
    endBreakoutRooms()
    signalingService.emit('breakout-rooms-ended', { meetingId })
  }, [meetingId, endBreakoutRooms])
  
  const handleMoveParticipant = useCallback((participantId: string, roomId: string) => {
    moveToBreakoutRoom(roomId, participantId)
    signalingService.emit('breakout-room-participant-moved', {
      meetingId,
      participantId,
      roomId,
    })
  }, [meetingId, moveToBreakoutRoom])
  
  const handleReturnToMain = useCallback((participantId: string) => {
    moveToMainRoom(participantId)
    signalingService.emit('breakout-room-participant-returned', {
      meetingId,
      participantId,
    })
  }, [meetingId, moveToMainRoom])
  
  const handleJoinRoom = useCallback((roomId: string) => {
    moveToBreakoutRoom(roomId, currentParticipantId)
    signalingService.emit('breakout-room-join', {
      meetingId,
      roomId,
      participantId: currentParticipantId,
    })
  }, [meetingId, currentParticipantId, moveToBreakoutRoom])
  
  return (
    <aside 
      className={cn(
        "fixed right-4 top-4 bottom-24 w-[420px] z-40",
        "bg-[#202124] rounded-xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-right-5 fade-in duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#8ab4f8]" />
          <h2 className="text-lg font-medium text-white">Breakout rooms</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Setup Mode (No rooms yet) */}
        {rooms.length === 0 && isHostOrCoHost && (
          <div className="space-y-6">
            {/* Number of rooms */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Number of rooms</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNumRooms(Math.max(2, numRooms - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-[#3c4043] 
                             hover:bg-[#5f6368] text-white text-xl rounded-lg transition-colors"
                >
                  −
                </button>
                <span className="text-2xl font-medium text-white w-8 text-center">
                  {numRooms}
                </span>
                <button
                  onClick={() => setNumRooms(Math.min(50, numRooms + 1))}
                  className="w-10 h-10 flex items-center justify-center bg-[#3c4043] 
                             hover:bg-[#5f6368] text-white text-xl rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Assignment mode */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Assign participants</label>
              <div className="flex items-center gap-2 p-1 bg-[#292a2d] rounded-lg">
                <button
                  onClick={() => setAssignMode('auto')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors",
                    assignMode === 'auto'
                      ? "bg-[#8ab4f8] text-[#202124]"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Shuffle className="h-4 w-4" />
                  Automatic
                </button>
                <button
                  onClick={() => setAssignMode('manual')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors",
                    assignMode === 'manual'
                      ? "bg-[#8ab4f8] text-[#202124]"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Settings2 className="h-4 w-4" />
                  Manual
                </button>
              </div>
            </div>
            
            {/* Timer setting */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Room duration (0 = no limit)
              </label>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <input
                  type="number"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  max={120}
                  className="w-20 px-3 py-2 bg-[#3c4043] text-white rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-[#8ab4f8]"
                />
                <span className="text-gray-400">minutes</span>
              </div>
            </div>
            
            {/* Participants preview */}
            <div className="bg-[#292a2d] rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">
                {participants.length} participant{participants.length !== 1 ? 's' : ''} will be split into {numRooms} rooms
              </p>
              <p className="text-xs text-gray-500">
                ~{Math.ceil((participants.length - 1) / numRooms)} per room
              </p>
            </div>
            
            {/* Create button */}
            <button
              onClick={handleCreateRooms}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 
                         bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] 
                         rounded-full font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create rooms
            </button>
          </div>
        )}
        
        {/* Rooms Created - Management View */}
        {rooms.length > 0 && (
          <div className="space-y-4">
            {/* Status indicator */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              areRoomsActive ? "bg-green-900/30" : "bg-yellow-900/30"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                areRoomsActive ? "bg-green-400" : "bg-yellow-400"
              )} />
              <span className={cn(
                "text-sm font-medium",
                areRoomsActive ? "text-green-400" : "text-yellow-400"
              )}>
                {areRoomsActive ? 'Rooms in session' : 'Rooms ready to start'}
              </span>
            </div>
            
            {/* Room Cards */}
            {rooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                participants={participants}
                currentParticipantId={currentParticipantId}
                isHostOrCoHost={isHostOrCoHost}
                isExpanded={expandedRoom === room.id}
                onToggle={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                onMoveParticipant={handleMoveParticipant}
                onReturnToMain={handleReturnToMain}
                onJoinRoom={handleJoinRoom}
                allRooms={rooms}
              />
            ))}
            
            {/* Control buttons (Host only) */}
            {isHostOrCoHost && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                {!areRoomsActive ? (
                  <button
                    onClick={handleStartRooms}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                               bg-green-600 hover:bg-green-500 text-white 
                               rounded-full font-medium transition-colors"
                  >
                    <Play className="h-5 w-5" />
                    Open all rooms
                  </button>
                ) : (
                  <button
                    onClick={handleEndRooms}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 
                               bg-red-600 hover:bg-red-500 text-white 
                               rounded-full font-medium transition-colors"
                  >
                    <Square className="h-5 w-5" />
                    Close all rooms
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Participant View (non-host) */}
        {rooms.length === 0 && !isHostOrCoHost && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No breakout rooms</p>
            <p className="text-sm text-gray-500 mt-1">
              The host can create breakout rooms
            </p>
          </div>
        )}
      </div>
    </aside>
  )
})

// Room Card Component
interface RoomCardProps {
  room: BreakoutRoom
  participants: Participant[]
  currentParticipantId: string
  isHostOrCoHost: boolean
  isExpanded: boolean
  onToggle: () => void
  onMoveParticipant: (participantId: string, roomId: string) => void
  onReturnToMain: (participantId: string) => void
  onJoinRoom: (roomId: string) => void
  allRooms: BreakoutRoom[]
}

const RoomCard = memo(function RoomCard({
  room,
  participants,
  currentParticipantId,
  isHostOrCoHost,
  isExpanded,
  onToggle,
  onMoveParticipant,
  onReturnToMain,
  onJoinRoom,
  allRooms,
}: RoomCardProps) {
  const roomParticipants = participants.filter(p => room.participantIds.includes(p.id))
  const isInThisRoom = room.participantIds.includes(currentParticipantId)
  
  // Format remaining time
  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className={cn(
      "bg-[#292a2d] rounded-xl overflow-hidden",
      isInThisRoom && "ring-2 ring-[#8ab4f8]"
    )}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            room.isActive ? "bg-green-900/30" : "bg-[#3c4043]"
          )}>
            <Users className={cn(
              "h-5 w-5",
              room.isActive ? "text-green-400" : "text-gray-400"
            )} />
          </div>
          <div className="text-left">
            <p className="font-medium text-white">{room.name}</p>
            <p className="text-sm text-gray-400">
              {roomParticipants.length} participant{roomParticipants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {room.remainingTime && (
            <span className="text-sm text-[#8ab4f8] font-medium">
              {formatTime(room.remainingTime)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Participant list */}
          {roomParticipants.length > 0 ? (
            <div className="space-y-2">
              {roomParticipants.map(p => (
                <div 
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 bg-[#3c4043] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#8ab4f8] flex items-center 
                                    justify-center text-[#202124] text-sm font-medium">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-white">{p.name}</span>
                    {p.id === currentParticipantId && (
                      <span className="px-1.5 py-0.5 bg-[#8ab4f8]/20 text-[#8ab4f8] text-xs rounded">
                        You
                      </span>
                    )}
                  </div>
                  
                  {/* Move participant dropdown (host only) */}
                  {isHostOrCoHost && p.id !== currentParticipantId && (
                    <select
                      onChange={(e) => {
                        if (e.target.value === 'main') {
                          onReturnToMain(p.id)
                        } else {
                          onMoveParticipant(p.id, e.target.value)
                        }
                        e.target.value = ''
                      }}
                      className="bg-transparent text-sm text-[#8ab4f8] cursor-pointer 
                                 focus:outline-none"
                      value=""
                    >
                      <option value="" disabled>Move to...</option>
                      <option value="main">Main room</option>
                      {allRooms
                        .filter(r => r.id !== room.id)
                        .map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No participants in this room
            </p>
          )}
          
          {/* Join room button (for participants) */}
          {room.isActive && !isInThisRoom && (
            <button
              onClick={() => onJoinRoom(room.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                         bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] 
                         rounded-full font-medium transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              Join room
            </button>
          )}
        </div>
      )}
    </div>
  )
})

BreakoutRoomsPanel.displayName = 'BreakoutRoomsPanel'
