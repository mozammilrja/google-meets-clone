import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { SignalingService } from './signaling.service';
import { AuditService } from '../audit/audit.service';
import { ChatService } from '../meetings/services/chat.service';
import { RedisService } from '../redis/redis.service';
import {
  JoinMeetingDto,
  LeaveMeetingDto,
  OfferDto,
  AnswerDto,
  IceCandidateDto,
  MediaStateDto,
  MeetingStateSyncDto,
  SendMessageDto,
} from './dto/signaling-events.dto';
import { ParticipantPresence } from './interfaces/participant-presence.interface';

/**
 * SignalingGateway handles WebSocket (Socket.IO) connections for real-time signaling.
 * 
 * Responsibilities:
 * - WebRTC signaling (offer, answer, ICE candidates)
 * - Participant presence tracking (join, leave, media state)
 * - Meeting room management (broadcast to participants)
 * - JWT authentication for WebSocket connections
 * - Audit logging for key signaling events
 * 
 * Events:
 * - join-meeting: Participant joins a meeting room
 * - leave-meeting: Participant leaves a meeting room
 * - offer: WebRTC offer (SDP)
 * - answer: WebRTC answer (SDP)
 * - ice-candidate: WebRTC ICE candidate
 * - media-state: Audio/video/screen sharing state update
 * - meeting-state-sync: Request for current meeting state
 * 
 * Emitted Events:
 * - participant-joined: Broadcast when someone joins
 * - participant-left: Broadcast when someone leaves
 * - participant-updated: Broadcast when media state changes
 * - offer: Forward WebRTC offer to target peer
 * - answer: Forward WebRTC answer to target peer
 * - ice-candidate: Forward ICE candidate to target peer
 * - meeting-state: Current list of participants (response to sync request)
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/signaling',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class SignalingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SignalingGateway.name);

  constructor(
    private readonly signalingService: SignalingService,
    private readonly auditService: AuditService,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize Redis adapter for Socket.IO after server is ready.
   * This enables pub/sub across multiple backend instances.
   */
  afterInit(server: Server) {
    try {
      const pubClient = this.redisService.getPublisher();
      const subClient = this.redisService.getSubscriber();
      
      // Create Redis adapter for Socket.IO
      if (pubClient && subClient && typeof server.adapter === 'function') {
        server.adapter(createAdapter(pubClient, subClient));
        this.logger.log('Socket.IO Redis adapter initialized for multi-instance support');
      }
    } catch (error) {
      this.logger.warn('Failed to initialize Redis adapter, running in single-instance mode');
    }
  }

  /**
   * Handle new WebSocket connection with JWT authentication
   */
  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake auth or query
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token as string);
      
      // Store user info in socket data for later use
      client.data.userId = payload.userId;
      client.data.email = payload.email;
      client.data.roles = payload.roles;

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.email})`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        `Connection rejected: Invalid token (${client.id}) - ${err.message}`,
      );
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection - remove participant from all meetings
   */
  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const socketId = client.id;

    // Find and remove participant by socket ID
    const presence = this.signalingService.removeParticipantBySocket(socketId);
    
    if (presence) {
      // Notify other participants in the meeting
      this.server
        .to(presence.meetingId)
        .emit('participant-left', {
          participantId: presence.participantId,
          userId: presence.userId,
          name: presence.name,
          leftAt: new Date(),
        });

      // Log audit event (skip if no userId to avoid validation errors)
      if (userId) {
        await this.auditService.log({
          actorId: userId,
          actorIP: client.handshake.address,
          actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
          action: 'signaling.disconnect',
        resource: 'meeting',
        resourceId: presence.meetingId,
        metadata: {
          participantId: presence.participantId,
          reason: 'socket_disconnect',
        },
          success: true,
        });
      }

      this.logger.log(
        `Client disconnected: ${socketId} (user: ${userId}, participant: ${presence.participantId})`,
      );
    } else {
      this.logger.log(`Client disconnected: ${socketId} (user: ${userId})`);
    }
  }

  /**
   * Handle participant joining a meeting room
   */
  @SubscribeMessage('join-meeting')
  async handleJoinMeeting(
    @MessageBody() data: JoinMeetingDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId } = data;
    const userId = client.data.userId;

    this.logger.log(`[join-meeting] User ${userId} / Participant ${participantId} joining room: ${meetingId}`);

    try {
      // TODO: Validate that participantId exists in database and belongs to this meeting
      // For now, we trust the client to provide valid IDs

      // Join Socket.IO room for this meeting
      await client.join(meetingId);
      
      // Log the rooms the client is in
      const rooms = Array.from(client.rooms);
      this.logger.log(`[join-meeting] Client ${client.id} is now in rooms: ${rooms.join(', ')}`);

      // Create presence record
      const presence: ParticipantPresence = {
        participantId,
        userId,
        meetingId,
        socketId: client.id,
        name: client.data.email, // TODO: Get actual name from participant record
        role: 'participant', // TODO: Get actual role from participant record
        audio: false,
        video: false,
        screenSharing: false,
        connectedAt: new Date(),
      };

      this.signalingService.addParticipant(presence);

      // Get current participants in the meeting
      const participants = this.signalingService.getParticipants(meetingId);

      // Notify other participants that someone joined
      client.to(meetingId).emit('participant-joined', {
        participantId: presence.participantId,
        userId: presence.userId,
        name: presence.name,
        role: presence.role,
        audio: presence.audio,
        video: presence.video,
        screenSharing: presence.screenSharing,
        joinedAt: presence.connectedAt,
      });

      // Send current meeting state to the newly joined participant
      client.emit('meeting-state', {
        meetingId,
        participants: participants.map((p) => ({
          participantId: p.participantId,
          userId: p.userId,
          name: p.name,
          role: p.role,
          audio: p.audio,
          video: p.video,
          screenSharing: p.screenSharing,
        })),
        timestamp: new Date(),
      });

      // Audit log (skip if no userId to avoid validation errors)
      if (userId) {
        await this.auditService.log({
          actorId: userId,
          actorIP: client.handshake.address,
          actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
          action: 'signaling.join_meeting',
          resource: 'meeting',
          resourceId: meetingId,
          metadata: {
            participantId,
            participantCount: participants.length,
          },
          success: true,
        });
      }

      this.logger.log(
        `Participant ${participantId} joined meeting ${meetingId} via socket ${client.id}`,
      );

      return { success: true, participantCount: participants.length };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error in join-meeting: ${err.message}`,
        err.stack,
      );
      
      if (userId) {
        await this.auditService.log({
          actorId: userId,
          actorIP: client.handshake.address,
          actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
          action: 'signaling.join_meeting',
          resource: 'meeting',
          resourceId: meetingId,
          metadata: { participantId, error: err.message },
          success: false,
          errorMessage: err.message,
        });
      }

      throw new WsException(err.message);
    }
  }

  /**
   * Handle participant leaving a meeting room
   */
  @SubscribeMessage('leave-meeting')
  async handleLeaveMeeting(
    @MessageBody() data: LeaveMeetingDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId } = data;
    const userId = client.data.userId;

    try {
      // Remove participant from presence tracking
      const presence = this.signalingService.removeParticipant(
        meetingId,
        participantId,
      );

      if (presence) {
        // Leave Socket.IO room
        await client.leave(meetingId);

        // Notify other participants
        client.to(meetingId).emit('participant-left', {
          participantId,
          userId,
          name: presence.name,
          leftAt: new Date(),
        });

        // Audit log
        await this.auditService.log({
          actorId: userId,
          actorIP: client.handshake.address,
          actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
          action: 'signaling.leave_meeting',
          resource: 'meeting',
          resourceId: meetingId,
          metadata: { participantId },
          success: true,
        });

        this.logger.log(
          `Participant ${participantId} left meeting ${meetingId}`,
        );

        return { success: true };
      } else {
        throw new Error('Participant not found in meeting');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error in leave-meeting: ${err.message}`,
        err.stack,
      );
      
      await this.auditService.log({
        actorId: userId,
        actorIP: client.handshake.address,
        actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
        action: 'signaling.leave_meeting',
        resource: 'meeting',
        resourceId: meetingId,
        metadata: { participantId, error: err.message },
        success: false,
        errorMessage: err.message,
      });

      throw new WsException(err.message);
    }
  }

  /**
   * Handle WebRTC offer (SDP) - forward to target peer
   */
  @SubscribeMessage('offer')
  async handleOffer(
    @MessageBody() data: OfferDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId, targetParticipantId, sdp } = data;

    try {
      // Verify participant is in the meeting
      if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
        throw new Error('Participant not in meeting');
      }

      // Get target participant
      const targetPresence = this.signalingService.getParticipant(
        meetingId,
        targetParticipantId,
      );

      if (!targetPresence) {
        throw new Error('Target participant not found');
      }

      // Forward offer to target participant's socket
      this.server.to(targetPresence.socketId).emit('offer', {
        participantId,
        sdp,
      });

      this.logger.debug(
        `Forwarded WebRTC offer from ${participantId} to ${targetParticipantId} in meeting ${meetingId}`,
      );

      return { success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error in offer: ${err.message}`, err.stack);
      throw new WsException(err.message);
    }
  }

  /**
   * Handle WebRTC answer (SDP) - forward to target peer
   */
  @SubscribeMessage('answer')
  async handleAnswer(
    @MessageBody() data: AnswerDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId, targetParticipantId, sdp } = data;

    try {
      // Verify participant is in the meeting
      if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
        throw new Error('Participant not in meeting');
      }

      // Get target participant
      const targetPresence = this.signalingService.getParticipant(
        meetingId,
        targetParticipantId,
      );

      if (!targetPresence) {
        throw new Error('Target participant not found');
      }

      // Forward answer to target participant's socket
      this.server.to(targetPresence.socketId).emit('answer', {
        participantId,
        sdp,
      });

      this.logger.debug(
        `Forwarded WebRTC answer from ${participantId} to ${targetParticipantId} in meeting ${meetingId}`,
      );

      return { success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error in answer: ${err.message}`, err.stack);
      throw new WsException(err.message);
    }
  }

  /**
   * Handle WebRTC ICE candidate - forward to target peer
   */
  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @MessageBody() data: IceCandidateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId, targetParticipantId, candidate } = data;

    try {
      // Verify participant is in the meeting
      if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
        throw new Error('Participant not in meeting');
      }

      // Get target participant
      const targetPresence = this.signalingService.getParticipant(
        meetingId,
        targetParticipantId,
      );

      if (!targetPresence) {
        throw new Error('Target participant not found');
      }

      // Forward ICE candidate to target participant's socket
      this.server.to(targetPresence.socketId).emit('ice-candidate', {
        participantId,
        candidate,
      });

      this.logger.debug(
        `Forwarded ICE candidate from ${participantId} to ${targetParticipantId} in meeting ${meetingId}`,
      );

      return { success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error in ice-candidate: ${err.message}`,
        err.stack,
      );
      throw new WsException(err.message);
    }
  }

  /**
   * Handle media state updates (audio/video/screen sharing toggle)
   */
  @SubscribeMessage('media-state')
  async handleMediaState(
    @MessageBody() data: MediaStateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId, audio, video, screenSharing } = data;
    const userId = client.data.userId;

    try {
      // Update media state in presence tracker
      const presence = this.signalingService.updateMediaState(
        meetingId,
        participantId,
        { audio, video, screenSharing },
      );

      if (!presence) {
        throw new Error('Participant not found in meeting');
      }

      // Broadcast updated state to all participants in the meeting
      this.server.to(meetingId).emit('participant-updated', {
        participantId,
        audio: presence.audio,
        video: presence.video,
        screenSharing: presence.screenSharing,
        timestamp: new Date(),
      });

      this.logger.log(
        `Media state updated for ${participantId} in meeting ${meetingId}: audio=${presence.audio}, video=${presence.video}, screen=${presence.screenSharing}`,
      );

      return { success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error in media-state: ${err.message}`,
        err.stack,
      );
      throw new WsException(err.message);
    }
  }

  /**
   * Handle meeting state sync request - return current participants
   */
  @SubscribeMessage('meeting-state-sync')
  async handleMeetingStateSync(
    @MessageBody() data: MeetingStateSyncDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId } = data;

    try {
      const participants = this.signalingService.getParticipants(meetingId);

      return {
        meetingId,
        participants: participants.map((p) => ({
          participantId: p.participantId,
          userId: p.userId,
          name: p.name,
          role: p.role,
          audio: p.audio,
          video: p.video,
          screenSharing: p.screenSharing,
        })),
        timestamp: new Date(),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error in meeting-state-sync: ${err.message}`,
        err.stack,
      );
      throw new WsException(err.message);
    }
  }

  /**
   * Handle chat message - save to database and broadcast to meeting participants
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, participantId, participantName, message } = data;
    const userId = client.data.userId;

    this.logger.log(`[Chat] Received send-message from ${participantId} in meeting ${meetingId}: "${message}"`);

    try {
      // Validate message
      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 1000) {
        throw new Error('Message cannot exceed 1000 characters');
      }

      // Save message to database
      const savedMessage = await this.chatService.saveMessage(
        meetingId,
        participantId,
        participantName,
        message,
      );

      // Get all sockets in the room to log
      const roomSockets = await this.server.in(meetingId).fetchSockets();
      this.logger.log(`[Chat] Broadcasting to ${roomSockets.length} sockets in room ${meetingId}`);

      // Broadcast message to all participants in the meeting
      this.server.to(meetingId).emit('message-received', {
        id: savedMessage._id?.toString(),
        participantId,
        participantName,
        message,
        timestamp: savedMessage.timestamp,
      });

      this.logger.log(
        `Chat message sent in meeting ${meetingId} by ${participantId}`,
      );

      // Audit log (skip if no userId to avoid validation errors)
      if (userId) {
        await this.auditService.log({
          actorId: userId,
          actorIP: client.handshake.address,
          actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
          action: 'chat.send_message',
          resource: 'meeting',
          resourceId: meetingId,
          metadata: { participantId, messageLength: message.length },
          success: true,
        });
      }

      return { success: true, messageId: savedMessage._id };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error in send-message: ${err.message}`,
        err.stack,
      );
      throw new WsException(err.message);
    }
  }}