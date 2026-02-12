# Media SFU (Selective Forwarding Unit)

> SFU media architecture for scalable, low-latency video conferencing with simulcast and adaptive bitrate.

---

## Architecture Overview

```
┌───────────┐                    ┌────────────────────┐
│ Client A  │────► Upload ──────►│                    │
│(Simulcast)│                    │   Mediasoup SFU    │
└───────────┘                    │                    │
                                 │ ┌────────────────┐ │
┌───────────┐                    │ │ Router         │ │
│ Client B  │◄─── Download ──────│ │ ├─Producer A   │ │
└───────────┘                    │ │ ├─Producer B   │ │
                                 │ │ └─Consumer B   │ │
┌───────────┐                    │ └────────────────┘ │
│ Client C  │◄────► Bi-dir ──────│                    │
└───────────┘                    └────────────────────┘
                                           │
                                           ▼
                                 ┌────────────────────┐
                                 │  Recording Worker  │
                                 └────────────────────┘
```

**Why SFU over MCU or Mesh?**

| Aspect | SFU | MCU | Mesh |
|--------|-----|-----|------|
| Server CPU | Low | High | None |
| Client Bandwidth | Medium | Low | High |
| Latency | Low (~100ms) | High (~300ms) | Low |
| Scalability | High (100+) | Medium (50) | Low (5-10) |
| Adaptability | Per-client | Single mix | N/A |

---

## Mediasoup Implementation

### Server Setup

**Installation:**

```bash
npm install mediasoup@3 mediasoup-client@3
```

**Worker initialization:**

```typescript
// backend/src/media/mediasoup-server.ts
import * as mediasoup from 'mediasoup';
import { Worker, Router, WebRtcTransport } from 'mediasoup/node/lib/types';

const workers: Worker[] = [];
let nextWorkerIndex = 0;

export async function initializeMediasoup() {
  const numWorkers = os.cpus().length;
  
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: 40000,
      rtcMaxPort: 40000 + 1000 * i,
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp']
    });
    
    worker.on('died', () => {
      console.error('Worker died, exiting...');
      process.exit(1);
    });
    
    workers.push(worker);
  }
  
  console.log(`${numWorkers} Mediasoup workers initialized`);
}

export function getNextWorker(): Worker {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}
```

---

### Router Creation

**One router per meeting:**

```typescript
const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    }
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id': 2,
      'x-google-start-bitrate': 1000
    }
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1
    }
  }
];

export async function createRouter(worker: Worker): Promise<Router> {
  return await worker.createRouter({ mediaCodecs });
}
```

---

### Transport Creation

**WebRTC Transport for client connections:**

```typescript
export async function createWebRtcTransport(
  router: Router,
  isProducer: boolean
): Promise<WebRtcTransport> {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
      }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    maxIncomingBitrate: 1500000
  });

  return transport;
}
```

---

### Producer Creation (Client Upload)

**Client sends media to SFU:**

```typescript
// Client emits transport connection
socket.emit('transport:connect', {
  transportId: producerTransport.id,
  dtlsParameters
});

// Client creates producer
socket.emit('produce', {
  transportId: producerTransport.id,
  kind: 'video',
  rtpParameters,
  appData: { mediaTag: 'cam-video' }
}, (response) => {
  const { producerId } = response;
  console.log('Producer created:', producerId);
});
```

**Server-side producer creation:**

```typescript
socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
  const transport = transports.get(transportId);
  
  const producer = await transport.produce({
    kind,
    rtpParameters,
    appData
  });
  
  // Store producer
  producers.set(producer.id, producer);
  
  // Broadcast to other participants
  socket.to(meetingId).emit('new-producer', {
    producerId: producer.id,
    participantId: socket.data.participantId,
    kind
  });
  
  callback({ producerId: producer.id });
});
```

---

### Consumer Creation (Client Download)

**Client requests to consume remote stream:**

```typescript
socket.emit('consume', {
  producerId: remoteProducerId,
  rtpCapabilities: device.rtpCapabilities
}, async (response) => {
  if (response.error) return;
  
  const { id, producerId, kind, rtpParameters } = response;
  
  const consumer = await consumerTransport.consume({
    id,
    producerId,
    kind,
    rtpParameters
  });
  
  const track = consumer.track;
  remoteVideo.srcObject = new MediaStream([track]);
  
  socket.emit('consumer:resume', { consumerId: id });
});
```

**Server-side consumer creation:**

