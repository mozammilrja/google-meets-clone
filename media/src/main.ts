import 'reflect-metadata';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing modules that use config
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { RoomService } from './services/room.service';
import { logger } from './utils/logger';
import { config } from './config';

let isShuttingDown = false;

async function bootstrap() {
  try {
    logger.info({ 
      port: config.http.port,
      instanceId: config.instance.id,
      region: config.instance.region,
      workers: config.mediasoup.numWorkers,
      jwtSecretConfigured: !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key',
      turnServersCount: config.iceServers.filter(s => s.urls.toString().includes('turn')).length,
    }, 'Starting MeetClone Media Server...');

    const app = await NestFactory.create(AppModule);
    
    // Enable CORS
    app.enableCors({
      origin: config.http.corsOrigins,
      credentials: true,
    });

    // Use standard Socket.IO adapter
    app.useWebSocketAdapter(new IoAdapter(app));

    // Enable shutdown hooks
    app.enableShutdownHooks();

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      if (isShuttingDown) {
        logger.warn('Shutdown already in progress...');
        return;
      }
      isShuttingDown = true;

      logger.info({ signal }, 'Graceful shutdown initiated...');

      try {
        // Get RoomService to close all rooms
        const roomService = app.get(RoomService);
        await roomService.closeAllRooms();

        // Close the app
        await app.close();
        
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    await app.listen(config.http.port);
    
    logger.info({ 
      port: config.http.port,
      instanceId: config.instance.id,
    }, 'Media server listening');
  } catch (error) {
    logger.error({ error }, 'Failed to start media server');
    process.exit(1);
  }
}

bootstrap();
