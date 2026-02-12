import type { WebRtcTransport, DtlsParameters } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
export declare class TransportHandler {
    createTransport(router: Router, participantId: string, direction: 'send' | 'recv'): Promise<WebRtcTransport>;
    connectTransport(transport: WebRtcTransport, dtlsParameters: DtlsParameters): Promise<void>;
    getTransportStats(transport: WebRtcTransport): Promise<import("mediasoup/node/lib/WebRtcTransportTypes").WebRtcTransportStat[]>;
    closeTransport(transport: WebRtcTransport): void;
}
//# sourceMappingURL=transport.handler.d.ts.map