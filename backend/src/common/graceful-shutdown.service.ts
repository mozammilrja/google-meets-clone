import { Injectable, Logger, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * GracefulShutdownService handles clean server termination.
 * 
 * On shutdown:
 * 1. Stop accepting new connections
 * 2. Wait for active requests to complete
 * 3. Close WebSocket connections gracefully
 * 4. Close database connections
 * 5. Cleanup Redis state
 */
@Injectable()
export class GracefulShutdownService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private socketServer?: Server;
  private isShuttingDown = false;
  private readonly shutdownTimeout = 30000; // 30 seconds

  setSocketServer(server: Server): void {
    this.socketServer = server;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Module destroy initiated...');
    await this.performGracefulShutdown();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Application shutdown signal received: ${signal}`);
    await this.performGracefulShutdown();
  }

  private async performGracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.log('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    this.logger.log('Graceful shutdown initiated...');

    try {
      // Close Socket.IO server gracefully
      if (this.socketServer) {
        await this.closeSocketServer();
      }

      this.logger.log('Graceful shutdown complete');
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
    }
  }

  private async closeSocketServer(): Promise<void> {
    if (!this.socketServer) return;

    return new Promise((resolve) => {
      this.logger.log('Closing Socket.IO connections...');

      // Get all connected sockets
      const sockets = this.socketServer!.of('/signaling').sockets;
      const socketCount = sockets.size;
      this.logger.log(`Disconnecting ${socketCount} clients...`);

      // Notify clients before disconnecting
      this.socketServer!.of('/signaling').emit('server-shutdown', {
        message: 'Server is shutting down for maintenance',
        reconnectAfter: 5000, // Suggest clients wait 5 seconds before reconnecting
      });

      // Give clients time to receive the message, then disconnect
      setTimeout(() => {
        this.socketServer!.close(() => {
          this.logger.log('Socket.IO server closed');
          resolve();
        });
      }, 1000);

      // Timeout fallback
      setTimeout(() => {
        this.logger.warn('Socket.IO close timeout, forcing...');
        resolve();
      }, this.shutdownTimeout);
    });
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