```typescript
socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
  const router = routers.get(meetingId);
  
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    return callback({ error: 'Cannot consume' });
  }
  
  const transport = consumerTransports.get(socket.data.participantId);
  
  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: true // Start paused, resume after client confirms
  });
  
  consumers.set(consumer.id, consumer);
  
  callback({
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters
  });
});

socket.on('consumer:resume', async ({ consumerId }) => {
  const consumer = consumers.get(consumerId);
  await consumer.resume();
});
```

---

## Simulcast Configuration

**Enable simulcast for adaptive quality:**

```typescript
// Client: Enable simulcast when producing
const producer = await producerTransport.produce({
  track: videoTrack,
  encodings: [
    { maxBitrate: 100000, scaleResolutionDownBy: 4 },  // Low: 180p
    { maxBitrate: 300000, scaleResolutionDownBy: 2 },  // Medium: 360p
    { maxBitrate: 900000, scaleResolutionDownBy: 1 }   // High: 720p
  ],
  codecOptions: {
    videoGoogleStartBitrate: 1000
  }
});
```

**Server selects layer based on network:**

```typescript
// Backend: Switch consumer to lower layer if bandwidth drops
consumer.setPreferredLayers({ spatialLayer: 1, temporalLayer: 2 });

// Monitor consumer stats
setInterval(async () => {
  const stats = await consumer.getStats();
  const bitrate = calculateBitrate(stats);
  
  if (bitrate < 200000) {
    // Switch to low quality
    await consumer.setPreferredLayers({ spatialLayer: 0 });
  }
}, 5000);
```

---

## Bandwidth Management

### Bandwidth Estimation

**Track consumer scores (0-10):**

```typescript
consumer.on('score', (score) => {
  console.log('Consumer score:', score);
  // score.score: 0-10 (10 = perfect)
  // score.producerScore: upstream quality
  // score.producerScores: per-layer scores
  
  if (score.score < 5) {
    // Degrade quality
    consumer.setPreferredLayers({ spatialLayer: 0 });
  }
});
```

---

### Congestion Control

**Server-side bandwidth allocation:**

```typescript
// Limit total outgoing bitrate per participant
const MAX_BITRATE_PER_PARTICIPANT = 2500000; // 2.5 Mbps

async function allocateBandwidth(participantId: string) {
  const consumers = getConsumersForParticipant(participantId);
  const perConsumerBitrate = Math.floor(
    MAX_BITRATE_PER_PARTICIPANT / consumers.length
  );
  
  for (const consumer of consumers) {
    if (consumer.kind === 'video') {
      const layer = selectLayerForBitrate(perConsumerBitrate);
      await consumer.setPreferredLayers(layer);
    }
  }
}
```

---

## Recording Pipeline

**Record meeting using FFmpeg:**

```typescript
import { FFmpeg } from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';

export async function startRecording(router: Router, meetingId: string) {
  // Create plain RTP transport for FFmpeg
  const transport = await router.createPlainTransport({
    listenIp: { ip: '127.0.0.1', announcedIp: null },
    rtcpMux: false,
    comedia: true
  });
  
  // Consume all producers
  const consumers = [];
  for (const producer of producers.values()) {
    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities: router.rtpCapabilities
    });
    consumers.push(consumer);
  }
  
  // Start FFmpeg process
  const ffmpegArgs = [
    '-protocol_whitelist', 'file,rtp,udp',
    '-i', `rtp://127.0.0.1:${transport.tuple.localPort}`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '1500k',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'mp4',
    `recordings/${meetingId}.mp4`
  ];
  
  const ffmpeg = spawn(FFmpeg.path, ffmpegArgs);
  
  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg: ${data}`);
  });
  
  return { transport, consumers, ffmpeg };
}
```

---

## Screen Sharing

**Separate producer for screen share:**

```typescript
// Client: Create screen share producer
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  }
});

const screenTrack = screenStream.getVideoTracks()[0];

const screenProducer = await producerTransport.produce({
  track: screenTrack,
  encodings: [
    { maxBitrate: 3000000, scaleResolutionDownBy: 1 }
  ],
  appData: { mediaTag: 'screen-video' }
});

// Handle screen share stop
screenTrack.onended = () => {
  screenProducer.close();
  socket.emit('screen-share:stop');
};
```

---

## Audio Mixing (Optional)

**For recording or PSTN integration:**

