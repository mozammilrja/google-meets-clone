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
import { RouterManager, Participant } from './mediasoup/router-manager';
import { AuthService } from './services/auth.service';
import { TransportHandler } from './handlers/transport.handler';
import { ProducerHandler } from './handlers/producer.handler';
import { ConsumerHandler } from './handlers/consumer.handler';
import { logger } from './utils/logger';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
export class MediaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly routerManager: RouterManager,
    private readonly authService: AuthService,
    private readonly transportHandler: TransportHandler,
    private readonly producerHandler: ProducerHandler,
    private readonly consumerHandler: ConsumerHandler,
  ) {}

  async handleConnection(socket: Socket) {
    logger.info({ socketId: socket.id, transport: socket.conn?.transport?.name }, 'Client connected');

    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn({ socketId: socket.id }, 'Connection allowed without token (testing mode)');
      socket.data.userId = 'test-user';
      socket.data.email = 'test@localhost';
    } else {
      try {
        logger.info({ socketId: socket.id, tokenLength: (token as string).length }, 'Verifying token...');
        const payload = this.authService.verifyToken(token as string);
        socket.data.userId = payload.sub;
        socket.data.email = payload.email;
        logger.info({ socketId: socket.id, userId: payload.sub, email: payload.email }, 'Client authenticated');
      } catch (error) {
        logger.warn({ socketId: socket.id, error: getErrorMessage(error) }, 'Authentication failed');
        socket.emit('error', { message: getErrorMessage(error) });
        socket.disconnect();
        return;
      }
    }
  }

  async handleDisconnect(socket: Socket) {
    const { roomId, participantId } = socket.data;
    logger.info({ socketId: socket.id, roomId, participantId }, 'Client disconnected');

    if (roomId && participantId) {
      this.routerManager.removeParticipant(roomId, participantId);
      socket.to(roomId).emit('participantLeft', { participantId });
    }
  }

  @SubscribeMessage('getRouterRtpCapabilities')
  async handleGetRouterRtpCapabilities(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const roomId = data?.roomId || 'default-room';
      logger.info({ socketId: socket.id, roomId }, 'Getting router RTP capabilities');
      const room = await this.routerManager.getOrCreateRoom(roomId);
      return { success: true, rtpCapabilities: room.router.rtpCapabilities };
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'getRouterRtpCapabilities failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; participantId: string },
  ) {
    try {
      const { roomId, participantId } = data;
      const room = await this.routerManager.getOrCreateRoom(roomId);

      const participant: Participant = {
        id: participantId,
        userId: socket.data.userId,
        socketId: socket.id,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        joinedAt: new Date(),
      };

      this.routerManager.addParticipant(roomId, participant);
      socket.data.roomId = roomId;
      socket.data.participantId = participantId;

      await socket.join(roomId);
      socket.to(roomId).emit('participantJoined', { participantId, userId: socket.data.userId });

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'joinRoom failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('createTransport')
  async handleCreateTransport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; participantId: string; direction: 'send' | 'recv' },
  ) {
    try {
      const { roomId, participantId, direction } = data;
      const room = this.routerManager.getRoom(roomId);

      if (!room) throw new Error('Room not found');

      const transport = await this.transportHandler.createTransport(room.router, participantId, direction);

      const participant = this.routerManager.getParticipant(roomId, participantId);
      if (participant) {
        participant.transports.set(transport.id, transport);
        transport.appData.router = room.router;
      }

      return {
        success: true,
        transport: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      };
    } catch (error) {
      logger.error({ error }, 'createTransport failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('connectTransport')
  async handleConnectTransport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { transportId: string; dtlsParameters: any },
  ) {
    try {
      const { transportId, dtlsParameters } = data;
      const { roomId, participantId } = socket.data;
      const participant = this.routerManager.getParticipant(roomId, participantId);

      if (!participant) throw new Error('Participant not found');

      const transport = participant.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');

      await this.transportHandler.connectTransport(transport, dtlsParameters);
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'connectTransport failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { transportId: string; kind: any; rtpParameters: any; appData?: any },
  ) {
    try {
      const { transportId, kind, rtpParameters, appData } = data;
      const { roomId, participantId, userId } = socket.data;
      const participant = this.routerManager.getParticipant(roomId, participantId);

      if (!participant) throw new Error('Participant not found');

      const transport = participant.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');

      const producer = await this.producerHandler.createProducer(
        transport,
        kind,
        rtpParameters,
        participantId,
        roomId,
        userId,
        appData,
      );

      participant.producers.set(producer.id, producer);
      socket.to(roomId).emit('newProducer', { participantId, producerId: producer.id, kind, appData });

      return { success: true, producerId: producer.id };
    } catch (error) {
      logger.error({ error }, 'produce failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { producerId: string; rtpCapabilities: any },
  ) {
    try {
      const { producerId, rtpCapabilities } = data;
      const { roomId, participantId } = socket.data;
      const participant = this.routerManager.getParticipant(roomId, participantId);
      const room = this.routerManager.getRoom(roomId);

      if (!participant || !room) throw new Error('Participant or room not found');

      let producer = null;
      for (const p of room.participants.values()) {
        producer = p.producers.get(producerId);
        if (producer) break;
      }

      if (!producer) throw new Error('Producer not found');

      const recvTransport = Array.from(participant.transports.values()).find(
        (t) => !t.appData.direction || t.appData.direction === 'recv',
      );

      if (!recvTransport) throw new Error('Receive transport not found');

      const consumer = await this.consumerHandler.createConsumer(
        recvTransport,
        producer,
        rtpCapabilities,
        participantId,
      );

      if (!consumer) throw new Error('Cannot consume this producer');

      participant.consumers.set(consumer.id, consumer);

      return {
        success: true,
        consumer: {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        },
      };
    } catch (error) {
      logger.error({ error }, 'consume failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('resumeConsumer')
  async handleResumeConsumer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { consumerId: string },
  ) {
    try {
      const { consumerId } = data;
      const { roomId, participantId } = socket.data;
      const participant = this.routerManager.getParticipant(roomId, participantId);

      if (!participant) throw new Error('Participant not found');

      const consumer = participant.consumers.get(consumerId);
      if (!consumer) throw new Error('Consumer not found');

      await this.consumerHandler.resumeConsumer(consumer);
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'resumeConsumer failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }

  @SubscribeMessage('closeProducer')
  async handleCloseProducer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { producerId: string },
  ) {
    try {
      const { producerId } = data;
      const { roomId, participantId } = socket.data;
      const participant = this.routerManager.getParticipant(roomId, participantId);

      if (!participant) throw new Error('Participant not found');

      const producer = participant.producers.get(producerId);
      if (!producer) throw new Error('Producer not found');

      await this.producerHandler.closeProducer(producer);
      participant.producers.delete(producerId);

      socket.to(roomId).emit('producerClosed', { participantId, producerId });
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'closeProducer failed');
      return { success: false, error: getErrorMessage(error) };
    }
  }
}
