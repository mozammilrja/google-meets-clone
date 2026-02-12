import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Consumer } from 'mediasoup/node/lib/ConsumerTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
import type { RtpCapabilities } from 'mediasoup/node/lib/rtpParametersTypes';
import { logger } from '../utils/logger';

/**
 * ConsumerHandler manages media consumers (incoming streams to clients).
 * 
 * A consumer represents a media track that a participant is receiving from another participant.
 */
export class ConsumerHandler {
  /**
   * Create a consumer on a transport to receive media from a producer
   */
  async createConsumer(
    transport: WebRtcTransport,
    producer: Producer,
    rtpCapabilities: RtpCapabilities,
    participantId: string
  ): Promise<Consumer | null> {
    const router = transport.appData.router as Router;

    // Check if this participant can consume the producer
    if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
      logger.warn(
        {
          producerId: producer.id,
          participantId,
        },
        'Cannot consume producer - incompatible capabilities'
      );
      return null;
    }

    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: true, // Start paused, resume after client confirms
      appData: { participantId },
    });

    logger.info(
      {
        consumerId: consumer.id,
        producerId: producer.id,
        participantId,
        kind: consumer.kind,
      },
      'Consumer created'
    );

    // Handle consumer events
    consumer.on('transportclose', () => {
      logger.info({ consumerId: consumer.id }, 'Consumer transport closed');
      consumer.close();
    });

    consumer.on('producerclose', () => {
      logger.info(
        { consumerId: consumer.id, producerId: producer.id },
        'Consumer producer closed'
      );
      consumer.close();
    });

    consumer.on('producerpause', () => {
      logger.debug({ consumerId: consumer.id }, 'Consumer producer paused');
    });

    consumer.on('producerresume', () => {
      logger.debug({ consumerId: consumer.id }, 'Consumer producer resumed');
    });

    consumer.on('score', (score) => {
      logger.debug({ consumerId: consumer.id, score }, 'Consumer score');
    });

    return consumer;
  }

  /**
   * Resume a consumer (after client confirms readiness)
   */
  async resumeConsumer(consumer: Consumer): Promise<void> {
    await consumer.resume();
    logger.info({ consumerId: consumer.id }, 'Consumer resumed');
  }

  /**
   * Pause a consumer
   */
  async pauseConsumer(consumer: Consumer): Promise<void> {
    await consumer.pause();
    logger.info({ consumerId: consumer.id }, 'Consumer paused');
  }

  /**
   * Set preferred layers for simulcast/SVC
   */
  async setConsumerLayers(
    consumer: Consumer,
    spatialLayer: number,
    temporalLayer?: number
  ): Promise<void> {
    await consumer.setPreferredLayers({ spatialLayer, temporalLayer });
    logger.info(
      { consumerId: consumer.id, spatialLayer, temporalLayer },
      'Consumer preferred layers set'
    );
  }

  /**
   * Close a consumer
   */
  closeConsumer(consumer: Consumer): void {
    consumer.close();
    logger.info({ consumerId: consumer.id }, 'Consumer closed');
  }

  /**
   * Get consumer statistics
   */
  async getConsumerStats(consumer: Consumer) {
    return await consumer.getStats();
  }
}
