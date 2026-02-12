import 'reflect-metadata';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing modules that use config
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    logger.info({ 
      port: 7000,
      jwtSecretConfigured: !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key',
    }, 'Starting ExitMeet Media Server...');

    const app = await NestFactory.create(AppModule);
    
    // Enable CORS
    app.enableCors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    });

    // Use standard Socket.IO adapter
    app.useWebSocketAdapter(new IoAdapter(app));

    await app.listen(7000);
    
    logger.info({ port: 7000 }, 'Media server listening');
  } catch (error) {
    logger.error({ error }, 'Failed to start media server');
    process.exit(1);
  }
}

bootstrap();
