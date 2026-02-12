import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface JoinRoomData {
  roomId: string;
  participantId: string;
}

interface CreateTransportData {
  roomId: string;
  participantId: string;
  direction: 'send' | 'recv';
}

interface ConnectTransportData {
  transportId: string;
  dtlsParameters: any;
}

interface ProduceData {
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
  appData?: any;
}

interface ConsumeData {
  producerId: string;
  rtpCapabilities: any;
}

interface ResumeConsumerData {
  consumerId: string;
}

interface CloseProducerData {
  producerId: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: false,
})
@Injectable()
export class MediasoupGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomService: RoomService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    logger.info({ socketId: socket.id }, 'Client connected');

    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn({ socketId: socket.id }, 'Connection allowed without token (testing mode)');
      socket.data.userId = `test-user-${socket.id}`;
      socket.data.email = 'test@localhost';
    } else {
      try {
        const payload = this.authService.verifyToken(token as string);
        socket.data.userId = payload.sub;
        socket.data.email = payload.email;
        logger.info({ socketId: socket.id, userId: payload.sub }, 'Client authenticated');
      } catch (error) {
        logger.warn({ socketId: socket.id, error: getErrorMessage(error) }, 'Auth failed');
        socket.emit('error', { message: getErrorMessage(error) });
        socket.disconnect();
        return;
      }
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const { roomId, participantId } = socket.data;
    logger.info({ socketId: socket.id, roomId, participantId }, 'Client disconnected');

    if (roomId && participantId) {
      this.roomService.removePeer(roomId, participantId);
      socket.to(roomId).emit('participantLeft', { participantId });
    }
  }

  /**
   * Step 1: Join room - MUST be called first
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinRoomData,
  ): Promise<{ success: boolean; rtpCapabilities?: any; existingProducers?: any[]; error?: string }> {
    try {
      const { roomId, participantId } = data;
      
      logger.info({ 
        socketId: socket.id, 
        roomId, 
        participantId,
        socketConnected: socket.connected,
      }, 'Peer joining room');

      // Get or create room and add peer
      const room = await this.roomService.getOrCreateRoom(roomId);
      await this.roomService.addPeer(roomId, participantId, socket.data.userId, socket.id);

      // Store in socket data for subsequent calls
      socket.data.roomId = roomId;
      socket.data.participantId = participantId;

      // Verify storage
      logger.info({
        socketId: socket.id,
        storedRoomId: socket.data.roomId,
        storedParticipantId: socket.data.participantId,
      }, 'Socket data stored after join');

      // Join socket.io room
      await socket.join(roomId);

      // Notify others
      socket.to(roomId).emit('participantJoined', {
        participantId,
        userId: socket.data.userId,
      });

      // Get existing producers to consume
      const existingProducers = this.roomService.getOtherProducers(roomId, participantId);

      logger.info({ roomId, participantId, existingProducers: existingProducers.length }, 'Peer joined');

      return {
        success: true,
        rtpCapabilities: room.router.rtpCapabilities,
        existingProducers,
      };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'joinRoom failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Step 2: Get router RTP capabilities (can also be gotten from joinRoom response)
   */
  @SubscribeMessage('getRouterRtpCapabilities')
  async handleGetRouterRtpCapabilities(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId?: string },
  ): Promise<{ success: boolean; rtpCapabilities?: any; error?: string }> {
    try {
      const roomId = data?.roomId || socket.data.roomId || 'default-room';
      
      logger.info({ socketId: socket.id, roomId }, 'Getting RTP capabilities');

      // Always creates room if not exists
      const room = await this.roomService.getOrCreateRoom(roomId);

      return {
        success: true,
        rtpCapabilities: room.router.rtpCapabilities,
      };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'getRouterRtpCapabilities failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Step 3: Create WebRTC transport
   */
  @SubscribeMessage('createTransport')
  async handleCreateTransport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreateTransportData,
  ): Promise<{ success: boolean; id?: string; iceParameters?: any; iceCandidates?: any; dtlsParameters?: any; error?: string }> {
    try {
      // Use socket data if not provided (allows simpler client calls)
      const roomId = data.roomId || socket.data.roomId;
      const participantId = data.participantId || socket.data.participantId;
      const { direction } = data;

      if (!roomId) {
        // Auto-create a default room for reconnection safety
        const defaultRoomId = `room-${socket.id}`;
        socket.data.roomId = defaultRoomId;
        socket.data.participantId = socket.data.userId;
        
        logger.warn({ socketId: socket.id }, 'No roomId, creating default room');
        
        await this.roomService.getOrCreateRoom(defaultRoomId);
        await this.roomService.addPeer(
          defaultRoomId,
          socket.data.userId,
          socket.data.userId,
          socket.id
        );
      }

      const finalRoomId = roomId || socket.data.roomId;
      const finalParticipantId = participantId || socket.data.participantId;

      logger.info({ roomId: finalRoomId, participantId: finalParticipantId, direction }, 'Creating transport');

      const transport = await this.roomService.createTransport(
        finalRoomId,
        finalParticipantId,
        direction
      );

      return {
        success: true,
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'createTransport failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Step 4: Connect transport
   */
  @SubscribeMessage('connectTransport')
  async handleConnectTransport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ConnectTransportData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { transportId, dtlsParameters } = data;
      const roomId = socket.data.roomId;
      const participantId = socket.data.participantId;

      logger.info({
        socketId: socket.id,
        transportId,
        roomId,
        participantId,
        hasRoomId: !!roomId,
        hasParticipantId: !!participantId,
        socketDataKeys: Object.keys(socket.data),
      }, 'connectTransport called - checking socket.data');

      if (!roomId || !participantId) {
        logger.error({
          socketId: socket.id,
          roomId,
          participantId,
        }, 'Not joined to a room - socket.data missing');
        throw new Error('Not joined to a room. Call joinRoom first.');
      }

      logger.info({ roomId, participantId, transportId }, 'Connecting transport');

      await this.roomService.connectTransport(
        roomId,
        participantId,
        transportId,
        dtlsParameters
      );

      return { success: true };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'connectTransport failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Step 5: Produce media
   */
  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ProduceData,
  ): Promise<{ success: boolean; producerId?: string; error?: string }> {
    try {
      const { transportId, kind, rtpParameters, appData } = data;
      const roomId = socket.data.roomId;
      const participantId = socket.data.participantId;

      // Debug logging
      logger.info({ 
        socketId: socket.id, 
        roomId, 
        participantId,
        hasRoomId: !!roomId,
        socketData: socket.data,
      }, 'Produce request received');

      if (!roomId || !participantId) {
        logger.error({ 
          socketId: socket.id, 
          socketData: socket.data,
        }, 'Produce failed: socket not in room');
        throw new Error('Not joined to a room. Call joinRoom first.');
      }

      logger.info({ roomId, participantId, transportId, kind }, 'Creating producer');

      const producer = await this.roomService.createProducer(
        roomId,
        participantId,
        transportId,
        kind,
        rtpParameters,
        appData
      );

      // Notify others about new producer
      socket.to(roomId).emit('newProducer', {
        participantId,
        producerId: producer.id,
        kind,
        appData,
      });

      return { success: true, producerId: producer.id };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'produce failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Step 6: Consume remote producer
   */
  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ConsumeData,
  ): Promise<{ success: boolean; id?: string; producerId?: string; kind?: string; rtpParameters?: any; error?: string }> {
    try {
      const { producerId, rtpCapabilities } = data;
      const roomId = socket.data.roomId;
      const participantId = socket.data.participantId;

      if (!roomId || !participantId) {
        throw new Error('Not joined to a room. Call joinRoom first.');
      }

      logger.info({ roomId, participantId, producerId }, 'Creating consumer');

      const consumer = await this.roomService.createConsumer(
        roomId,
        participantId,
        producerId,
        rtpCapabilities
      );

      if (!consumer) {
        return { success: false, error: 'Cannot consume this producer' };
      }

      return {
        success: true,
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'consume failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Resume consumer (after consume, consumers are paused)
   */
  @SubscribeMessage('resumeConsumer')
  async handleResumeConsumer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ResumeConsumerData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { consumerId } = data;
      const roomId = socket.data.roomId;
      const participantId = socket.data.participantId;

      if (!roomId || !participantId) {
        throw new Error('Not joined to a room. Call joinRoom first.');
      }

      await this.roomService.resumeConsumer(roomId, participantId, consumerId);

      return { success: true };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'resumeConsumer failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Close producer
   */
  @SubscribeMessage('closeProducer')
  async handleCloseProducer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CloseProducerData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { producerId } = data;
      const roomId = socket.data.roomId;
      const participantId = socket.data.participantId;

      if (!roomId || !participantId) {
        throw new Error('Not joined to a room. Call joinRoom first.');
      }

      this.roomService.closeProducer(roomId, participantId, producerId);

      // Notify others
      socket.to(roomId).emit('producerClosed', { participantId, producerId });

      return { success: true };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'closeProducer failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get server stats
   */
  @SubscribeMessage('getStats')
  async handleGetStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const stats = this.roomService.getStats();
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }
}
