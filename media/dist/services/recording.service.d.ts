export interface RecordingMetadata {
    roomId: string;
    participantId: string;
    userId: string;
    kind: 'audio' | 'video' | 'screen';
    startedAt: Date;
    stoppedAt?: Date;
    filePath?: string;
}
export declare class RecordingService {
    private activeRecordings;
    startRecording(producerId: string, metadata: Omit<RecordingMetadata, 'startedAt' | 'stoppedAt' | 'filePath'>): Promise<void>;
    stopRecording(producerId: string): Promise<RecordingMetadata | null>;
    getActiveRecordings(roomId: string): RecordingMetadata[];
    stopRoomRecordings(roomId: string): Promise<void>;
    ensureRecordingDirectory(): Promise<void>;
}
//# sourceMappingURL=recording.service.d.ts.map