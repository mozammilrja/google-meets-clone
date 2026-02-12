import { OnModuleInit } from '@nestjs/common';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';
import type { Consumer } from 'mediasoup/node/lib/ConsumerTypes';
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
export declare class RoomService implements OnModuleInit {
    private workers;
    private nextWorkerIdx;
    private rooms;
    onModuleInit(): Promise<void>;
    private createWorkers;
    private getNextWorker;
    getOrCreateRoom(roomId: string): Promise<Room>;
    getRoom(roomId: string): Promise<Room>;
    addPeer(roomId: string, peerId: string, userId: string, socketId: string): Promise<Peer>;
    getPeer(roomId: string, peerId: string): Peer | undefined;
    removePeer(roomId: string, peerId: string): void;
    createTransport(roomId: string, peerId: string, direction: 'send' | 'recv'): Promise<WebRtcTransport>;
    connectTransport(roomId: string, peerId: string, transportId: string, dtlsParameters: any): Promise<void>;
    createProducer(roomId: string, peerId: string, transportId: string, kind: 'audio' | 'video', rtpParameters: any, appData?: any): Promise<Producer>;
    createConsumer(roomId: string, peerId: string, producerId: string, rtpCapabilities: any): Promise<Consumer | null>;
    resumeConsumer(roomId: string, peerId: string, consumerId: string): Promise<void>;
    closeProducer(roomId: string, peerId: string, producerId: string): void;
    getOtherProducers(roomId: string, excludePeerId: string): Array<{
        peerId: string;
        producerId: string;
        kind: string;
    }>;
    getStats(): {
        rooms: number;
        peers: number;
        workers: number;
    };
}
//# sourceMappingURL=room.service.d.ts.map