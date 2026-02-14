import { OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { Server } from 'socket.io';
export declare class GracefulShutdownService implements OnModuleDestroy, OnApplicationShutdown {
    private readonly logger;
    private socketServer?;
    private isShuttingDown;
    private readonly shutdownTimeout;
    setSocketServer(server: Server): void;
    onModuleDestroy(): Promise<void>;
    onApplicationShutdown(signal?: string): Promise<void>;
    private performGracefulShutdown;
    private closeSocketServer;
    isShutdownInProgress(): boolean;
}
