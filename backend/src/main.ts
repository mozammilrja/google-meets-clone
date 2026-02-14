import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GracefulShutdownService } from './common/graceful-shutdown.service';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { 
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Get graceful shutdown service reference
  const shutdownService = app.get(GracefulShutdownService);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`Backend server listening on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Redis signaling: ${process.env.ENABLE_REDIS_SIGNALING === 'true' ? 'enabled' : 'disabled'}`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start backend server', error);
  process.exit(1);
});
