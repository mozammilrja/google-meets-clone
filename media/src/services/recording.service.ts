import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  roomId: string;
  participantId: string;
  userId: string;
  kind: 'audio' | 'video' | 'screen';
  startedAt: Date;
  stoppedAt?: Date;
  filePath?: string;
}

/**
 * RecordingService provides hooks for recording media streams.
 * 
 * Current implementation: Placeholder hooks for future storage integration.
 * Future: Connect to FFmpeg for transcoding, S3/MinIO for storage.
 */
export class RecordingService {
  private activeRecordings = new Map<string, RecordingMetadata>();

  /**
   * Start recording for a producer
   */
  async startRecording(
    producerId: string,
    metadata: Omit<RecordingMetadata, 'startedAt' | 'stoppedAt' | 'filePath'>
  ): Promise<void> {
    if (!config.recording.enabled) {
      logger.debug('Recording is disabled, skipping');
      return;
    }

    const recording: RecordingMetadata = {
      ...metadata,
      startedAt: new Date(),
    };

    this.activeRecordings.set(producerId, recording);

    logger.info(
      {
        producerId,
        roomId: metadata.roomId,
        participantId: metadata.participantId,
        kind: metadata.kind,
      },
      'Recording started (hook)'
    );

    // TODO: Implement actual recording pipeline
    // 1. Create PlainTransport for recording
    // 2. Pipe producer to PlainTransport
    // 3. Launch FFmpeg to consume RTP stream
    // 4. Save to configured storage (local/S3/MinIO)
  }

  /**
   * Stop recording for a producer
   */
  async stopRecording(producerId: string): Promise<RecordingMetadata | null> {
    const recording = this.activeRecordings.get(producerId);

    if (!recording) {
      return null;
    }

    recording.stoppedAt = new Date();
    this.activeRecordings.delete(producerId);

    logger.info(
      {
        producerId,
        roomId: recording.roomId,
        duration: recording.stoppedAt.getTime() - recording.startedAt.getTime(),
      },
      'Recording stopped (hook)'
    );

    // TODO: Finalize recording file
    // 1. Stop FFmpeg process
    // 2. Close PlainTransport
    // 3. Upload to storage
    // 4. Update database with recording metadata

    return recording;
  }

  /**
   * Get active recordings for a room
   */
  getActiveRecordings(roomId: string): RecordingMetadata[] {
    return Array.from(this.activeRecordings.values()).filter(
      (r) => r.roomId === roomId
    );
  }

  /**
   * Stop all recordings for a room
   */
  async stopRoomRecordings(roomId: string): Promise<void> {
    const producerIds = Array.from(this.activeRecordings.entries())
      .filter(([_, recording]) => recording.roomId === roomId)
      .map(([producerId]) => producerId);

    for (const producerId of producerIds) {
      await this.stopRecording(producerId);
    }

    logger.info({ roomId, count: producerIds.length }, 'Stopped all room recordings');
  }

  /**
   * Ensure recording directory exists
   */
  async ensureRecordingDirectory(): Promise<void> {
    if (!config.recording.enabled) {
      return;
    }

    try {
      await fs.mkdir(config.recording.path, { recursive: true });
      logger.info({ path: config.recording.path }, 'Recording directory ready');
    } catch (error) {
      logger.error({ error }, 'Failed to create recording directory');
    }
  }
}
