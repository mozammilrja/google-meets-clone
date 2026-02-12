import type { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Consumer } from 'mediasoup/node/lib/ConsumerTypes';
import type { Producer } from 'mediasoup/node/lib/ProducerTypes';
import type { RtpCapabilities } from 'mediasoup/node/lib/rtpParametersTypes';
export declare class ConsumerHandler {
    createConsumer(transport: WebRtcTransport, producer: Producer, rtpCapabilities: RtpCapabilities, participantId: string): Promise<Consumer | null>;
    resumeConsumer(consumer: Consumer): Promise<void>;
    pauseConsumer(consumer: Consumer): Promise<void>;
    setConsumerLayers(consumer: Consumer, spatialLayer: number, temporalLayer?: number): Promise<void>;
    closeConsumer(consumer: Consumer): void;
    getConsumerStats(consumer: Consumer): Promise<(import("mediasoup/node/lib/rtpStreamStatsTypes").RtpStreamRecvStats | import("mediasoup/node/lib/rtpStreamStatsTypes").RtpStreamSendStats)[]>;
}
//# sourceMappingURL=consumer.handler.d.ts.map