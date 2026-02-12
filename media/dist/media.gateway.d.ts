import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RouterManager } from './mediasoup/router-manager';
import { AuthService } from './services/auth.service';
import { TransportHandler } from './handlers/transport.handler';
import { ProducerHandler } from './handlers/producer.handler';
import { ConsumerHandler } from './handlers/consumer.handler';
export declare class MediaGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly routerManager;
    private readonly authService;
    private readonly transportHandler;
    private readonly producerHandler;
    private readonly consumerHandler;
    server: Server;
    constructor(routerManager: RouterManager, authService: AuthService, transportHandler: TransportHandler, producerHandler: ProducerHandler, consumerHandler: ConsumerHandler);
    handleConnection(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): Promise<void>;
    handleGetRouterRtpCapabilities(socket: Socket, data: any): Promise<{
        success: boolean;
        rtpCapabilities: import("mediasoup/node/lib/rtpParametersTypes").RtpCapabilities;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        rtpCapabilities?: undefined;
    }>;
    handleJoinRoom(socket: Socket, data: {
        roomId: string;
        participantId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    handleCreateTransport(socket: Socket, data: {
        roomId: string;
        participantId: string;
        direction: 'send' | 'recv';
    }): Promise<{
        success: boolean;
        transport: {
            id: string;
            iceParameters: import("mediasoup/node/lib/WebRtcTransportTypes").IceParameters;
            iceCandidates: import("mediasoup/node/lib/WebRtcTransportTypes").IceCandidate[];
            dtlsParameters: import("mediasoup/node/lib/WebRtcTransportTypes").DtlsParameters;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        transport?: undefined;
    }>;
    handleConnectTransport(socket: Socket, data: {
        transportId: string;
        dtlsParameters: any;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    handleProduce(socket: Socket, data: {
        transportId: string;
        kind: any;
        rtpParameters: any;
        appData?: any;
    }): Promise<{
        success: boolean;
        producerId: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        producerId?: undefined;
    }>;
    handleConsume(socket: Socket, data: {
        producerId: string;
        rtpCapabilities: any;
    }): Promise<{
        success: boolean;
        consumer: {
            id: string;
            producerId: string;
            kind: import("mediasoup/node/lib/rtpParametersTypes").MediaKind;
            rtpParameters: import("mediasoup/node/lib/rtpParametersTypes").RtpParameters;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        consumer?: undefined;
    }>;
    handleResumeConsumer(socket: Socket, data: {
        consumerId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    handleCloseProducer(socket: Socket, data: {
        producerId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
}
//# sourceMappingURL=media.gateway.d.ts.map