```typescript
import { PassThrough } from 'stream';
import Speaker from 'speaker';

export class AudioMixer {
  private streams: Map<string, PassThrough> = new Map();
  private speaker: Speaker;
  
  constructor() {
    this.speaker = new Speaker({
      channels: 2,
      bitDepth: 16,
      sampleRate: 48000
    });
  }
  
  addStream(participantId: string, stream: PassThrough) {
    this.streams.set(participantId, stream);
  }
  
  mix(): Buffer {
    const buffers = Array.from(this.streams.values())
      .map(s => s.read())
      .filter(Boolean);
    
    // Simple mixing: average samples
    const mixed = Buffer.alloc(buffers[0].length);
    for (let i = 0; i < mixed.length; i += 2) {
      let sum = 0;
      for (const buf of buffers) {
        sum += buf.readInt16LE(i);
      }
      mixed.writeInt16LE(Math.round(sum / buffers.length), i);
    }
    
    return mixed;
  }
}
```

---

## Deployment Strategies

### Single SFU Server

**Simple deployment for small scale:**

```yaml
# docker-compose.yml
services:
  sfu:
    image: node:18
    volumes:
      - ./backend:/app
    ports:
      - "3000:3000"
      - "40000-41000:40000-41000/udp"  # RTP ports
    environment:
      MEDIASOUP_ANNOUNCED_IP: "your-public-ip"
    command: npm run start:sfu
```

---

### Multiple SFU Instances

**Load balancing with Redis signaling:**

```
┌──────────┐        ┌──────────────┐
│  Client  │───────►│ Load Balancer│
└──────────┘        └──────────────┘
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
          ┌────────┐  ┌────────┐  ┌────────┐
          │ SFU 1  │  │ SFU 2  │  │ SFU 3  │
          └────────┘  └────────┘  └────────┘
               │           │           │
               └───────────┴───────────┘
                          │
                    ┌──────────┐
                    │  Redis   │
                    └──────────┘
```

**Sticky sessions required**: Same client must connect to same SFU instance.

---

### Geographic Distribution

**Edge locations for low latency:**

```
US East: sfu-us-east.exithostg.meet
US West: sfu-us-west.exithostg.meet
EU: sfu-eu.exithostg.meet
Asia: sfu-asia.exithostg.meet
```

**DNS-based routing** directs clients to nearest SFU.

---

## Performance Tuning

### OS Configuration

**Increase UDP buffer sizes:**

```bash
# /etc/sysctl.conf
net.core.rmem_max=26214400
net.core.rmem_default=26214400
net.core.wmem_max=26214400
net.core.wmem_default=26214400
```

---

### Mediasoup Settings

```typescript
const worker = await mediasoup.createWorker({
  logLevel: 'warn',
  rtcMinPort: 40000,
  rtcMaxPort: 49999,
  dtlsCertificateFile: './certs/dtls-cert.pem',
  dtlsPrivateKeyFile: './certs/dtls-key.pem'
});
```

---

## Monitoring

**Track SFU metrics:**

```typescript
setInterval(async () => {
  for (const worker of workers) {
    const usage = await worker.getResourceUsage();
    console.log('Worker usage:', {
      ru_maxrss: usage.ru_maxrss,  // Memory
      ru_utime: usage.ru_utime,    // CPU user time
      ru_stime: usage.ru_stime     // CPU system time
    });
  }
}, 10000);
```

---

## Troubleshooting

### Common Issues

**1. ICE Connection Failed:**
- Check TURN server configuration
- Verify announced IP is correct
- Ensure UDP ports are open

**2. High CPU Usage:**
- Reduce number of meetings per worker
- Lower video resolution/bitrate
- Disable simulcast if not needed

**3. Packet Loss:**
- Check network bandwidth
- Enable simulcast and adaptive layers
- Tune buffer sizes

---

## Complete Flow Summary

1. **Meeting Created**: Router created on available worker
2. **Client Joins**: WebRTC transports created (send/receive)
3. **Client Sends Media**: Producer created, stream forwarded
4. **Other Clients Consume**: Consumers created for each remote producer
5. **Adaptive Quality**: Simulcast layers switched based on network
6. **Client Leaves**: Producers/consumers closed, transports cleaned up
7. **Meeting Ends**: Router closed, resources released

---

## Code References

- Mediasoup docs: https://mediasoup.org/documentation/v3/
- Simulcast guide: https://webrtcglossary.com/simulcast/
- Example app: https://github.com/versatica/mediasoup-demo
