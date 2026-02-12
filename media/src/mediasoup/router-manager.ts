import type { Router } from 'mediasoup/node/lib/RouterTypes';
import { WorkerManager } from './worker-manager';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Room represents a meeting with its own Mediasoup router.
 * Each room isolates media traffic and manages participants.
 */
export interface Room {
  id: string;
  router: Router;
  participants: Map<string, Participant>;
  createdAt: Date;
}

/**
 * Participant represents a user connected to a room.
 * Tracks their transports, producers, and consumers.
 */
export interface Participant {
  id: string;
  userId: string;
  socketId: string;
  transports: Map<string, any>; // transportId -> Transport
  producers: Map<string, any>;  // producerId -> Producer
  consumers: Map<string, any>;  // consumerId -> Consumer
  joinedAt: Date;
}

/**
 * RouterManager handles the creation and management of Mediasoup routers.
 * 
 * Pattern: One router per room (meeting).
 * This isolates media traffic between different meetings.
 */
export class RouterManager {
  private rooms = new Map<string, Room>();

  constructor(private workerManager: WorkerManager) {}

  /**
   * Get or create a room with a Mediasoup router
   */
  async getOrCreateRoom(roomId: string): Promise<Room> {
    let room = this.rooms.get(roomId);

    if (!room) {
      // Get next available worker
      const worker = this.workerManager.getNextWorker();

      // Create router with configured codecs
      const router = await worker.createRouter({
        mediaCodecs: config.mediasoup.router.mediaCodecs,
      });

      room = {
        id: roomId,
        router,
        participants: new Map(),
        createdAt: new Date(),
      };

      this.rooms.set(roomId, room);

      logger.info(
        { roomId, workerId: worker.pid },
        'Created new room with router'
      );
    }

    return room;
  }

  /**
   * Get an existing room
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Close and remove a room
   */
  async closeRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return;
    }

    // Close all participant transports
    for (const participant of room.participants.values()) {
      for (const transport of participant.transports.values()) {
        transport.close();
      }
    }

    // Close the router
    room.router.close();

    this.rooms.delete(roomId);

    logger.info({ roomId }, 'Room closed and removed');
  }

  /**
   * Add participant to a room
   */
  addParticipant(roomId: string, participant: Participant): void {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.participants.set(participant.id, participant);

    logger.info(
      { roomId, participantId: participant.id, userId: participant.userId },
      'Participant added to room'
    );
  }

  /**
   * Remove participant from a room
   */
  removeParticipant(roomId: string, participantId: string): void {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const participant = room.participants.get(participantId);
    
    if (participant) {
      // Close all transports
      for (const transport of participant.transports.values()) {
        transport.close();
      }

      room.participants.delete(participantId);

      logger.info(
        { roomId, participantId },
        'Participant removed from room'
      );

      // Auto-close empty rooms
      if (room.participants.size === 0) {
        logger.info({ roomId }, 'Room is empty, scheduling cleanup...');
        // Wait 30 seconds before closing empty room (in case of reconnect)
        setTimeout(() => {
          const currentRoom = this.rooms.get(roomId);
          if (currentRoom && currentRoom.participants.size === 0) {
            this.closeRoom(roomId);
          }
        }, 30000);
      }
    }
  }

  /**
   * Get participant from a room
   */
  getParticipant(roomId: string, participantId: string): Participant | undefined {
    const room = this.rooms.get(roomId);
    return room?.participants.get(participantId);
  }

  /**
   * Get all rooms
   */
  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get room statistics
   */
  getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([id, room]) => ({
        id,
        participantCount: room.participants.size,
        createdAt: room.createdAt,
      })),
    };
  }
}
