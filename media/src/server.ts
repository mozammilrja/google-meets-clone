import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { WorkerManager } from './mediasoup/worker-manager';
import { RouterManager, Participant } from './mediasoup/router-manager';
import { AuthService } from './services/auth.service';
import { RecordingService } from './services/recording.service';
import { TransportHandler } from './handlers/transport.handler';
import { ProducerHandler } from './handlers/producer.handler';
import { ConsumerHandler } from './handlers/consumer.handler';

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * MediaServer orchestrates the Mediasoup SFU with WebSocket communication.
 * 
 * Architecture:
 * 1. Client authenticates with JWT from backend
 * 2. Client joins a room (creates router if needed)
 * 3. Client creates transports for sending/receiving
 * 4. Client produces media (audio/video/screen)
 * 5. Server creates consumers for other participants
 * 6. Repeat for all participants in the room
 */
export class MediaServer {
  private app: express.Application;
  private httpServer: http.Server;
  private io: SocketIOServer;
  private workerManager: WorkerManager;
  private routerManager: RouterManager;
  private authService: AuthService;
  private recordingService: RecordingService;
  private transportHandler: TransportHandler;
  private producerHandler: ProducerHandler;
  private consumerHandler: ConsumerHandler;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    
    // Socket.IO server with CORS and transport configuration
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
      },
      // Force websocket only - no polling
      transports: ['websocket'],
      // Connection timeouts
      pingTimeout: 60000,
      pingInterval: 25000,
      // Allow upgrades
      allowUpgrades: false,
    });

    logger.info({ port: config.http.port }, 'Socket.IO server configured with websocket-only transport');

    // Initialize managers and handlers
    this.workerManager = new WorkerManager();
    this.routerManager = new RouterManager(this.workerManager);
    this.authService = new AuthService();
    this.recordingService = new RecordingService();
    this.transportHandler = new TransportHandler();
    this.producerHandler = new ProducerHandler(this.recordingService);
    this.consumerHandler = new ConsumerHandler();
  }

  /**
   * Initialize the media server
   */
  async init(): Promise<void> {
    // Create Mediasoup workers
    await this.workerManager.createWorkers();

    // Ensure recording directory exists
    await this.recordingService.ensureRecordingDirectory();

    // Setup Socket.IO event handlers
    this.setupSocketHandlers();

    // Setup HTTP routes
    this.setupHttpRoutes();

    logger.info('Media server initialized');
  }

  /**
   * Setup HTTP routes for health checks and status
   */
  private setupHttpRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });

    this.app.get('/stats', (req, res) => {
      const stats = {
        workers: this.workerManager.getWorkers().length,
        rooms: this.routerManager.getRoomStats(),
      };
      res.json(stats);
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    // Log connection attempts at engine level
    this.io.engine.on('connection_error', (err: any) => {
      logger.error({ code: err.code, message: err.message, context: err.context }, 'Socket.IO engine connection error');
    });

    this.io.engine.on('initial_headers', (headers: any, req: any) => {
      logger.info({ url: req.url, origin: req.headers.origin }, 'Initial headers');
    });

    this.io.on('connection', async (socket: Socket) => {
      logger.info({ socketId: socket.id, transport: socket.conn.transport.name }, 'Client connected via ' + socket.conn.transport.name);

      // TODO: Uncomment auth check after testing basic connectivity
      // Authenticate with JWT
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        logger.warn({ socketId: socket.id }, 'Connection allowed without token (testing mode)');
        socket.data.userId = 'test-user';
        socket.data.email = 'test@localhost';
      } else {
        try {
          logger.info({ socketId: socket.id, tokenLength: (token as string).length }, 'Verifying token...');
          const payload = this.authService.verifyToken(token as string);
          socket.data.userId = payload.sub; // JWT uses 'sub' for user ID
          socket.data.email = payload.email;

          logger.info(
            { socketId: socket.id, userId: payload.sub, email: payload.email },
            'Client authenticated'
          );
        } catch (error) {
          logger.warn({ socketId: socket.id, error: error instanceof Error ? error.message : String(error) }, 'Authentication failed');
          socket.emit('error', { message: error instanceof Error ? error.message : 'Authentication failed' });
          socket.disconnect();
          return;
        }
      }

      // ============================================================
      // Event: Get Router RTP Capabilities
      // ============================================================
      socket.on('getRouterRtpCapabilities', async (data, callback) => {
        try {
          const roomId = data?.roomId || 'default-room';
          logger.info({ socketId: socket.id, roomId }, 'Getting router RTP capabilities');
          const room = await this.routerManager.getOrCreateRoom(roomId);
          
          callback({
            success: true,
            rtpCapabilities: room.router.rtpCapabilities,
          });
        } catch (error) {
          logger.error({ error: error instanceof Error ? error.message : String(error) }, 'getRouterRtpCapabilities failed');
          callback({ success: false, error: error instanceof Error ? error.message : 'Failed to get RTP capabilities' });
        }
      });

      // ============================================================
      // Event: Join Room
      // ============================================================
      socket.on('joinRoom', async ({ roomId, participantId }, callback) => {
        try {
          const room = await this.routerManager.getOrCreateRoom(roomId);

          // Create participant record
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

          // Join Socket.IO room for broadcasting
          await socket.join(roomId);

          // Notify others that a new participant joined
          socket.to(roomId).emit('participantJoined', {
            participantId,
            userId: socket.data.userId,
          });

          callback({ success: true });
        } catch (error) {
          logger.error({ error }, 'joinRoom failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Create Transport
      // ============================================================
      socket.on('createTransport', async ({ roomId, participantId, direction }, callback) => {
        try {
          const room = this.routerManager.getRoom(roomId);
          
          if (!room) {
            throw new Error('Room not found');
          }

          const transport = await this.transportHandler.createTransport(
            room.router,
            participantId,
            direction
          );

          // Store transport reference
          const participant = this.routerManager.getParticipant(roomId, participantId);
          if (participant) {
            participant.transports.set(transport.id, transport);
            transport.appData.router = room.router;
          }

          callback({
            success: true,
            transport: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            },
          });
        } catch (error) {
          logger.error({ error }, 'createTransport failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Connect Transport
      // ============================================================
      socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
        try {
          const { roomId, participantId } = socket.data;
          const participant = this.routerManager.getParticipant(roomId, participantId);
          
          if (!participant) {
            throw new Error('Participant not found');
          }

          const transport = participant.transports.get(transportId);
          
          if (!transport) {
            throw new Error('Transport not found');
          }

          await this.transportHandler.connectTransport(transport, dtlsParameters);

          callback({ success: true });
        } catch (error) {
          logger.error({ error }, 'connectTransport failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Produce (send media)
      // ============================================================
      socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
        try {
          const { roomId, participantId, userId } = socket.data;
          const participant = this.routerManager.getParticipant(roomId, participantId);
          
          if (!participant) {
            throw new Error('Participant not found');
          }

          const transport = participant.transports.get(transportId);
          
          if (!transport) {
            throw new Error('Transport not found');
          }

          const producer = await this.producerHandler.createProducer(
            transport,
            kind,
            rtpParameters,
            participantId,
            roomId,
            userId,
            appData
          );

          // Store producer reference
          participant.producers.set(producer.id, producer);

          // Notify other participants about new producer
          socket.to(roomId).emit('newProducer', {
            participantId,
            producerId: producer.id,
            kind,
            appData,
          });

          callback({ success: true, producerId: producer.id });
        } catch (error) {
          logger.error({ error }, 'produce failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Consume (receive media)
      // ============================================================
      socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
        try {
          const { roomId, participantId } = socket.data;
          const participant = this.routerManager.getParticipant(roomId, participantId);
          const room = this.routerManager.getRoom(roomId);
          
          if (!participant || !room) {
            throw new Error('Participant or room not found');
          }

          // Find the producer (could be from any participant)
          let producer = null;
          for (const p of room.participants.values()) {
            producer = p.producers.get(producerId);
            if (producer) break;
          }

          if (!producer) {
            throw new Error('Producer not found');
          }

          // Get receive transport (or create if doesn't exist)
          const recvTransport = Array.from(participant.transports.values()).find(
            (t) => !t.appData.direction || t.appData.direction === 'recv'
          );

          if (!recvTransport) {
            throw new Error('Receive transport not found');
          }

          const consumer = await this.consumerHandler.createConsumer(
            recvTransport,
            producer,
            rtpCapabilities,
            participantId
          );

          if (!consumer) {
            throw new Error('Cannot consume this producer');
          }

          // Store consumer reference
          participant.consumers.set(consumer.id, consumer);

          callback({
            success: true,
            consumer: {
              id: consumer.id,
              producerId: consumer.producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            },
          });
        } catch (error) {
          logger.error({ error }, 'consume failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Resume Consumer
      // ============================================================
      socket.on('resumeConsumer', async ({ consumerId }, callback) => {
        try {
          const { roomId, participantId } = socket.data;
          const participant = this.routerManager.getParticipant(roomId, participantId);
          
          if (!participant) {
            throw new Error('Participant not found');
          }

          const consumer = participant.consumers.get(consumerId);
          
          if (!consumer) {
            throw new Error('Consumer not found');
          }

          await this.consumerHandler.resumeConsumer(consumer);

          callback({ success: true });
        } catch (error) {
          logger.error({ error }, 'resumeConsumer failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Close Producer
      // ============================================================
      socket.on('closeProducer', async ({ producerId }, callback) => {
        try {
          const { roomId, participantId } = socket.data;
          const participant = this.routerManager.getParticipant(roomId, participantId);
          
          if (!participant) {
            throw new Error('Participant not found');
          }

          const producer = participant.producers.get(producerId);
          
          if (!producer) {
            throw new Error('Producer not found');
          }

          await this.producerHandler.closeProducer(producer);
          participant.producers.delete(producerId);

          // Notify other participants
          socket.to(roomId).emit('producerClosed', { participantId, producerId });

          callback({ success: true });
        } catch (error) {
          logger.error({ error }, 'closeProducer failed');
          callback({ success: false, error: getErrorMessage(error) });
        }
      });

      // ============================================================
      // Event: Disconnect
      // ============================================================
      socket.on('disconnect', async () => {
        const { roomId, participantId } = socket.data;

        logger.info(
          { socketId: socket.id, roomId, participantId },
          'Client disconnected'
        );

        if (roomId && participantId) {
          // Remove participant from room
          this.routerManager.removeParticipant(roomId, participantId);

          // Notify others
          socket.to(roomId).emit('participantLeft', { participantId });
        }
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.init();

    this.httpServer.listen(config.http.port, () => {
      logger.info(
        {
          port: config.http.port,
          workers: this.workerManager.getWorkers().length,
        },
        'Media server listening'
      );
    });
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    logger.info('Shutting down media server...');

    this.io.close();
    await this.workerManager.closeAll();

    this.httpServer.close(() => {
      logger.info('Media server stopped');
    });
  }
}
