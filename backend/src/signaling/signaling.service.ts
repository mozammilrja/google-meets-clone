import { Injectable, Logger } from '@nestjs/common';
import { ParticipantPresence, MeetingRoom } from './interfaces/participant-presence.interface';

/**
 * SignalingService manages in-memory state for active WebSocket connections,
 * participant presence, and meeting room membership.
 * 
 * In production with multiple backend instances, this state would be moved to Redis
 * for pub/sub and shared state across servers.
 */
@Injectable()
export class SignalingService {
  private readonly logger = new Logger(SignalingService.name);
  
  // In-memory storage: meetingId -> MeetingRoom
  private readonly rooms = new Map<string, MeetingRoom>();
  
  // Socket ID -> ParticipantPresence for quick lookup on disconnect
  private readonly socketToPresence = new Map<string, ParticipantPresence>();

  /**
   * Add a participant to a meeting room
   */
  addParticipant(presence: ParticipantPresence): void {
    const { meetingId, participantId, socketId } = presence;
    
    // Get or create meeting room
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, {
        meetingId,
        participants: new Map(),
      });
    }
    
    const room = this.rooms.get(meetingId)!;
    room.participants.set(participantId, presence);
    this.socketToPresence.set(socketId, presence);
    
    this.logger.log(
      `Participant ${participantId} joined meeting ${meetingId} (socket: ${socketId})`,
    );
  }

  /**
   * Remove a participant from a meeting room
   */
  removeParticipant(meetingId: string, participantId: string): ParticipantPresence | null {
    const room = this.rooms.get(meetingId);
    if (!room) {
      return null;
    }
    
    const presence = room.participants.get(participantId);
    if (!presence) {
      return null;
    }
    
    room.participants.delete(participantId);
    this.socketToPresence.delete(presence.socketId);
    
    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(meetingId);
      this.logger.log(`Meeting room ${meetingId} is now empty and removed`);
    }
    
    this.logger.log(
      `Participant ${participantId} left meeting ${meetingId}`,
    );
    
    return presence;
  }

  /**
   * Remove participant by socket ID (used on disconnect)
   */
  removeParticipantBySocket(socketId: string): ParticipantPresence | null {
    const presence = this.socketToPresence.get(socketId);
    if (!presence) {
      return null;
    }
    
    return this.removeParticipant(presence.meetingId, presence.participantId);
  }

  /**
   * Update participant's media state (audio/video/screen)
   */
  updateMediaState(
    meetingId: string,
    participantId: string,
    updates: { audio?: boolean; video?: boolean; screenSharing?: boolean },
  ): ParticipantPresence | null {
    const room = this.rooms.get(meetingId);
    if (!room) {
      return null;
    }
    
    const presence = room.participants.get(participantId);
    if (!presence) {
      return null;
    }
    
    if (updates.audio !== undefined) presence.audio = updates.audio;
    if (updates.video !== undefined) presence.video = updates.video;
    if (updates.screenSharing !== undefined) presence.screenSharing = updates.screenSharing;
    
    this.logger.log(
      `Updated media state for ${participantId} in meeting ${meetingId}`,
    );
    
    return presence;
  }

  /**
   * Get all participants in a meeting room
   */
  getParticipants(meetingId: string): ParticipantPresence[] {
    const room = this.rooms.get(meetingId);
    if (!room) {
      return [];
    }
    
    return Array.from(room.participants.values());
  }

  /**
   * Get a specific participant's presence
   */
  getParticipant(meetingId: string, participantId: string): ParticipantPresence | null {
    const room = this.rooms.get(meetingId);
    if (!room) {
      return null;
    }
    
    return room.participants.get(participantId) || null;
  }

  /**
   * Get participant presence by socket ID
   */
  getParticipantBySocket(socketId: string): ParticipantPresence | null {
    return this.socketToPresence.get(socketId) || null;
  }

  /**
   * Check if a participant is in a meeting
   */
  isParticipantInMeeting(meetingId: string, participantId: string): boolean {
    const room = this.rooms.get(meetingId);
    return room ? room.participants.has(participantId) : false;
  }

  /**
   * Get count of active participants in a meeting
   */
  getParticipantCount(meetingId: string): number {
    const room = this.rooms.get(meetingId);
    return room ? room.participants.size : 0;
  }
}
