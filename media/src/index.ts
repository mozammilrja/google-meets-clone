import dotenv from 'dotenv';

// Load environment variables BEFORE importing modules that use config
dotenv.config();

import { MediaServer } from './server';
import { logger } from './utils/logger';
import { config } from './config';

/**
 * Main entry point for the Mediasoup SFU media server
 */
async function main() {
  try {
    // Log configuration for debugging
    logger.info({ 
      port: config.http.port,
      jwtSecretConfigured: !!config.jwt.secret && config.jwt.secret !== 'your-secret-key',
      jwtSecretLength: config.jwt.secret?.length
    }, 'Starting ExitMeet Media Server with config...');

    const server = new MediaServer();
    await server.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start media server');
    process.exit(1);
  }
}

main();
