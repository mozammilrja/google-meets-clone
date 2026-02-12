import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/room.service';
import { AuthService } from '../services/auth.service';
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
export declare class MediasoupGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly roomService;
    private readonly authService;
    server: Server;
    constructor(roomService: RoomService, authService: AuthService);
    handleConnection(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): Promise<void>;
    handleJoinRoom(socket: Socket, data: JoinRoomData): Promise<{
        success: boolean;
        rtpCapabilities?: any;
        existingProducers?: any[];
        error?: string;
    }>;
    handleGetRouterRtpCapabilities(socket: Socket, data: {
        roomId?: string;
    }): Promise<{
        success: boolean;
        rtpCapabilities?: any;
        error?: string;
    }>;
    handleCreateTransport(socket: Socket, data: CreateTransportData): Promise<{
        success: boolean;
        id?: string;
        iceParameters?: any;
        iceCandidates?: any;
        dtlsParameters?: any;
        error?: string;
    }>;
    handleConnectTransport(socket: Socket, data: ConnectTransportData): Promise<{
        success: boolean;
        error?: string;
    }>;
    handleProduce(socket: Socket, data: ProduceData): Promise<{
        success: boolean;
        producerId?: string;
        error?: string;
    }>;
    handleConsume(socket: Socket, data: ConsumeData): Promise<{
        success: boolean;
        id?: string;
        producerId?: string;
        kind?: string;
        rtpParameters?: any;
        error?: string;
    }>;
    handleResumeConsumer(socket: Socket, data: ResumeConsumerData): Promise<{
        success: boolean;
        error?: string;
    }>;
    handleCloseProducer(socket: Socket, data: CloseProducerData): Promise<{
        success: boolean;
        error?: string;
    }>;
    handleGetStats(): Promise<{
        success: boolean;
        stats?: any;
        error?: string;
    }>;
}
export {};
//# sourceMappingURL=mediasoup.gateway.d.ts.map