import * as mediasoup from 'mediasoup';
import type { Worker } from 'mediasoup/node/lib/WorkerTypes';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * WorkerManager handles the creation and management of Mediasoup workers.
 * 
 * Workers are separate Node.js processes that handle the actual media processing.
 * Multiple workers are used for load balancing across CPU cores.
 */
export class WorkerManager {
  private workers: Worker[] = [];
  private nextWorkerIdx = 0;

  /**
   * Create all Mediasoup workers based on configuration
   */
  async createWorkers(): Promise<void> {
    const { numWorkers, worker: workerSettings } = config.mediasoup;

    logger.info(`Creating ${numWorkers} Mediasoup workers...`);

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: workerSettings.logLevel,
        logTags: workerSettings.logTags,
        rtcMinPort: workerSettings.rtcMinPort,
        rtcMaxPort: workerSettings.rtcMaxPort,
      });

      worker.on('died', (error) => {
        logger.error(
          { workerId: i, error },
          'Mediasoup worker died, exiting in 2s...'
        );
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      logger.info(
        { workerId: i, pid: worker.pid },
        `Mediasoup worker created`
      );
    }

    logger.info('All Mediasoup workers created successfully');
  }

  /**
   * Get the next available worker using round-robin strategy
   */
  getNextWorker(): Worker {
    const worker = this.workers[this.nextWorkerIdx];

    if (++this.nextWorkerIdx === this.workers.length) {
      this.nextWorkerIdx = 0;
    }

    return worker;
  }

  /**
   * Get all workers
   */
  getWorkers(): Worker[] {
    return this.workers;
  }

  /**
   * Close all workers gracefully
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all Mediasoup workers...');
    
    for (const worker of this.workers) {
      worker.close();
    }

    this.workers = [];
    logger.info('All Mediasoup workers closed');
  }
}
