import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';
import type { RtpParameters } from 'mediasoup/node/lib/rtpParametersTypes';
import { logger } from '../utils/logger';
import { RecordingService } from '../services/recording.service';

/**
 * ProducerHandler manages media producers (outgoing streams from clients).
 * 
 * A producer represents a media track (audio/video/screen) that a participant is sending.
 */
export class ProducerHandler {
  constructor(private recordingService: RecordingService) {}

  /**
   * Create a producer on a transport
   */
  async createProducer(
    transport: WebRtcTransport,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters,
    participantId: string,
    roomId: string,
    userId: string,
    appData?: any
  ): Promise<Producer> {
    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { participantId, roomId, userId, ...appData },
    });

    logger.info(
      {
        producerId: producer.id,
        participantId,
        kind,
        type: appData?.type || 'camera',
      },
      'Producer created'
    );

    // Start recording hook (if enabled)
    await this.recordingService.startRecording(producer.id, {
      roomId,
      participantId,
      userId,
      kind: appData?.type === 'screen' ? 'screen' : kind,
    });

    // Handle producer events
    producer.on('transportclose', () => {
      logger.info({ producerId: producer.id }, 'Producer transport closed');
      producer.close();
    });

    producer.on('score', (score) => {
      logger.debug({ producerId: producer.id, score }, 'Producer score');
    });

    return producer;
  }

  /**
   * Pause a producer
   */
  async pauseProducer(producer: Producer): Promise<void> {
    await producer.pause();
    logger.info({ producerId: producer.id }, 'Producer paused');
  }

  /**
   * Resume a producer
   */
  async resumeProducer(producer: Producer): Promise<void> {
    await producer.resume();
    logger.info({ producerId: producer.id }, 'Producer resumed');
  }

  /**
   * Close a producer
   */
  async closeProducer(producer: Producer): Promise<void> {
    // Stop recording
    await this.recordingService.stopRecording(producer.id);

    producer.close();
    logger.info({ producerId: producer.id }, 'Producer closed');
  }

  /**
   * Get producer statistics
   */
  async getProducerStats(producer: Producer) {
    return await producer.getStats();
  }
}
