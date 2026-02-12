import type { Router } from 'mediasoup/node/lib/RouterTypes';
import { WorkerManager } from './worker-manager';
export interface Room {
    id: string;
    router: Router;
    participants: Map<string, Participant>;
    createdAt: Date;
}
export interface Participant {
    id: string;
    userId: string;
    socketId: string;
    transports: Map<string, any>;
    producers: Map<string, any>;
    consumers: Map<string, any>;
    joinedAt: Date;
}
export declare class RouterManager {
    private workerManager;
    private rooms;
    constructor(workerManager: WorkerManager);
    getOrCreateRoom(roomId: string): Promise<Room>;
    getRoom(roomId: string): Room | undefined;
    closeRoom(roomId: string): Promise<void>;
    addParticipant(roomId: string, participant: Participant): void;
    removeParticipant(roomId: string, participantId: string): void;
    getParticipant(roomId: string, participantId: string): Participant | undefined;
    getRooms(): Room[];
    getRoomStats(): {
        totalRooms: number;
        rooms: {
            id: string;
            participantCount: number;
            createdAt: Date;
        }[];
    };
}
//# sourceMappingURL=router-manager.d.ts.map