import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import type { Worker } from 'mediasoup/node/lib/WorkerTypes';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';
import type { Consumer } from 'mediasoup/node/lib/ConsumerTypes';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface Peer {
  id: string;
  userId: string;
  socketId: string;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  joinedAt: Date;
}

export interface Room {
  id: string;
  router: Router;
  peers: Map<string, Peer>;
  createdAt: Date;
}

@Injectable()
export class RoomService implements OnModuleInit {
  private workers: Worker[] = [];
  private nextWorkerIdx = 0;
  private rooms: Map<string, Room> = new Map();

  async onModuleInit(): Promise<void> {
    await this.createWorkers();
  }

  /**
   * Create mediasoup workers on server bootstrap
   */
  private async createWorkers(): Promise<void> {
    const { numWorkers, worker: workerSettings } = config.mediasoup;

    logger.info({ numWorkers }, 'Creating mediasoup workers...');

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: workerSettings.logLevel,
        logTags: workerSettings.logTags,
        rtcMinPort: workerSettings.rtcMinPort,
        rtcMaxPort: workerSettings.rtcMaxPort,
      });

      worker.on('died', (error) => {
        logger.error({ workerId: i, error }, 'Mediasoup worker died, restarting...');
        this.workers = this.workers.filter((w) => w !== worker);
        this.createWorkers();
      });

      this.workers.push(worker);
      logger.info({ workerId: i, pid: worker.pid }, 'Mediasoup worker created');
    }

    logger.info({ count: this.workers.length }, 'All mediasoup workers created');
  }

  /**
   * Get next worker using round-robin
   */
  private getNextWorker(): Worker {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  /**
   * Get or create a room with a router
   * Never throws "Room not found" - always creates if missing
   */
  async getOrCreateRoom(roomId: string): Promise<Room> {
    let room = this.rooms.get(roomId);

    if (!room) {
      const worker = this.getNextWorker();
      const router = await worker.createRouter({
        mediaCodecs: config.mediasoup.router.mediaCodecs,
      });

      room = {
        id: roomId,
        router,
        peers: new Map(),
        createdAt: new Date(),
      };

      this.rooms.set(roomId, room);
      logger.info({ roomId, workerId: worker.pid }, 'Room created with router');
    }

    return room;
  }

  /**
   * Get room - creates if not exists (never throws)
   */
  async getRoom(roomId: string): Promise<Room> {
    return this.getOrCreateRoom(roomId);
  }

  /**
   * Add peer to room
   */
  async addPeer(roomId: string, peerId: string, userId: string, socketId: string): Promise<Peer> {
    const room = await this.getOrCreateRoom(roomId);

    const peer: Peer = {
      id: peerId,
      userId,
      socketId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      joinedAt: new Date(),
    };

    room.peers.set(peerId, peer);
    logger.info({ roomId, peerId, userId }, 'Peer joined room');

    return peer;
  }

  /**
   * Get peer from room
   */
  getPeer(roomId: string, peerId: string): Peer | undefined {
    const room = this.rooms.get(roomId);
    return room?.peers.get(peerId);
  }

  /**
   * Remove peer from room and cleanup resources
   */
  removePeer(roomId: string, peerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (!peer) return;

    // Close all consumers
    for (const consumer of peer.consumers.values()) {
      consumer.close();
    }

    // Close all producers
    for (const producer of peer.producers.values()) {
      producer.close();
    }

    // Close all transports
    for (const transport of peer.transports.values()) {
      transport.close();
    }

    room.peers.delete(peerId);
    logger.info({ roomId, peerId }, 'Peer removed from room');

    // Clean up empty rooms
    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(roomId);
      logger.info({ roomId }, 'Empty room closed');
    }
  }

  /**
   * Create WebRTC transport for a peer
   */
  async createTransport(
    roomId: string,
    peerId: string,
    direction: 'send' | 'recv'
  ): Promise<WebRtcTransport> {
    const room = await this.getOrCreateRoom(roomId);
    let peer = room.peers.get(peerId);

    // Auto-create peer if not exists (reconnection safety)
    if (!peer) {
      peer = {
        id: peerId,
        userId: 'reconnected-user',
        socketId: '',
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        joinedAt: new Date(),
      };
      room.peers.set(peerId, peer);
      logger.info({ roomId, peerId }, 'Peer auto-created during transport creation');
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate:
        config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
      appData: { direction, peerId },
    });

    if (direction === 'recv') {
      await transport.setMaxIncomingBitrate(
        config.mediasoup.webRtcTransport.maxIncomingBitrate
      );
    }

    peer.transports.set(transport.id, transport);
    logger.info({ roomId, peerId, transportId: transport.id, direction }, 'Transport created');

    return transport;
  }

  /**
   * Connect transport
   */
  async connectTransport(
    roomId: string,
    peerId: string,
    transportId: string,
    dtlsParameters: any
  ): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    const peer = room.peers.get(peerId);

    if (!peer) {
      throw new Error('Peer not found');
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    await transport.connect({ dtlsParameters });
    logger.info({ roomId, peerId, transportId }, 'Transport connected');
  }

  /**
   * Create producer
   */
  async createProducer(
    roomId: string,
    peerId: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: any,
    appData?: any
  ): Promise<Producer> {
    const room = await this.getOrCreateRoom(roomId);
    const peer = room.peers.get(peerId);

    if (!peer) {
      throw new Error('Peer not found');
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId },
    });

    peer.producers.set(producer.id, producer);
    logger.info({ roomId, peerId, producerId: producer.id, kind }, 'Producer created');

    return producer;
  }

  /**
   * Create consumer
   */
  async createConsumer(
    roomId: string,
    peerId: string,
    producerId: string,
    rtpCapabilities: any
  ): Promise<Consumer | null> {
    const room = await this.getOrCreateRoom(roomId);
    const peer = room.peers.get(peerId);

    if (!peer) {
      throw new Error('Peer not found');
    }

    // Find producer in any peer
    let producer: Producer | undefined;
    for (const p of room.peers.values()) {
      producer = p.producers.get(producerId);
      if (producer) break;
    }

    if (!producer) {
      throw new Error('Producer not found');
    }

    // Check if router can consume
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      logger.warn({ producerId, peerId }, 'Cannot consume producer');
      return null;
    }

    // Find recv transport
    const recvTransport = Array.from(peer.transports.values()).find(
      (t) => t.appData.direction === 'recv'
    );

    if (!recvTransport) {
      throw new Error('Recv transport not found');
    }

    const consumer = await recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });

    peer.consumers.set(consumer.id, consumer);
    logger.info({ roomId, peerId, consumerId: consumer.id, producerId }, 'Consumer created');

    return consumer;
  }

  /**
   * Resume consumer
   */
  async resumeConsumer(roomId: string, peerId: string, consumerId: string): Promise<void> {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) throw new Error('Peer not found');

    const consumer = peer.consumers.get(consumerId);
    if (!consumer) throw new Error('Consumer not found');

    await consumer.resume();
    logger.info({ consumerId }, 'Consumer resumed');
  }

  /**
   * Close producer
   */
  closeProducer(roomId: string, peerId: string, producerId: string): void {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (producer) {
      producer.close();
      peer.producers.delete(producerId);
      logger.info({ producerId }, 'Producer closed');
    }
  }

  /**
   * Get all producers in a room except from a specific peer
   */
  getOtherProducers(roomId: string, excludePeerId: string): Array<{ peerId: string; producerId: string; kind: string }> {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const producers: Array<{ peerId: string; producerId: string; kind: string }> = [];

    for (const [peerId, peer] of room.peers) {
      if (peerId === excludePeerId) continue;

      for (const [producerId, producer] of peer.producers) {
        producers.push({
          peerId,
          producerId,
          kind: producer.kind,
        });
      }
    }

    return producers;
  }

  /**
   * Get room stats
   */
  getStats(): { rooms: number; peers: number; workers: number; producers: number; consumers: number } {
    let peers = 0;
    let producers = 0;
    let consumers = 0;

    for (const room of this.rooms.values()) {
      peers += room.peers.size;
      for (const peer of room.peers.values()) {
        producers += peer.producers.size;
        consumers += peer.consumers.size;
      }
    }

    return {
      rooms: this.rooms.size,
      peers,
      workers: this.workers.length,
      producers,
      consumers,
    };
  }

  /**
   * Close all rooms gracefully (for shutdown)
   */
  async closeAllRooms(): Promise<void> {
    logger.info({ roomCount: this.rooms.size }, 'Closing all rooms...');

    for (const [roomId, room] of this.rooms) {
      // Close all peers in the room
      for (const [peerId] of room.peers) {
        this.removePeer(roomId, peerId);
      }

      // Close the router
      room.router.close();
      this.rooms.delete(roomId);
    }

    // Close all workers
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];

    logger.info('All rooms and workers closed');
  }
}
