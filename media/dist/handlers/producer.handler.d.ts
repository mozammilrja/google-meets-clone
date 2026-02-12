import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';
import type { RtpParameters } from 'mediasoup/node/lib/rtpParametersTypes';
import { RecordingService } from '../services/recording.service';
export declare class ProducerHandler {
    private recordingService;
    constructor(recordingService: RecordingService);
    createProducer(transport: WebRtcTransport, kind: 'audio' | 'video', rtpParameters: RtpParameters, participantId: string, roomId: string, userId: string, appData?: any): Promise<Producer>;
    pauseProducer(producer: Producer): Promise<void>;
    resumeProducer(producer: Producer): Promise<void>;
    closeProducer(producer: Producer): Promise<void>;
    getProducerStats(producer: Producer): Promise<import("mediasoup/node/lib/rtpStreamStatsTypes").RtpStreamRecvStats[]>;
}
//# sourceMappingURL=producer.handler.d.ts.map