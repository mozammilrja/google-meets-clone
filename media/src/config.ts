import type { RtpCodecCapability } from 'mediasoup/node/lib/rtpParametersTypes';
import type { WorkerLogLevel, WorkerLogTag } from 'mediasoup/node/lib/WorkerTypes';
import * as os from 'os';

/**
 * Mediasoup configuration for SFU media server
 */
export const config = {
  // HTTP server
  http: {
    // Port 7000 is used because port 6000 is blocked by browsers (ERR_UNSAFE_PORT)
    port: parseInt(process.env.PORT || '7000', 10),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // JWT authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  },

  // Mediasoup workers
  mediasoup: {
    numWorkers: parseInt(process.env.MEDIASOUP_NUM_WORKERS || String(os.cpus().length), 10),
    worker: {
      rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT || '40000', 10),
      rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || '49999', 10),
      logLevel: (process.env.MEDIASOUP_WORKER_LOG_LEVEL || 'warn') as WorkerLogLevel,
      logTags: (process.env.MEDIASOUP_WORKER_LOG_TAGS?.split(',') || [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
      ]) as WorkerLogTag[],
    },

    // Router media codecs
    router: {
      mediaCodecs: [
        // Audio codecs
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        // Video codecs
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ] as RtpCodecCapability[],
    },

    // WebRTC transport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
        },
      ],
      initialAvailableOutgoingBitrate: 1000000, // 1 Mbps
      minimumAvailableOutgoingBitrate: 600000,  // 600 Kbps
      maxSctpMessageSize: 262144, // 256 KB
      maxIncomingBitrate: 1500000, // 1.5 Mbps
    },
  },

  // Recording configuration
  recording: {
    enabled: process.env.RECORDING_ENABLED === 'true',
    path: process.env.RECORDING_PATH || '/tmp/recordings',
  },
};
