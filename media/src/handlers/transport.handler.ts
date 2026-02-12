import type { WebRtcTransport, DtlsParameters } from 'mediasoup/node/lib/WebRtcTransportTypes';
import type { Router } from 'mediasoup/node/lib/RouterTypes';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * TransportHandler manages WebRTC transport lifecycle.
 * 
 * WebRTC transports are bidirectional connections for sending/receiving media.
 * Each participant typically has 2 transports: one for sending, one for receiving.
 */
export class TransportHandler {
  /**
   * Create a WebRTC transport
   */
  async createTransport(
    router: Router,
    participantId: string,
    direction: 'send' | 'recv'
  ): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate:
        config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
    });

    // Set max incoming bitrate for receive transports
    if (direction === 'recv') {
      await transport.setMaxIncomingBitrate(
        config.mediasoup.webRtcTransport.maxIncomingBitrate
      );
    }

    logger.info(
      {
        transportId: transport.id,
        participantId,
        direction,
        iceParameters: transport.iceParameters,
      },
      'WebRTC transport created'
    );

    return transport;
  }

  /**
   * Connect a transport (after ICE/DTLS handshake on client)
   */
  async connectTransport(
    transport: WebRtcTransport,
    dtlsParameters: DtlsParameters
  ): Promise<void> {
    await transport.connect({ dtlsParameters });

    logger.info(
      {
        transportId: transport.id,
        iceState: transport.iceState,
        dtlsState: transport.dtlsState,
      },
      'Transport connected'
    );
  }

  /**
   * Get transport statistics
   */
  async getTransportStats(transport: WebRtcTransport) {
    return await transport.getStats();
  }

  /**
   * Close a transport
   */
  closeTransport(transport: WebRtcTransport): void {
    transport.close();
    logger.info({ transportId: transport.id }, 'Transport closed');
  }
}
