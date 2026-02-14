import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ParticipantPresence } from './interfaces/participant-presence.interface';

/**
 * Redis key patterns:
 * - meeting:{meetingId}:participants -> Hash of participantId -> JSON presence
 * - socket:{socketId} -> JSON { meetingId, participantId }
 * - meeting:{meetingId}:server -> server instance ID handling this meeting
 * - server:{instanceId}:meetings -> Set of meetingIds handled by this server
 */

const MEETING_PARTICIPANTS_KEY = (meetingId: string) => `meeting:${meetingId}:participants`;
const SOCKET_MAPPING_KEY = (socketId: string) => `socket:${socketId}`;
const MEETING_SERVER_KEY = (meetingId: string) => `meeting:${meetingId}:server`;
const SERVER_MEETINGS_KEY = (instanceId: string) => `server:${instanceId}:meetings`;

// TTL for presence data (5 minutes) - refreshed on activity
const PRESENCE_TTL = 300;

/**
 * RedisSignalingService manages participant presence using Redis for 
 * horizontal scaling across multiple backend instances.
 * 
 * This replaces the in-memory SignalingService to enable:
 * - Shared state across multiple NestJS instances
 * - Automatic failover when instances restart
 * - Consistent participant tracking across load-balanced servers
 */
@Injectable()
export class RedisSignalingService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisSignalingService.name);
  private readonly instanceId: string;

  constructor(private readonly redisService: RedisService) {
    // Generate unique instance ID for this server
    this.instanceId = `backend-${process.env.HOSTNAME || process.pid}-${Date.now()}`;
    this.logger.log(`Initialized RedisSignalingService with instance ID: ${this.instanceId}`);
  }

  async onModuleDestroy() {
    // Cleanup this instance's meetings on shutdown
    await this.cleanupInstance();
  }

  /**
   * Add a participant to a meeting room
   */
  async addParticipant(presence: ParticipantPresence): Promise<void> {
    const { meetingId, participantId, socketId } = presence;
    const redis = this.redisService.getClient();

    const pipeline = redis.pipeline();

    // Store participant presence in meeting hash
    pipeline.hset(
      MEETING_PARTICIPANTS_KEY(meetingId),
      participantId,
      JSON.stringify(presence)
    );
    pipeline.expire(MEETING_PARTICIPANTS_KEY(meetingId), PRESENCE_TTL);

    // Store socket -> meeting/participant mapping
    pipeline.set(
      SOCKET_MAPPING_KEY(socketId),
      JSON.stringify({ meetingId, participantId }),
      'EX',
      PRESENCE_TTL
    );

    // Track which server instance is handling this meeting
    pipeline.set(MEETING_SERVER_KEY(meetingId), this.instanceId, 'EX', PRESENCE_TTL);

    // Track meetings on this server instance
    pipeline.sadd(SERVER_MEETINGS_KEY(this.instanceId), meetingId);
    pipeline.expire(SERVER_MEETINGS_KEY(this.instanceId), PRESENCE_TTL);

    await pipeline.exec();

    this.logger.log(
      `Participant ${participantId} joined meeting ${meetingId} (socket: ${socketId})`
    );
  }

  /**
   * Remove a participant from a meeting room
   */
  async removeParticipant(meetingId: string, participantId: string): Promise<ParticipantPresence | null> {
    const redis = this.redisService.getClient();

    // Get presence before removal
    const presenceJson = await redis.hget(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
    if (!presenceJson) {
      return null;
    }

    const presence: ParticipantPresence = JSON.parse(presenceJson);
    const pipeline = redis.pipeline();

    // Remove from meeting participants
    pipeline.hdel(MEETING_PARTICIPANTS_KEY(meetingId), participantId);

    // Remove socket mapping
    pipeline.del(SOCKET_MAPPING_KEY(presence.socketId));

    await pipeline.exec();

    // Check if room is empty
    const remainingCount = await redis.hlen(MEETING_PARTICIPANTS_KEY(meetingId));
    if (remainingCount === 0) {
      await this.cleanupEmptyMeeting(meetingId);
    }

    this.logger.log(`Participant ${participantId} left meeting ${meetingId}`);
    return presence;
  }

  /**
   * Remove participant by socket ID (used on disconnect)
   */
  async removeParticipantBySocket(socketId: string): Promise<ParticipantPresence | null> {
    const redis = this.redisService.getClient();

    const mappingJson = await redis.get(SOCKET_MAPPING_KEY(socketId));
    if (!mappingJson) {
      return null;
    }

    const { meetingId, participantId } = JSON.parse(mappingJson);
    return this.removeParticipant(meetingId, participantId);
  }

  /**
   * Update participant's media state (audio/video/screen)
   */
  async updateMediaState(
    meetingId: string,
    participantId: string,
    updates: { audio?: boolean; video?: boolean; screenSharing?: boolean }
  ): Promise<ParticipantPresence | null> {
    const redis = this.redisService.getClient();

    const presenceJson = await redis.hget(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
    if (!presenceJson) {
      return null;
    }

    const presence: ParticipantPresence = JSON.parse(presenceJson);

    if (updates.audio !== undefined) presence.audio = updates.audio;
    if (updates.video !== undefined) presence.video = updates.video;
    if (updates.screenSharing !== undefined) presence.screenSharing = updates.screenSharing;

    await redis.hset(
      MEETING_PARTICIPANTS_KEY(meetingId),
      participantId,
      JSON.stringify(presence)
    );
    await redis.expire(MEETING_PARTICIPANTS_KEY(meetingId), PRESENCE_TTL);

    this.logger.log(`Updated media state for ${participantId} in meeting ${meetingId}`);
    return presence;
  }

  /**
   * Get all participants in a meeting room
   */
  async getParticipants(meetingId: string): Promise<ParticipantPresence[]> {
    const redis = this.redisService.getClient();

    const participantsHash = await redis.hgetall(MEETING_PARTICIPANTS_KEY(meetingId));
    return Object.values(participantsHash).map((json) => JSON.parse(json));
  }

  /**
   * Get a specific participant's presence
   */
  async getParticipant(meetingId: string, participantId: string): Promise<ParticipantPresence | null> {
    const redis = this.redisService.getClient();

    const presenceJson = await redis.hget(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
    return presenceJson ? JSON.parse(presenceJson) : null;
  }

  /**
   * Get participant presence by socket ID
   */
  async getParticipantBySocket(socketId: string): Promise<ParticipantPresence | null> {
    const redis = this.redisService.getClient();

    const mappingJson = await redis.get(SOCKET_MAPPING_KEY(socketId));
    if (!mappingJson) {
      return null;
    }

    const { meetingId, participantId } = JSON.parse(mappingJson);
    return this.getParticipant(meetingId, participantId);
  }

  /**
   * Check if a participant is in a meeting
   */
  async isParticipantInMeeting(meetingId: string, participantId: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    return await redis.hexists(MEETING_PARTICIPANTS_KEY(meetingId), participantId) === 1;
  }

  /**
   * Get count of active participants in a meeting
   */
  async getParticipantCount(meetingId: string): Promise<number> {
    const redis = this.redisService.getClient();
    return await redis.hlen(MEETING_PARTICIPANTS_KEY(meetingId));
  }

  /**
   * Refresh TTL for active meeting/participant
   */
  async refreshPresence(meetingId: string, participantId: string): Promise<void> {
    const redis = this.redisService.getClient();
    const pipeline = redis.pipeline();

    pipeline.expire(MEETING_PARTICIPANTS_KEY(meetingId), PRESENCE_TTL);
    pipeline.expire(MEETING_SERVER_KEY(meetingId), PRESENCE_TTL);

    const presence = await this.getParticipant(meetingId, participantId);
    if (presence) {
      pipeline.expire(SOCKET_MAPPING_KEY(presence.socketId), PRESENCE_TTL);
    }

    await pipeline.exec();
  }

  /**
   * Get the server instance handling a meeting
   */
  async getMeetingServer(meetingId: string): Promise<string | null> {
    return await this.redisService.get(MEETING_SERVER_KEY(meetingId));
  }

  /**
   * Get all meetings handled by this server instance
   */
  async getInstanceMeetings(): Promise<string[]> {
    return await this.redisService.smembers(SERVER_MEETINGS_KEY(this.instanceId));
  }

  /**
   * Get global meeting statistics
   */
  async getGlobalStats(): Promise<{ totalMeetings: number; totalParticipants: number }> {
    const redis = this.redisService.getClient();
    
    // Scan for all meeting keys
    const meetingKeys: string[] = [];
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'meeting:*:participants', 'COUNT', 100);
      cursor = newCursor;
      meetingKeys.push(...keys);
    } while (cursor !== '0');

    let totalParticipants = 0;
    for (const key of meetingKeys) {
      totalParticipants += await redis.hlen(key);
    }

    return {
      totalMeetings: meetingKeys.length,
      totalParticipants,
    };
  }

  /**
   * Cleanup empty meeting data
   */
  private async cleanupEmptyMeeting(meetingId: string): Promise<void> {
    const redis = this.redisService.getClient();
    const pipeline = redis.pipeline();

    pipeline.del(MEETING_PARTICIPANTS_KEY(meetingId));
    pipeline.del(MEETING_SERVER_KEY(meetingId));
    pipeline.srem(SERVER_MEETINGS_KEY(this.instanceId), meetingId);

    await pipeline.exec();
    this.logger.log(`Meeting room ${meetingId} cleaned up`);
  }

  /**
   * Cleanup all meetings handled by this instance (on shutdown)
   */
  private async cleanupInstance(): Promise<void> {
    const redis = this.redisService.getClient();

    const meetings = await this.getInstanceMeetings();
    this.logger.log(`Cleaning up ${meetings.length} meetings for instance ${this.instanceId}`);

    for (const meetingId of meetings) {
      // Just remove server assignment, let participants reconnect
      await redis.del(MEETING_SERVER_KEY(meetingId));
    }

    await redis.del(SERVER_MEETINGS_KEY(this.instanceId));
    this.logger.log(`Instance ${this.instanceId} cleanup complete`);
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }
}
