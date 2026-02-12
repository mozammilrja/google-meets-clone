import type { RtpCodecCapability } from 'mediasoup/node/lib/rtpParametersTypes';
import type { WorkerLogLevel, WorkerLogTag } from 'mediasoup/node/lib/WorkerTypes';
export declare const config: {
    http: {
        port: number;
        corsOrigins: string[];
    };
    jwt: {
        secret: string;
    };
    mediasoup: {
        numWorkers: number;
        worker: {
            rtcMinPort: number;
            rtcMaxPort: number;
            logLevel: WorkerLogLevel;
            logTags: WorkerLogTag[];
        };
        router: {
            mediaCodecs: RtpCodecCapability[];
        };
        webRtcTransport: {
            listenIps: {
                ip: string;
                announcedIp: string | undefined;
            }[];
            initialAvailableOutgoingBitrate: number;
            minimumAvailableOutgoingBitrate: number;
            maxSctpMessageSize: number;
            maxIncomingBitrate: number;
        };
    };
    recording: {
        enabled: boolean;
        path: string;
    };
};
//# sourceMappingURL=config.d.ts.map